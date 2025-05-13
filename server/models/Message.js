const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sessionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TradeSession', 
    required: true 
  },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    validate: {
      validator: async function(value) {
        if (!this.sessionId) return false;
        
        const TradeSession = mongoose.model('TradeSession');
        const session = await TradeSession.findById(this.sessionId);
        
        if (!session) return false;
        return session.participants.includes(value);
      },
      message: 'Sender must be a participant in the trade session'
    }
  },
  content: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return v.trim().length > 0;
      },
      message: 'Message content cannot be empty'
    }
  },
  read: {
    type: Boolean,
    default: false
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for faster queries
messageSchema.index({ sessionId: 1, timestamp: 1 });
messageSchema.index({ sessionId: 1, senderId: 1, read: 1 });

module.exports = mongoose.model('Message', messageSchema); 