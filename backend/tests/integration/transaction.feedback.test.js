const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('POST /transaction/feedback', () => {
  test('should accept PROCEEDED feedback', async () => {
    // Create a transaction first
    const intentResponse = await request(app)
      .post('/transaction/intent')
      .send({
        user_id: 'feedback_test_user',
        amount: 1000,
        payee_id: 'payee_feedback',
        intent_type: 'purchase'
      })
      .expect(200);

    const transactionId = intentResponse.body.transaction_id;

    // Submit feedback
    const feedbackResponse = await request(app)
      .post('/transaction/feedback')
      .send({
        transaction_id: transactionId,
        user_action: 'PROCEEDED'
      })
      .expect(200);

    expect(feedbackResponse.body).toHaveProperty('status', 'ACKNOWLEDGED');
  });

  test('should accept CANCELLED feedback', async () => {
    const intentResponse = await request(app)
      .post('/transaction/intent')
      .send({
        user_id: 'cancel_test_user',
        amount: 1000,
        payee_id: 'payee_cancel',
        intent_type: 'purchase'
      })
      .expect(200);

    const transactionId = intentResponse.body.transaction_id;

    const feedbackResponse = await request(app)
      .post('/transaction/feedback')
      .send({
        transaction_id: transactionId,
        user_action: 'CANCELLED'
      })
      .expect(200);

    expect(feedbackResponse.body.status).toBe('ACKNOWLEDGED');
  });

  test('should return 400 for missing fields', async () => {
    const response = await request(app)
      .post('/transaction/feedback')
      .send({
        transaction_id: 'some-id'
        // Missing user_action
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Missing required fields');
  });

  test('should return 400 for invalid user_action', async () => {
    const intentResponse = await request(app)
      .post('/transaction/intent')
      .send({
        user_id: 'invalid_action_user',
        amount: 1000,
        payee_id: 'payee_invalid',
        intent_type: 'purchase'
      })
      .expect(200);

    const response = await request(app)
      .post('/transaction/feedback')
      .send({
        transaction_id: intentResponse.body.transaction_id,
        user_action: 'INVALID_ACTION'
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Invalid user_action');
  });

  test('should return 404 for non-existent transaction', async () => {
    const response = await request(app)
      .post('/transaction/feedback')
      .send({
        transaction_id: 'non-existent-id',
        user_action: 'PROCEEDED'
      })
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Transaction not found');
  });
});
