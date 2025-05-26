const Message = require('../models/Message');
const TradeSession = require('../models/TradeSession');
const jwt = require('jsonwebtoken');

const initializeSocketService = (io) => {
  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join user-specific room for real-time trade session updates
    socket.join(`user_${socket.userId}`);

    // Join trade session room
    socket.on('join_trade_session', async ({ sessionId }) => {
      try {
        const session = await TradeSession.findById(sessionId).exec();
        if (!session) {
          socket.emit('error', { message: 'Trade session not found' });
          return;
        }

        const roomId = `trade_session_${sessionId}`;
        socket.join(roomId);
        socket.emit('joined_session', { sessionId });

        // Mark messages as read only when explicitly requested
        // Remove automatic marking of messages as read
      } catch (error) {
        console.error('Error joining trade session:', error);
        socket.emit('error', { message: 'Error joining trade session' });
      }
    });

    // Handle new messages
    socket.on('new_message', async ({ sessionId, content, senderId, isSystemMessage }) => {
      try {
        const session = await TradeSession.findById(sessionId).exec();
        if (!session) {
          socket.emit('error', { message: 'Trade session not found' });
          return;
        }

        // Check if session is rejected
        if (session.status === 'denied') {
          socket.emit('error', { message: 'Cannot send messages in a rejected trade session' });
          return;
        }

        // Validate sender is a participant
        if (!session.participants.some(p => p.toString() === senderId.toString())) {
          socket.emit('error', { message: 'Not authorized to send messages in this session' });
          return;
        }

        // Create and save message
        const message = await Message.create({
          sessionId,
          senderId,
          content: content.trim(),
          read: false,
          isSystemMessage: isSystemMessage || false
        });

        // Populate sender's displayName
        await message.populate('senderId', 'displayName');

        // Get the other participant for notification
        const otherParticipant = session.participants.find(p => p.toString() !== senderId.toString());

        // Create the message object to emit
        const messageToEmit = {
          ...message.toObject(),
          senderName: message.senderId.displayName
        };

        // Emit message to all participants in the room
        const roomId = `trade_session_${sessionId}`;
        io.to(roomId).emit('message_received', messageToEmit);

        // Only emit to the other participant's room if they're not already in the trade session room
        // AND if it's not a system message (system messages are already emitted to the trade session room)
        if (otherParticipant && !message.isSystemMessage) {
          const otherParticipantSocket = Array.from(io.sockets.sockets.values())
            .find(s => s.userId === otherParticipant.toString());
          
          if (!otherParticipantSocket || !otherParticipantSocket.rooms.has(roomId)) {
            io.to(`user_${otherParticipant}`).emit('message_received', messageToEmit);
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // Clean up if needed
    });

    // Broadcast trade approved (already handled in route, but keep for clarity)
    // socket.on('approve_trade', async ({ sessionId, userId }) => {
    //   io.to(`trade_session_${sessionId}`).emit('trade_approved', { sessionId, userId });
    // });

    // Broadcast trade completed (already handled in route, but keep for clarity)
    // socket.on('confirm_trade', async ({ sessionId }) => {
    //   io.to(`trade_session_${sessionId}`).emit('trade_completed', { sessionId });
    // });
  });

  return io;
};

module.exports = initializeSocketService; 