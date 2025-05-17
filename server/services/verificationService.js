const crypto = require('crypto');
const VerificationCode = require('../models/VerificationCode');
const emailService = require('./emailService');

class VerificationService {
  static async generateCode(email, type) {
    // Generate a 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    
    // Set expiration to 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    // Create verification code record
    const verificationCode = new VerificationCode({
      email,
      code,
      type,
      expiresAt
    });
    
    await verificationCode.save();
    
    // Send email with verification code
    if (type === 'login') {
      await emailService.sendVerificationEmail(email, code);
    } else if (type === 'password-reset') {
      await emailService.sendPasswordResetEmail(email, code);
    }
    
    return code;
  }
  
  static async verifyCode(email, code, type) {
    const verificationCode = await VerificationCode.findOne({
      email,
      code,
      type,
      used: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!verificationCode) {
      return false;
    }
    
    // Mark code as used
    verificationCode.used = true;
    await verificationCode.save();
    
    return true;
  }
}

module.exports = VerificationService; 