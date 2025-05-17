const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['login', 'password-reset'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  used: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Create index for automatic deletion of expired codes
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema); 