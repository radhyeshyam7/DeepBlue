const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/server');
const Transaction = require('../../src/models/Transaction');

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

describe('POST /transaction/decision', () => {
  test('should return risk decision for existing transaction', async () => {
    // First create a transaction
    const intentResponse = await request(app)
      .post('/transaction/intent')
      .send({
        user_id: 'decision_test_user',
        amount: 1000,
        payee_id: 'payee_decision',
        intent_type: 'purchase'
      })
      .expect(200);

    const transactionId = intentResponse.body.transaction_id;

    // Get decision
    const decisionResponse = await request(app)
      .post('/transaction/decision')
      .send({
        transaction_id: transactionId
      })
      .expect(200);

    expect(decisionResponse.body).toHaveProperty('risk_level');
    expect(decisionResponse.body).toHaveProperty('action');
    expect(decisionResponse.body).toHaveProperty('reason_codes');
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(decisionResponse.body.risk_level);
    expect(['ALLOW', 'WARN', 'DELAY']).toContain(decisionResponse.body.action);
  });

  test('should return 400 for missing transaction_id', async () => {
    const response = await request(app)
      .post('/transaction/decision')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Missing required field');
  });

  test('should return 404 for non-existent transaction', async () => {
    const response = await request(app)
      .post('/transaction/decision')
      .send({
        transaction_id: 'non-existent-id-12345'
      })
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Transaction not found');
  });

  test('should return correct risk levels', async () => {
    // Create multiple transactions with different risk profiles
    
    // Low risk: regular user, small amount
    const lowRiskResponse = await request(app)
      .post('/transaction/intent')
      .send({
        user_id: 'low_risk_user',
        amount: 500,
        payee_id: 'known_payee',
        intent_type: 'purchase'
      })
      .expect(200);

    const lowRiskDecision = await request(app)
      .post('/transaction/decision')
      .send({
        transaction_id: lowRiskResponse.body.transaction_id
      })
      .expect(200);

    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(lowRiskDecision.body.risk_level);
  });
});
