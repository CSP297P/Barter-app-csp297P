const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  condition: {
    type: String,
    required: [true, 'Condition is required'],
    enum: {
      values: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
      message: 'Condition must be one of: New, Like New, Good, Fair, Poor'
    }
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  status: {
    type: String,
    enum: ['available', 'pending', 'traded'],
    default: 'available'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  interestedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

module.exports = mongoose.model('Item', itemSchema); 