const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
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

    const { displayName } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { displayName },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

module.exports = router; 