const mongoose = require('mongoose');
const TradeRequest = require('../../models/TradeRequest');

describe('TradeRequest Model Test', () => {
  beforeEach(async () => {
    await TradeRequest.deleteMany({});
  });

  it('should create & save trade request successfully', async () => {
    const validTradeRequest = new TradeRequest({
      requesterId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      targetItemId: new mongoose.Types.ObjectId(),
      offeredItemIds: [new mongoose.Types.ObjectId()],
      message: 'Would you like to trade?'
    });
    
    const savedTradeRequest = await validTradeRequest.save();
    
    expect(savedTradeRequest._id).toBeDefined();
    expect(savedTradeRequest.status).toBe('pending');
    expect(savedTradeRequest.message).toBe('Would you like to trade?');
  });

  it('should fail to save trade request without required fields', async () => {
    const tradeRequestWithoutRequiredField = new TradeRequest({
      requesterId: new mongoose.Types.ObjectId(),
      // missing ownerId and targetItemId
      message: 'Would you like to trade?'
    });

    let err;
    try {
      await tradeRequestWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.ownerId).toBeDefined();
    expect(err.errors.targetItemId).toBeDefined();
  });

  it('should only accept valid status values', async () => {
    const tradeRequest = new TradeRequest({
      requesterId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      targetItemId: new mongoose.Types.ObjectId(),
      status: 'invalid_status'
    });

    let err;
    try {
      await tradeRequest.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.status).toBeDefined();
  });
}); 