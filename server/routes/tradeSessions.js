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
    .populate({
      path: 'itemIds',
      options: { limit: 1 }
    })
    .populate('offeredItemIds')
    .sort('-createdAt');

    // Transform the data to match the client's expectations
    const transformedSessions = sessions.map(session => ({
      ...session.toObject(),
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
      .populate({
        path: 'itemIds',
        options: { limit: 1 }
      })
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

    const session = new TradeSession({
      participants,
      itemIds: [itemId],
      offeredItemIds: offeredItemIds || [],
      status: 'pending'
    });

    await session.save();
    
    // Populate the session with user and item details
    await session.populate('participants', 'displayName');
    await session.populate({
      path: 'itemIds',
      options: { limit: 1 }
    });
    await session.populate('offeredItemIds');

    // Transform the data to match the client's expectations
    const transformedSession = {
      ...session.toObject(),
      item: session.itemIds[0], // Use the first item as the main item
      offeredItems: session.offeredItemIds
    };

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

    session.status = status;
    await session.save();

    // Populate and transform the session before sending
    await session.populate('participants', 'displayName');
    await session.populate({
      path: 'itemIds',
      options: { limit: 1 }
    });

    const transformedSession = {
      ...session.toObject(),
      item: session.itemIds[0] // Use the first item as the main item
    };

    res.json(transformedSession);
  } catch (error) {
    console.error('Error updating trade session:', error);
    res.status(500).json({ message: 'Error updating trade session' });
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

    res.json({ message: 'Trade session and messages deleted successfully' });
  } catch (error) {
    console.error('Error deleting trade session:', error);
    res.status(500).json({ message: 'Error deleting trade session' });
  }
});

module.exports = router; 