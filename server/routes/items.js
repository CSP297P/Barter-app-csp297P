const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// Get all available items for the authenticated user
router.get('/user/available', auth, async (req, res) => {
  try {
    const items = await Item.find({ owner: req.user.userId, status: 'available' })
      .populate('owner', 'displayName photoKey');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user items' });
  }
});

// Get all items
router.get('/', async (req, res) => {
  try {
    const randomItems = await Item.aggregate([
      { $sample: { size: 100 } } // adjust size as needed for max items to return
    ]);
    // Populate owner for each item (need to re-query for population)
    const populatedItems = await Item.populate(randomItems, { path: 'owner', select: 'displayName photoKey' });
    res.json(populatedItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items' });
  }
});

// Get item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('owner', 'displayName photoKey');
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
    console.log('Received update request with data:', req.body);
    console.log('Item ID:', req.params.id);
    
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      console.log('Item not found with ID:', req.params.id);
      return res.status(404).json({ 
        success: false,
        message: 'Item not found' 
      });
    }

    // Check if user is the owner
    if (item.owner.toString() !== req.user.userId) {
      console.log('Unauthorized update attempt. User:', req.user.userId, 'Owner:', item.owner.toString());
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this item' 
      });
    }

    const { title, description, category, type, condition, priceRange, imageUrls, status } = req.body;
    
    // Validate required fields
    if (!title || !description || !category || !condition || !type || !priceRange || !imageUrls || imageUrls.length === 0) {
      console.log('Missing required fields:', { title, description, category, condition, type, priceRange, imageUrls });
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    // Validate status value if provided
    if (status && !['available', 'pending', 'traded'].includes(status)) {
      console.log('Invalid status value:', status);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status value' 
      });
    }

    // Update the item
    item.title = title;
    item.description = description;
    item.category = category;
    item.type = type;
    item.condition = condition;
    item.priceRange = priceRange;
    item.imageUrls = imageUrls;
    if (status) item.status = status;

    // Save the updated item
    const updatedItem = await item.save();
    console.log('Item updated successfully:', updatedItem);

    // Populate owner field
    await updatedItem.populate('owner', 'displayName photoKey');
    
    // Send response with the updated item
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating item',
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