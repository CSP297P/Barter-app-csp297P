const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../utils/testApp');
const Message = require('../../models/Message');
const TradeSession = require('../../models/TradeSession');
const TradeRequest = require('../../models/TradeRequest');

describe('Message Routes', () => {
  let testTradeSession;
  let testUser1;
  let testUser2;

  beforeEach(async () => {
    // Create test users
    testUser1 = new mongoose.Types.ObjectId();
    testUser2 = new mongoose.Types.ObjectId();

    // Create a trade request and session
    const tradeRequest = await TradeRequest.create({
      requesterId: testUser1,
      ownerId: testUser2,
      targetItemId: new mongoose.Types.ObjectId(),
      status: 'accepted'
    });

    testTradeSession = await TradeSession.create({
      tradeRequestId: tradeRequest._id,
      participants: [testUser1, testUser2],
      itemIds: [tradeRequest.targetItemId],
      status: 'active'
    });
  });

  describe('POST /api/messages', () => {
    it('should create a new message', async () => {
      const messageData = {
        sessionId: testTradeSession._id,
        content: 'Hello, I am interested in trading!'
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${testUser1}`) // Mock auth token
        .send(messageData);

      expect(response.status).toBe(201);
      expect(response.body.content).toBe(messageData.content);
      expect(response.body.senderId).toBe(testUser1.toString());
      expect(response.body.timestamp).toBeDefined();
    });

    it('should fail to create message without authentication', async () => {
      const messageData = {
        sessionId: testTradeSession._id,
        content: 'Hello!'
      };

      const response = await request(app)
        .post('/api/messages')
        .send(messageData);

      expect(response.status).toBe(401);
    });

    it('should fail to create message for non-participant', async () => {
      const nonParticipantId = new mongoose.Types.ObjectId();
      const messageData = {
        sessionId: testTradeSession._id,
        content: 'Hello!'
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${nonParticipantId}`)
        .send(messageData);

      expect(response.status).toBe(403);
    });

    it('should fail to create message with empty content', async () => {
      const messageData = {
        sessionId: testTradeSession._id,
        content: ''
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${testUser1}`)
        .send(messageData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/messages/:sessionId', () => {
    beforeEach(async () => {
      // Create some test messages
      await Message.create([
        {
          sessionId: testTradeSession._id,
          senderId: testUser1,
          content: 'First message',
          timestamp: new Date(Date.now() - 2000)
        },
        {
          sessionId: testTradeSession._id,
          senderId: testUser2,
          content: 'Second message',
          timestamp: new Date(Date.now() - 1000)
        }
      ]);
    });

    it('should get messages for a session', async () => {
      const response = await request(app)
        .get(`/api/messages/${testTradeSession._id}`)
        .set('Authorization', `Bearer ${testUser1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].content).toBe('First message');
      expect(response.body[1].content).toBe('Second message');
    });

    it('should fail to get messages without authentication', async () => {
      const response = await request(app)
        .get(`/api/messages/${testTradeSession._id}`);

      expect(response.status).toBe(401);
    });

    it('should fail to get messages for non-participant', async () => {
      const nonParticipantId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/messages/${testTradeSession._id}`)
        .set('Authorization', `Bearer ${nonParticipantId}`);

      expect(response.status).toBe(403);
    });

    it('should return empty array for non-existent session', async () => {
      const nonExistentSessionId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/messages/${nonExistentSessionId}`)
        .set('Authorization', `Bearer ${testUser1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });
}); 