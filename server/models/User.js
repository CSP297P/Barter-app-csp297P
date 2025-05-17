const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return v.endsWith('@uci.edu');
      },
      message: 'Email must be a valid UCI email address'
    }
  },
  password: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isVerified: {
    type: Boolean,
    default: true // Existing users will be verified by default
  }
});

module.exports = mongoose.model('User', userSchema); 