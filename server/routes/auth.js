const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const VerificationService = require('../services/verificationService');

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Debug logs
    console.log('Received email:', email);
    console.log('Email type:', typeof email);
    console.log('Email length:', email.length);

    // Validate UCI email - case insensitive check
    const uciEmailRegex = /^[a-zA-Z0-9._%+-]+@uci\.edu$/i;
    const isValidEmail = uciEmailRegex.test(email);
    console.log('Is valid email:', isValidEmail);
    
    if (!isValidEmail) {
      return res.status(400).json({ 
        message: 'Please use a valid UCI email address',
        debug: {
          email,
          isValidEmail,
          regex: uciEmailRegex.toString()
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with isVerified: false
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName,
      isVerified: false
    });

    await user.save();

    // Send verification code
    await VerificationService.generateCode(email.toLowerCase(), 'login');

    res.status(201).json({
      message: 'Verification code sent to your email. Please verify to complete signup.',
      email: user.email
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating account. Please try again.' });
  }
});

// Email verification route
router.post('/verify-signup', async (req, res) => {
  try {
    const { email, code } = req.body;
    // Verify the code
    const isValid = await VerificationService.verifyCode(email.toLowerCase(), code, 'login');
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    // Set isVerified to true
    user.isVerified = true;
    await user.save();
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Error verifying code' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    // Check if verified
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Step 1: Initial login - validate credentials and send verification code
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate and send verification code
    await VerificationService.generateCode(email, 'login');

    res.json({
      message: 'Verification code sent to your email',
      email
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login process' });
  }
});

// Step 2: Verify code and complete login
router.post('/verify-login', async (req, res) => {
  try {
    const { email, code } = req.body;

    // Verify the code
    const isValid = await VerificationService.verifyCode(email, code, 'login');
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Error verifying code' });
  }
});

// Password reset request
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If your email is registered, you will receive a password reset code' });
    }

    // Generate and send reset code
    await VerificationService.generateCode(email, 'password-reset');

    res.json({ message: 'If your email is registered, you will receive a password reset code' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// Reset password with verification code
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Verify the code
    const isValid = await VerificationService.verifyCode(email, code, 'password-reset');
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Resend verification code endpoint
router.post('/resend-verification-code', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' });
    }
    await VerificationService.generateCode(email.toLowerCase(), 'login');
    res.json({ message: 'Verification code resent to your email.' });
  } catch (error) {
    console.error('Resend verification code error:', error);
    res.status(500).json({ message: 'Error resending verification code' });
  }
});

module.exports = router; 