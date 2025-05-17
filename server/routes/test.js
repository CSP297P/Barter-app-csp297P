const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');

// Test email route
router.get('/send-test-email', async (req, res) => {
  try {
    const testEmail = 'yandinz@uci.edu';
    const verificationCode = '123456';
    
    const result = await emailService.sendVerificationEmail(testEmail, verificationCode);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

module.exports = router; 