const mongoose = require('mongoose');

const tradeSessionSchema = new mongoose.Schema({
  tradeRequestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TradeRequest'
  },
  participants: {
    type: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    }],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Participants array cannot be empty'
    }
  },
  itemIds: {
    type: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Item'
    }],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'ItemIds array cannot be empty'
    }
  },
  offeredItemIds: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    }],
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'cancelled', 'ready_to_trade', 'completed', 'denied'],
    default: 'pending'
  },
  isChatActive: { 
    type: Boolean, 
    default: true 
  },
  approvals: {
    type: Map,
    of: Boolean,
    default: {}
  },
  confirmations: {
    type: Map,
    of: Boolean,
    default: {}
  }
}, { 
  timestamps: true 
});

// Index for faster queries
tradeSessionSchema.index({ participants: 1 });

module.exports = mongoose.model('TradeSession', tradeSessionSchema); 