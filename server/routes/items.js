const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// Get all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().populate('owner', 'displayName');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items' });
  }
});

// Get item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('owner', 'displayName');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching item' });
  }
});

// Create new item
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);
    console.log('User:', req.user);

    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, description, category, condition } = req.body;
    
    if (!title || !description || !category || !condition) {
      console.error('Missing required fields:', { title, description, category, condition });
      return res.status(400).json({ message: 'All fields are required' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    const item = new Item({
      title,
      description,
      category,
      condition,
      imageUrl,
      owner: req.user.userId
    });

    console.log('Creating item:', item);

    const savedItem = await item.save();
    console.log('Item created successfully:', savedItem);
    
    res.status(201).json(savedItem);
  } catch (error) {
    console.error('Error creating item:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        details: error.message,
        errors: error.errors 
      });
    }
    res.status(500).json({ 
      message: 'Error creating item',
      error: error.message,
      stack: error.stack 
    });
  }
});

// Update item
router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user is the owner
    if (item.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: 'Error updating item' });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Get the user ID from the request body
    const { userId } = req.body;

    // Check if the user is the owner of the item
    if (item.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }

    // Delete the item
    await Item.findByIdAndDelete(req.params.id);
    
    // Delete the associated image file if it exists
    if (item.imageUrl) {
      const imagePath = path.join(__dirname, '..', 'uploads', path.basename(item.imageUrl));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ 
      message: 'Error deleting item',
      error: error.message
    });
  }
});

// Get user's items
router.get('/user/:userId', async (req, res) => {
  try {
    const items = await Item.find({ owner: req.params.userId })
      .populate('owner', 'displayName');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user items' });
  }
});

// Show interest in item
router.put('/:id/interest', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user is not the owner
    if (item.owner.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Cannot show interest in your own item' });
    }

    // Check if user already showed interest
    if (item.interestedUsers.includes(req.user.userId)) {
      return res.status(400).json({ message: 'Already showed interest in this item' });
    }

    item.interestedUsers.push(req.user.userId);
    await item.save();

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error showing interest' });
  }
});

module.exports = router; 