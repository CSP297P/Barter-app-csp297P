const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    let user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.averageRating = user.ratings && user.ratings.length > 0
      ? user.ratings.reduce((a, b) => a + b.value, 0) / user.ratings.length
      : 0;
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update user profile
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is updating their own profile
    if (req.params.id !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { displayName, ratings } = req.body;
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (ratings) updateData.ratings = ratings;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Get public user profile with stats and postings
router.get('/:id/public', async (req, res) => {
  try {
    let user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Get all items posted by the user
    const Item = require('../models/Item');
    const items = await Item.find({ owner: user._id });
    user.averageRating = user.ratings && user.ratings.length > 0
      ? user.ratings.reduce((a, b) => a + b.value, 0) / user.ratings.length
      : 0;
    res.json({
      _id: user._id,
      displayName: user.displayName,
      averageRating: user.averageRating,
      ratings: user.ratings,
      totalSuccessfulTrades: user.totalSuccessfulTrades || 0,
      totalListedItems: user.totalListedItems || items.length,
      postings: items
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public user profile' });
  }
});

// POST /users/:id/rate - Add or update a rating to a user
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { rating } = req.body;
    const raterId = req.user.userId;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    if (req.params.id === raterId) {
      return res.status(400).json({ message: 'You cannot rate yourself.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Check if this rater has already rated
    const existing = user.ratings.find(r => r.rater.toString() === raterId);
    if (existing) {
      existing.value = rating; // update rating
      user.markModified('ratings'); // ensure Mongoose saves the change
    } else {
      user.ratings.push({ rater: raterId, value: rating });
    }
    // Calculate and store the average rating as a static field
    user.averageRating = user.ratings && user.ratings.length > 0
      ? user.ratings.reduce((a, b) => a + b.value, 0) / user.ratings.length
      : 0;
    user.rating = user.averageRating; // keep static rating field in sync
    await user.save();
    res.json({
      message: 'Rating submitted',
      averageRating: user.averageRating,
      totalRatings: user.ratings.length,
      ratings: user.ratings
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding rating' });
  }
});

module.exports = router; 