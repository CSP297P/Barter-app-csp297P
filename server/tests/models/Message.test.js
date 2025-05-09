const mongoose = require('mongoose');
const Message = require('../../models/Message');
const TradeSession = require('../../models/TradeSession');
const TradeRequest = require('../../models/TradeRequest');

describe('Message Model Test', () => {
  let testTradeSession;

  beforeEach(async () => {
    // Create a trade request and session for our message tests
    const tradeRequest = await TradeRequest.create({
      requesterId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      targetItemId: new mongoose.Types.ObjectId(),
      status: 'accepted'
    });

    testTradeSession = await TradeSession.create({
      tradeRequestId: tradeRequest._id,
      participants: [tradeRequest.requesterId, tradeRequest.ownerId],
      itemIds: [tradeRequest.targetItemId],
      status: 'active'
    });
  });

  it('should create & save message successfully', async () => {
    const validMessage = new Message({
      sessionId: testTradeSession._id,
      senderId: testTradeSession.participants[0],
      content: 'Hello, I am interested in trading!',
    });
    
    const savedMessage = await validMessage.save();
    
    expect(savedMessage._id).toBeDefined();
    expect(savedMessage.content).toBe('Hello, I am interested in trading!');
    expect(savedMessage.timestamp).toBeDefined();
    expect(savedMessage.senderId.toString()).toBe(testTradeSession.participants[0].toString());
  });

  it('should fail to save message without required fields', async () => {
    const messageWithoutRequiredField = new Message({
      sessionId: testTradeSession._id,
      // missing senderId
      content: 'Test message'
    });

    let err;
    try {
      await messageWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.name).toBe('ValidationError');
    expect(err.errors.senderId).toBeDefined();
  });

  it('should fail to save message with empty content', async () => {
    const messageWithEmptyContent = new Message({
      sessionId: testTradeSession._id,
      senderId: testTradeSession.participants[0],
      content: ''
    });

    let err;
    try {
      await messageWithEmptyContent.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.name).toBe('ValidationError');
    expect(err.errors.content).toBeDefined();
  });

  it('should save message with timestamp', async () => {
    const timeBeforeSave = new Date();
    const message = new Message({
      sessionId: testTradeSession._id,
      senderId: testTradeSession.participants[0],
      content: 'Test message with timestamp'
    });

    const savedMessage = await message.save();
    const timeAfterSave = new Date();

    expect(savedMessage.timestamp).toBeDefined();
    expect(savedMessage.timestamp.getTime()).toBeGreaterThanOrEqual(timeBeforeSave.getTime());
    expect(savedMessage.timestamp.getTime()).toBeLessThanOrEqual(timeAfterSave.getTime());
  });

  it('should fail to save message for non-participant sender', async () => {
    const nonParticipantId = new mongoose.Types.ObjectId();
    const messageFromNonParticipant = new Message({
      sessionId: testTradeSession._id,
      senderId: nonParticipantId, // This ID is not in testTradeSession.participants
      content: 'Message from non-participant'
    });

    let err;
    try {
      await messageFromNonParticipant.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.name).toBe('ValidationError');
  });
}); 