const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const TradeSession = require('../models/TradeSession');
const auth = require('../middleware/auth');

// Middleware to check if user is a participant in the trade session
const isParticipant = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId || req.body.sessionId;
    const session = await TradeSession.findById(sessionId);
    
    // For GET requests, return empty array if session doesn't exist
    if (!session && req.method === 'GET') {
      return res.json([]);
    }
    
    // For other requests, return 404
    if (!session) {
      return res.status(404).json({ message: 'Trade session not found' });
    }

    if (!session.participants.includes(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to access this trade session' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new message
router.post('/', auth, isParticipant, async (req, res) => {
  try {
    const { sessionId, content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }

    const message = new Message({
      sessionId,
      senderId: req.user.userId,
      content: content.trim()
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a system message
router.post('/system', auth, isParticipant, async (req, res) => {
  try {
    const { sessionId, content, senderId, recipientId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }

    const message = new Message({
      sessionId,
      senderId,
      content: content.trim(),
      isSystemMessage: true,
      read: false,
      recipientId
    });

    await message.save();
    
    // Emit the system message to all participants
    const io = req.app.get('io');
    if (io) {
      // Emit to the specific recipient's room for notification
      io.to(`user_${recipientId}`).emit('message_received', {
        ...message.toObject(),
        isSystemMessage: true
      });
      
      // Also emit to the trade session room for chat display
      io.to(`trade_session_${sessionId}`).emit('message_received', {
        ...message.toObject(),
        isSystemMessage: true
      });
    }
    
    res.status(201).json(message);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a trade session
router.get('/session/:sessionId', auth, isParticipant, async (req, res) => {
  try {
    const messages = await Message.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: 1 })
      .lean();

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count for the current user
router.get('/unread/count', auth, async (req, res) => {
  try {
    // Get all trade sessions where the user is a participant
    const sessions = await TradeSession.find({
      participants: req.user.userId
    });

    // Get count of unread messages
    const count = await Message.countDocuments({
      sessionId: { $in: sessions.map(s => s._id) },
      senderId: { $ne: req.user.userId },
      read: { $ne: true }
    });

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
});

// Get unread message counts for all conversations
router.get('/unread-counts', auth, async (req, res) => {
  try {
    // Get all trade sessions for the user
    const sessions = await TradeSession.find({
      participants: req.user.userId
    });

    // Get unread message counts for each session
    const unreadCounts = {};
    for (const session of sessions) {
      // Only count messages from other participants
      const otherParticipants = session.participants.filter(p => p.toString() !== req.user.userId);
      const count = await Message.countDocuments({
        sessionId: session._id,
        senderId: { $in: otherParticipants },
        read: false
      });
      if (count > 0) {
        unreadCounts[session._id] = count;
      }
    }

    res.json(unreadCounts);
  } catch (error) {
    console.error('Error fetching unread counts:', error);
    res.status(500).json({ message: 'Error fetching unread counts' });
  }
});

// Mark all messages in a session as read
router.post('/mark-read/:sessionId', auth, isParticipant, async (req, res) => {
  try {
    await Message.updateMany(
      {
        sessionId: req.params.sessionId,
        senderId: { $ne: req.user.userId },
        read: false
      },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Error marking messages as read' });
  }
});

module.exports = router; 