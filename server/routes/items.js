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
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, type, condition, priceRange, imageUrls } = req.body;

    if (!title || !description || !category || !condition || !type || !priceRange || !imageUrls || imageUrls.length === 0) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const itemData = {
      title,
      description,
      category,
      condition,
      type,
      priceRange,
      imageUrls,
      owner: req.user.userId
    };
    
    const item = new Item(itemData);
    const savedItem = await item.save();
    
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
      error: error.message
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
      return res.status(403).json({ message: 'Not authorized to update this item' });
    }

    const { status } = req.body;
    
    // Validate status value
    if (status && !['available', 'pending', 'traded'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('owner', 'displayName');

    console.log('Item status updated:', updatedItem);
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({ 
      message: 'Error updating item status',
      error: error.message 
    });
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
    if (item.imageUrls && item.imageUrls.length > 0) {
      for (const imageUrl of item.imageUrls) {
        const imagePath = path.join(__dirname, '..', 'uploads', path.basename(imageUrl));
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
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