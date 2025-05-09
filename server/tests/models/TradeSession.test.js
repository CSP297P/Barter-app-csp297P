const mongoose = require('mongoose');
const TradeSession = require('../../models/TradeSession');
const TradeRequest = require('../../models/TradeRequest');

describe('TradeSession Model Test', () => {
  beforeEach(async () => {
    await TradeSession.deleteMany({});
    await TradeRequest.deleteMany({});
  });

  it('should create & save trade session successfully', async () => {
    // First create a trade request
    const tradeRequest = await TradeRequest.create({
      requesterId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      targetItemId: new mongoose.Types.ObjectId(),
      offeredItemIds: [new mongoose.Types.ObjectId()],
      message: 'Would you like to trade?',
      status: 'accepted'
    });

    const validTradeSession = new TradeSession({
      tradeRequestId: tradeRequest._id,
      participants: [tradeRequest.requesterId, tradeRequest.ownerId],
      itemIds: [tradeRequest.targetItemId, ...tradeRequest.offeredItemIds],
      status: 'active',
      isChatActive: true
    });
    
    const savedTradeSession = await validTradeSession.save();
    
    expect(savedTradeSession._id).toBeDefined();
    expect(savedTradeSession.status).toBe('active');
    expect(savedTradeSession.isChatActive).toBe(true);
    expect(savedTradeSession.participants).toHaveLength(2);
    expect(savedTradeSession.itemIds).toHaveLength(2);
  });

  it('should fail to save trade session without required fields', async () => {
    const tradeSessionWithoutRequiredField = new TradeSession({
      // missing tradeRequestId and participants
      status: 'active'
    });

    let err;
    try {
      await tradeSessionWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.name).toBe('ValidationError');
    expect(err.errors.tradeRequestId).toBeDefined();
    expect(err.errors.participants).toBeDefined();
    expect(err.errors.itemIds).toBeDefined();
  });

  it('should only accept valid status values', async () => {
    const tradeRequest = await TradeRequest.create({
      requesterId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      targetItemId: new mongoose.Types.ObjectId(),
      status: 'accepted'
    });

    const tradeSession = new TradeSession({
      tradeRequestId: tradeRequest._id,
      participants: [tradeRequest.requesterId, tradeRequest.ownerId],
      status: 'invalid_status'
    });

    let err;
    try {
      await tradeSession.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.name).toBe('ValidationError');
    expect(err.errors.status).toBeDefined();
  });

  it('should update status correctly', async () => {
    const tradeRequest = await TradeRequest.create({
      requesterId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      targetItemId: new mongoose.Types.ObjectId(),
      status: 'accepted'
    });

    const tradeSession = await TradeSession.create({
      tradeRequestId: tradeRequest._id,
      participants: [tradeRequest.requesterId, tradeRequest.ownerId],
      itemIds: [tradeRequest.targetItemId],
      status: 'active'
    });

    tradeSession.status = 'ready_to_trade';
    const updatedSession = await tradeSession.save();

    expect(updatedSession.status).toBe('ready_to_trade');
  });
}); 