const { Server } = require('socket.io');
const { createServer } = require('http');
const { io: Client } = require('socket.io-client');
const mongoose = require('mongoose');
const Message = require('../../models/Message');
const TradeSession = require('../../models/TradeSession');
const TradeRequest = require('../../models/TradeRequest');
const initializeSocketService = require('../../services/socketService');

describe('Socket Service', () => {
  let httpServer;
  let io;
  let clientSocket;
  let testTradeSession;
  let testTradeRequest;
  let testUser1;
  let testUser2;

  beforeEach(async () => {
    // Create test data
    testUser1 = new mongoose.Types.ObjectId();
    testUser2 = new mongoose.Types.ObjectId();

    // Create test trade request
    testTradeRequest = await TradeRequest.create({
      requesterId: testUser1,
      ownerId: testUser2,
      targetItemId: new mongoose.Types.ObjectId(),
      offeredItemId: new mongoose.Types.ObjectId(),
      status: 'pending'
    });

    // Create test trade session
    testTradeSession = await TradeSession.create({
      tradeRequestId: testTradeRequest._id,
      participants: [testUser1, testUser2],
      itemIds: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
      status: 'active'
    });

    // Verify test data was created
    const session = await TradeSession.findById(testTradeSession._id).exec();
    if (!session) {
      throw new Error('Failed to create test trade session');
    }
    console.log('Test trade session created:', session._id.toString());

    // Create server and socket
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    initializeSocketService(io);

    // Start server and create client
    await new Promise((resolve) => {
      httpServer.listen(() => {
        const port = httpServer.address().port;
        console.log(`Test server listening on port ${port}`);

        // Create client
        clientSocket = new Client(`http://localhost:${port}`, {
          transports: ['websocket'],
          autoConnect: false
        });

        // Debug events
        clientSocket.on('connect', () => {
          console.log('Client connected');
          resolve();
        });

        clientSocket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          throw error;
        });

        clientSocket.on('error', (error) => {
          console.error('Socket error:', error);
        });

        // Connect client
        clientSocket.connect();
      });
    });
  });

  afterEach(async () => {
    return new Promise((resolve) => {
      if (clientSocket.connected) {
        console.log('Disconnecting client');
        clientSocket.disconnect();
      }
      io.close();
      httpServer.close(() => {
        console.log('Server closed');
        resolve();
      });
    });
  });

  it('should join a trade session room', (done) => {
    console.log('Starting join room test');
    
    clientSocket.on('joined_session', (data) => {
      console.log('Received joined_session event:', data);
      expect(data.sessionId.toString()).toBe(testTradeSession._id.toString());
      done();
    });

    clientSocket.on('error', (error) => {
      console.error('Error in join test:', error);
      done(error);
    });

    console.log('Emitting join_trade_session event with session ID:', testTradeSession._id.toString());
    clientSocket.emit('join_trade_session', { 
      sessionId: testTradeSession._id.toString() 
    });
  }, 15000);

  it('should handle new messages', (done) => {
    console.log('Starting new message test');
    const messageContent = 'Test message';

    // First join the room
    clientSocket.emit('join_trade_session', { 
      sessionId: testTradeSession._id.toString() 
    });

    clientSocket.on('joined_session', () => {
      console.log('Successfully joined room, sending message');
      // Then send the message
      clientSocket.emit('new_message', {
        sessionId: testTradeSession._id.toString(),
        content: messageContent,
        senderId: testUser1.toString()
      });
    });

    clientSocket.on('message_received', async (message) => {
      console.log('Received message:', message);
      try {
        expect(message.content).toBe(messageContent);
        expect(message.senderId.toString()).toBe(testUser1.toString());

        const savedMessage = await Message.findOne({
          sessionId: testTradeSession._id,
          content: messageContent
        }).exec();

        expect(savedMessage).toBeTruthy();
        expect(savedMessage.content).toBe(messageContent);
        expect(savedMessage.senderId.toString()).toBe(testUser1.toString());
        done();
      } catch (error) {
        done(error);
      }
    });

    clientSocket.on('error', (error) => {
      console.error('Error in message test:', error);
      done(error);
    });
  }, 15000);
}); 