const express = require('express');
const router = express.Router();
const TradeSession = require('../models/TradeSession');
const auth = require('../middleware/auth');
const Message = require('../models/Message');

// Get all trade sessions for the current user
router.get('/user', auth, async (req, res) => {
  try {
    const sessions = await TradeSession.find({
      participants: req.user.userId
    })
    .populate('participants', 'displayName')
    .populate('itemIds')
    .populate('offeredItemIds')
    .sort('-createdAt');

    // Transform the data to match the client's expectations
    const transformedSessions = sessions.map(session => ({
      ...session.toObject(),
      approvals: session.approvals ? Object.fromEntries(session.approvals.entries()) : {},
      confirmations: session.confirmations ? Object.fromEntries(session.confirmations.entries()) : {},
      item: session.itemIds[0], // Use the first item as the main item
      offeredItems: session.offeredItemIds
    }));

    res.json(transformedSessions);
  } catch (error) {
    console.error('Error fetching trade sessions:', error);
    res.status(500).json({ message: 'Error fetching trade sessions' });
  }
});

// Get a specific trade session
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await TradeSession.findById(req.params.id)
      .populate('participants', 'displayName')
      .populate('itemIds')
      .populate('offeredItemIds');

    if (!session) {
      return res.status(404).json({ message: 'Trade session not found' });
    }

    // Check if user is a participant
    if (!session.participants.some(p => p._id.toString() === req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to access this trade session' });
    }

    // Transform the data to match the client's expectations
    const transformedSession = {
      ...session.toObject(),
      approvals: session.approvals ? Object.fromEntries(session.approvals.entries()) : {},
      confirmations: session.confirmations ? Object.fromEntries(session.confirmations.entries()) : {},
      item: session.itemIds[0], // Use the first item as the main item
      offeredItems: session.offeredItemIds
    };

    res.json(transformedSession);
  } catch (error) {
    console.error('Error fetching trade session:', error);
    res.status(500).json({ message: 'Error fetching trade session' });
  }
});

// Create a new trade session
router.post('/', auth, async (req, res) => {
  try {
    const { itemId, participants, offeredItemIds } = req.body;
    console.log('Received trade session creation request:', {
      itemId,
      participants,
      offeredItemIds,
      currentUser: req.user.userId
    });

    if (!itemId || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    // Ensure the current user is included in participants
    if (!participants.some(p => p.toString() === req.user.userId.toString())) {
      console.log('User ID mismatch:', {
        participants,
        currentUser: req.user.userId,
        comparison: participants.map(p => ({
          participant: p.toString(),
          currentUser: req.user.userId.toString(),
          matches: p.toString() === req.user.userId.toString()
        }))
      });
      return res.status(400).json({ message: 'Current user must be a participant' });
    }

    // Prevent duplicate trade sessions
    const existingSession = await TradeSession.findOne({
      itemIds: itemId,
      participants: { $all: participants, $size: participants.length },
      offeredItemIds: { $all: offeredItemIds || [], $size: (offeredItemIds || []).length }
    });
    if (existingSession) {
      return res.status(409).json({ message: 'You have already made this trade request.' });
    }

    const session = new TradeSession({
      participants,
      itemIds: [itemId],
      offeredItemIds: offeredItemIds || [],
      status: 'pending'
    });

    await session.save();
    
    // Populate the session with user and item details
    await session.populate('participants', 'displayName');
    await session.populate('itemIds');
    await session.populate('offeredItemIds');

    // Transform the data to match the client's expectations
    const transformedSession = {
      ...session.toObject(),
      item: session.itemIds[0], // Use the first item as the main item
      offeredItems: session.offeredItemIds
    };

    // Emit new_trade_session event to both participants
    const io = req.app.get('io');
    session.participants.forEach(participant => {
      io.to(`user_${participant._id}`).emit('new_trade_session', {
        session: transformedSession
      });
    });

    res.status(201).json(transformedSession);
  } catch (error) {
    console.error('Error creating trade session:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Error creating trade session',
      error: error.message,
      name: error.name
    });
  }
});

// Update trade session status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const session = await TradeSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Trade session not found' });
    }

    // Check if user is a participant
    if (!session.participants.includes(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to update this trade session' });
    }

    // Validate status
    if (!['pending', 'active', 'denied', 'cancelled', 'ready_to_trade', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const prevStatus = session.status;
    session.status = status;
    await session.save();

    // Populate and transform the session before sending
    await session.populate('participants', 'displayName');
    await session.populate('itemIds');

    const transformedSession = {
      ...session.toObject(),
      item: session.itemIds[0] // Use the first item as the main item
    };

    // Emit trade_request_accepted if status changed from pending to active
    if (prevStatus === 'pending' && status === 'active') {
      const io = req.app.get('io');
      session.participants.forEach(participant => {
        io.to(`user_${participant._id}`).emit('trade_request_accepted', {
          session: transformedSession,
          acceptedBy: req.user.userId
        });
      });
    }

    // Emit real-time update to both participants
    const io = req.app.get('io');
    session.participants.forEach(participant => {
      io.to(`user_${participant._id}`).emit('trade_session_status_updated', {
        session: transformedSession
      });
    });

    res.json(transformedSession);
  } catch (error) {
    console.error('Error updating trade session:', error);
    res.status(500).json({ message: 'Error updating trade session' });
  }
});

// Update offered items for a trade session
router.put('/:id/offered-items', auth, async (req, res) => {
  try {
    const { offeredItemIds } = req.body;
    const session = await TradeSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Trade session not found' });
    }
    // Check if user is a participant (fix: compare as string)
    if (!session.participants.some(p => p.toString() === req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to update this trade session' });
    }
    // Update offeredItemIds
    session.offeredItemIds = offeredItemIds;
    await session.save();
    await session.populate('offeredItemIds');
    // Emit socket event to both participants
    const io = req.app.get('io');
    session.participants.forEach(participant => {
      io.to(`user_${participant._id}`).emit('trade_session_items_updated', {
        sessionId: session._id,
        offeredItems: session.offeredItemIds
      });
    });
    res.json({
      offeredItems: session.offeredItemIds // populated objects
    });
  } catch (error) {
    console.error('Error updating offered items:', error);
    res.status(500).json({ message: 'Error updating offered items' });
  }
});

// Update requested items for a trade session
router.put('/:id/requested-items', auth, async (req, res) => {
  try {
    const { itemIds } = req.body;
    const session = await TradeSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Trade session not found' });
    }
    // Check if user is a participant (fix: compare as string)
    if (!session.participants.some(p => p.toString() === req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to update this trade session' });
    }
    // Update itemIds
    session.itemIds = itemIds;
    await session.save();
    await session.populate('itemIds');
    // Emit socket event to both participants
    const io = req.app.get('io');
    session.participants.forEach(participant => {
      io.to(`user_${participant._id}`).emit('trade_session_items_updated', {
        sessionId: session._id,
        requestedItems: session.itemIds
      });
    });
    res.json({
      requestedItems: session.itemIds // populated objects
    });
  } catch (error) {
    console.error('Error updating requested items:', error);
    res.status(500).json({ message: 'Error updating requested items' });
  }
});

// Delete a trade session and its messages
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await TradeSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Trade session not found' });
    }

    // Check if user is a participant
    if (!session.participants.includes(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to delete this trade session' });
    }

    // Delete all messages associated with this session
    await Message.deleteMany({ sessionId: session._id });

    // Delete the trade session
    await session.deleteOne();

    // Emit trade_session_deleted event to both participants
    const io = req.app.get('io');
    session.participants.forEach(participant => {
      io.to(`user_${participant._id}`).emit('trade_session_deleted', {
        sessionId: session._id
      });
    });

    res.json({ message: 'Trade session and messages deleted successfully' });
  } catch (error) {
    console.error('Error deleting trade session:', error);
    res.status(500).json({ message: 'Error deleting trade session' });
  }
});

// Approve trade (user clicks approve)
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const session = await TradeSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Trade session not found' });
    if (!session.participants.some(p => p.toString() === req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    // Use Map.set for approvals
    session.approvals.set(req.user.userId, true);
    await session.save();
    // Debug log after saving
    console.log('After approval:', Array.from(session.approvals.entries()));
    // If both users have approved, complete the trade
    const allApproved = session.participants.every(p => session.approvals.get(p.toString()));
    if (allApproved) {
      session.status = 'completed';
      await session.save();
      req.app.get('io').to(`trade_session_${session._id}`).emit('trade_completed', {
        sessionId: session._id
      });
      // Emit trade_session_status_updated to both participants
      await session.populate('participants', 'displayName');
      await session.populate('itemIds');
      const transformedSession = {
        ...session.toObject(),
        item: session.itemIds[0]
      };
      session.participants.forEach(participant => {
        req.app.get('io').to(`user_${participant._id}`).emit('trade_session_status_updated', {
          session: transformedSession
        });
      });
    }
    // Emit to both users in the session room
    req.app.get('io').to(`trade_session_${session._id}`).emit('trade_approved', {
      sessionId: session._id,
      userId: req.user.userId
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error approving trade' });
  }
});

module.exports = router; 