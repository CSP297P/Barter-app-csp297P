describe('Trade Session Approval Flow', () => {
  let testSession;
  let user1;
  let user2;

  beforeEach(async () => {
    // Create test users
    user1 = await User.create({
      email: 'test1@example.com',
      password: 'password123',
      displayName: 'Test User 1'
    });

    user2 = await User.create({
      email: 'test2@example.com',
      password: 'password123',
      displayName: 'Test User 2'
    });

    // Create test items
    const item1 = await Item.create({
      name: 'Test Item 1',
      description: 'Test Description 1',
      ownerId: user1._id
    });

    const item2 = await Item.create({
      name: 'Test Item 2',
      description: 'Test Description 2',
      ownerId: user2._id
    });

    // Create test trade session
    testSession = await TradeSession.create({
      participants: [user1._id, user2._id],
      itemIds: [item1._id],
      offeredItemIds: [item2._id],
      status: 'active'
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Item.deleteMany({});
    await TradeSession.deleteMany({});
  });

  test('should update UI immediately when trade is approved', async () => {
    // Mock socket.io
    const mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };

    // Approve trade as user1
    const response = await request(app)
      .post(`/api/trade-sessions/${testSession._id}/approve`)
      .set('Authorization', `Bearer ${generateToken(user1)}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Verify socket events were emitted
    expect(mockIo.to).toHaveBeenCalledWith(`trade_session_${testSession._id}`);
    expect(mockIo.emit).toHaveBeenCalledWith('trade_approved', {
      sessionId: testSession._id,
      userId: user1._id.toString()
    });

    // Verify trade session was updated
    const updatedSession = await TradeSession.findById(testSession._id);
    expect(updatedSession.approvals.get(user1._id.toString())).toBe(true);
  });
});

describe('Trade Session Real-time Updates', () => {
  let testSession;
  let user1;
  let user2;

  beforeEach(async () => {
    // Create test users
    user1 = await User.create({
      email: 'test1@example.com',
      password: 'password123',
      displayName: 'Test User 1'
    });

    user2 = await User.create({
      email: 'test2@example.com',
      password: 'password123',
      displayName: 'Test User 2'
    });

    // Create test items
    const item1 = await Item.create({
      name: 'Test Item 1',
      description: 'Test Description 1',
      ownerId: user1._id
    });

    const item2 = await Item.create({
      name: 'Test Item 2',
      description: 'Test Description 2',
      ownerId: user2._id
    });

    // Create test trade session
    testSession = await TradeSession.create({
      participants: [user1._id, user2._id],
      itemIds: [item1._id],
      offeredItemIds: [item2._id],
      status: 'pending'
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Item.deleteMany({});
    await TradeSession.deleteMany({});
  });

  test('should update conversations list when receiving new trade request', async () => {
    // Mock socket.io
    const mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };

    // Create a new trade request
    const newTradeRequest = await TradeSession.create({
      participants: [user1._id, user2._id],
      itemIds: [item1._id],
      offeredItemIds: [item2._id],
      status: 'pending'
    });

    // Verify socket events were emitted
    expect(mockIo.to).toHaveBeenCalledWith(`user_${user1._id}`);
    expect(mockIo.to).toHaveBeenCalledWith(`user_${user2._id}`);
    expect(mockIo.emit).toHaveBeenCalledWith('new_trade_session', {
      session: expect.objectContaining({
        _id: newTradeRequest._id,
        status: 'pending'
      })
    });
  });
});

describe('Trade Session Message Restrictions', () => {
  let testSession;
  let user1;
  let user2;

  beforeEach(async () => {
    // Create test users
    user1 = await User.create({
      email: 'test1@example.com',
      password: 'password123',
      displayName: 'Test User 1'
    });

    user2 = await User.create({
      email: 'test2@example.com',
      password: 'password123',
      displayName: 'Test User 2'
    });

    // Create test items
    const item1 = await Item.create({
      name: 'Test Item 1',
      description: 'Test Description 1',
      ownerId: user1._id
    });

    const item2 = await Item.create({
      name: 'Test Item 2',
      description: 'Test Description 2',
      ownerId: user2._id
    });

    // Create test trade session
    testSession = await TradeSession.create({
      participants: [user1._id, user2._id],
      itemIds: [item1._id],
      offeredItemIds: [item2._id],
      status: 'denied'
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Item.deleteMany({});
    await TradeSession.deleteMany({});
  });

  test('should not allow messages in rejected trade session', async () => {
    // Mock socket.io
    const mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };

    // Try to send a message in rejected session
    const response = await request(app)
      .post(`/api/messages/session/${testSession._id}`)
      .set('Authorization', `Bearer ${generateToken(user1)}`)
      .send({
        content: 'Test message',
        senderId: user1._id
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Cannot send messages in a rejected trade session');

    // Verify no socket events were emitted
    expect(mockIo.emit).not.toHaveBeenCalled();
  });
});

describe('Message Unread Counts', () => {
  let testSession;
  let user1;
  let user2;

  beforeEach(async () => {
    // Create test users
    user1 = await User.create({
      email: 'test1@example.com',
      password: 'password123',
      displayName: 'Test User 1'
    });

    user2 = await User.create({
      email: 'test2@example.com',
      password: 'password123',
      displayName: 'Test User 2'
    });

    // Create test items
    const item1 = await Item.create({
      name: 'Test Item 1',
      description: 'Test Description 1',
      ownerId: user1._id
    });

    const item2 = await Item.create({
      name: 'Test Item 2',
      description: 'Test Description 2',
      ownerId: user2._id
    });

    // Create test trade session
    testSession = await TradeSession.create({
      participants: [user1._id, user2._id],
      itemIds: [item1._id],
      offeredItemIds: [item2._id],
      status: 'active'
    });

    // Create some unread messages
    await Message.create([
      {
        sessionId: testSession._id,
        senderId: user2._id,
        content: 'Test message 1',
        read: false
      },
      {
        sessionId: testSession._id,
        senderId: user2._id,
        content: 'Test message 2',
        read: false
      }
    ]);
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Item.deleteMany({});
    await TradeSession.deleteMany({});
    await Message.deleteMany({});
  });

  test('should fetch unread message counts for all conversations', async () => {
    const response = await request(app)
      .get('/api/messages/unread-counts')
      .set('Authorization', `Bearer ${generateToken(user1)}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(testSession._id.toString());
    expect(response.body[testSession._id.toString()]).toBe(2);
  });
}); 