const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const auth = require('../middleware/auth');

// Start a new chat or get existing chat
router.post('/', auth, async (req, res) => {
  try {
    const { itemId, recipientId, message } = req.body;
    const senderId = req.user.userId;

    // Check if chat already exists
    let chat = await Chat.findOne({
      item: itemId,
      $or: [
        { user1: senderId, user2: recipientId },
        { user1: recipientId, user2: senderId }
      ]
    });

    if (!chat) {
      // Create new chat
      chat = new Chat({
        item: itemId,
        user1: senderId,
        user2: recipientId,
        messages: [{
          sender: senderId,
          content: message
        }]
      });
    } else {
      // Add message to existing chat
      chat.messages.push({
        sender: senderId,
        content: message
      });
    }

    await chat.save();
    
    // Populate the chat with user and item details
    await chat.populate('user1 user2 item');
    
    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating/updating chat:', error);
    res.status(500).json({ message: 'Error creating chat' });
  }
});

// Get user's chats
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const chats = await Chat.find({
      $or: [{ user1: userId }, { user2: userId }]
    })
    .populate('user1 user2 item')
    .sort('-updatedAt');

    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: 'Error fetching chats' });
  }
});

// Get chat messages
router.get('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('user1 user2 item');
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is part of the chat
    if (chat.user1.toString() !== req.user.userId && 
        chat.user2.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ message: 'Error fetching chat' });
  }
});

// Send message in chat
router.post('/:chatId/messages', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is part of the chat
    if (chat.user1.toString() !== req.user.userId && 
        chat.user2.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    chat.messages.push({
      sender: req.user.userId,
      content: message
    });

    await chat.save();
    res.status(201).json(chat);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

module.exports = router; 