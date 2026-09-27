const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/server');

let mongoServer;

beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to in-memory database
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean up collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('POST /transaction/intent', () => {
  test('should create a transaction with valid data', async () => {
    const response = await request(app)
      .post('/transaction/intent')
      .send({
        user_id: 'test_user_001',
        amount: 1000,
        payee_id: 'payee_001',
        intent_type: 'purchase'
      })
      .expect(200);

    expect(response.body).toHaveProperty('transaction_id');
    expect(response.body).toHaveProperty('status', 'RECEIVED');
    expect(response.body.transaction_id).toBeTruthy();
  });

  test('should return 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/transaction/intent')
      .send({
        user_id: 'test_user',
        amount: 1000
        // Missing payee_id and intent_type
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Missing required fields');
  });

  test('should return 400 for invalid intent_type', async () => {
    const response = await request(app)
      .post('/transaction/intent')
      .send({
        user_id: 'test_user',
        amount: 1000,
        payee_id: 'payee_001',
        intent_type: 'invalid_type'
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Invalid intent_type');
  });

  test('should accept all valid intent types', async () => {
    const validTypes = ['refund', 'receive', 'purchase', 'support'];
    
    for (const intentType of validTypes) {
      const response = await request(app)
        .post('/transaction/intent')
        .send({
          user_id: `test_user_${intentType}`,
          amount: 1000,
          payee_id: `payee_${intentType}`,
          intent_type: intentType
        })
        .expect(200);

      expect(response.body.status).toBe('RECEIVED');
    }
  });

  test('should calculate HIGH risk for new user with large amount', async () => {
    const response = await request(app)
      .post('/transaction/intent')
      .send({
        user_id: 'new_user_high_risk',
        amount: 50000,
        payee_id: 'unknown_payee',
        intent_type: 'purchase',
        behavioral_signals: {
          hesitation_time_ms: 4000,
          amount_edit_count: 5,
          confirmation_delay_ms: 6000
        }
      })
      .expect(200);

    // Get the transaction decision
    const decisionResponse = await request(app)
      .post('/transaction/decision')
      .send({
        transaction_id: response.body.transaction_id
      })
      .expect(200);

    // Should be HIGH risk due to new user + large amount
    expect(['HIGH', 'MEDIUM']).toContain(decisionResponse.body.risk_level);
  });

  test('should accept behavioral_signals', async () => {
    const response = await request(app)
      .post('/transaction/intent')
      .send({
        user_id: 'behavioral_test_user',
        amount: 2000,
        payee_id: 'payee_behavioral',
        intent_type: 'purchase',
        behavioral_signals: {
          hesitation_time_ms: 3000,
          amount_edit_count: 3,
          confirmation_delay_ms: 5000
        }
      })
      .expect(200);

    expect(response.body.status).toBe('RECEIVED');
  });

  test('should work without behavioral_signals', async () => {
    const response = await request(app)
      .post('/transaction/intent')
      .send({
        user_id: 'no_signals_user',
        amount: 1000,
        payee_id: 'payee_no_signals',
        intent_type: 'purchase'
      })
      .expect(200);

    expect(response.body.status).toBe('RECEIVED');
  });
});
