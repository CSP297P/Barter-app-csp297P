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
  totalSuccessfulTrades: {
    type: Number,
    default: 0
  },
  totalListedItems: {
    type: Number,
    default: 0
  },
  ratings: [{
    rater: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    value: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    }
  }],
  rating: {
    type: Number,
    default: 0
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

// Virtual for average rating
userSchema.virtual('averageRating').get(function() {
  if (!this.ratings || this.ratings.length === 0) return 0;
  return this.ratings.reduce((a, b) => a + b.value, 0) / this.ratings.length;
});

module.exports = mongoose.model('User', userSchema); 