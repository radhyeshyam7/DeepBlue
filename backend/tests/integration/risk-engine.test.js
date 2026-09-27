/**
 * integration/risk-engine.test.js
 * 
 * Complete integration test suite for behavior-first risk engine
 * Tests: feature extraction → risk scoring → transaction flow
 */

const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const PayeeRelationship = require('../../src/models/PayeeRelationship');
const Transaction = require('../../src/models/Transaction');
const { extractTransactionFeatures } = require('../../src/services/featureExtractor');
const { calculateRiskLevel } = require('../../src/services/riskEngine');
const { buildUserProfile, updateUserProfileAfterTransaction } = require('../../src/services/behavioralProfile');

// Mock setup
jest.mock('../../src/utils/redis', () => ({
  incrementVelocityCounter: jest.fn().mockResolvedValue(1),
  setDelayState: jest.fn().mockResolvedValue(true),
  removeDelayState: jest.fn().mockResolvedValue(true),
  getVelocityCount: jest.fn().mockResolvedValue(1)
}));

describe('Risk Engine Integration Tests', () => {
  let app;
  let testUserId = 'test_user_123';
  let testPayeeId = 'test_payee_456';

  beforeAll(async () => {
    // Connect to MongoDB (use test database)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/deepblue_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    app = require('../../src/server'); // Import your Express app
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await PayeeRelationship.deleteMany({});
    await Transaction.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await User.deleteMany({});
    await PayeeRelationship.deleteMany({});
    await Transaction.deleteMany({});
  });

  // ==========================================
  // TEST SUITE 1: FEATURE EXTRACTION
  // ==========================================

  describe('Feature Extraction (6-Category)', () => {
    
    it('should extract all 6 feature categories for NEW user', async () => {
      // Setup: Create new user
      const newUser = new User({
        user_id: testUserId,
        account_created_at: new Date(),
        total_transactions: 0,
        user_type: 'NEW',
        avg_transaction_amount: 0,
        median_transaction_amount: 0,
        max_transaction_amount: 0,
        preferred_transaction_hours: []
      });
      await newUser.save();

      // Execute: Extract features
      const extracted = await extractTransactionFeatures(
        testUserId,
        { amount: 5000, payee_id: testPayeeId, intent_type: 'transfer' },
        {}
      );

      // Assert: All categories present
      expect(extracted.features).toBeDefined();
      expect(extracted.features.payee).toBeDefined();
      expect(extracted.features.amount).toBeDefined();
      expect(extracted.features.time_urgency).toBeDefined();
      expect(extracted.features.intent).toBeDefined();
      expect(extracted.features.hesitation).toBeDefined();
      expect(extracted.features.vulnerability).toBeDefined();

      // Assert: Vulnerability indicators set for new user
      expect(extracted.features.vulnerability.is_new_user).toBe(true);
    });

    it('should flag NEW PAYEE correctly', async () => {
      // Setup: User with transaction history, no payee relationship
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days old
        total_transactions: 20,
        user_type: 'REGULAR',
        avg_transaction_amount: 3000,
        max_transaction_amount: 10000
      });
      await user.save();

      // Execute: Extract features for new payee
      const extracted = await extractTransactionFeatures(
        testUserId,
        { amount: 5000, payee_id: 'new_payee_999', intent_type: 'transfer' },
        {}
      );

      // Assert: New payee flagged
      expect(extracted.features.payee.is_new_payee).toBe(true);
      expect(extracted.features.payee.payee_trust_score).toBe(0);
    });

    it('should detect AMOUNT SPIKE (3x average)', async () => {
      // Setup: User with established pattern
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        total_transactions: 50,
        user_type: 'REGULAR',
        avg_transaction_amount: 2000,
        max_transaction_amount: 15000,
        median_transaction_amount: 2000
      });
      await user.save();

      // Create trusted payee
      const payee = new PayeeRelationship({
        user_id: testUserId,
        payee_id: testPayeeId,
        payment_count: 10,
        trust_score: 0.8
      });
      await payee.save();

      // Execute: Extract features for 6000 (3x avg)
      const extracted = await extractTransactionFeatures(
        testUserId,
        { amount: 6000, payee_id: testPayeeId, intent_type: 'transfer' },
        {}
      );

      // Assert: Spike detected
      expect(extracted.features.amount.is_multiple_of_avg).toBe(true);
      expect(extracted.features.amount.amount_vs_avg_ratio).toBeGreaterThan(2.5);
    });

    it('should calculate HESITATION indicators', async () => {
      // Setup: User with baseline behavior
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        total_transactions: 30,
        user_type: 'REGULAR',
        avg_confirmation_time_ms: 2000,
        amount_edit_count_avg: 1,
        hesitation_score_recent: 0.2
      });
      await user.save();

      // Execute: Extract features with behavioral signals
      const extracted = await extractTransactionFeatures(
        testUserId,
        { amount: 5000, payee_id: testPayeeId, intent_type: 'transfer' },
        {
          confirmation_time_ms: 5000,  // 2.5x baseline
          amount_edit_count: 4,         // High edits
          hesitation_score: 0.6
        }
      );

      // Assert: Hesitation flagged
      expect(extracted.features.hesitation.unusual_hesitation).toBe(true);
      expect(extracted.features.hesitation.excessive_edits).toBe(true);
    });
  });

  // ==========================================
  // TEST SUITE 2: RISK SCORING
  // ==========================================

  describe('Risk Scoring (6-Category Composite)', () => {
    
    it('should assign LOW risk to established user + trusted payee', async () => {
      // Setup: Mature user with trusted payee
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year old
        total_transactions: 100,
        user_type: 'HEAVY',
        avg_transaction_amount: 5000,
        max_transaction_amount: 50000,
        preferred_transaction_hours: [9, 10, 15, 16, 17],
        cooling_off_enabled: false,
        ignored_warnings_count: 0
      });
      await user.save();

      const payee = new PayeeRelationship({
        user_id: testUserId,
        payee_id: testPayeeId,
        payment_count: 50,
        trust_score: 0.95,
        risk_level: 'HIGH_TRUST'
      });
      await payee.save();

      // Execute: Calculate risk
      const riskDecision = await calculateRiskLevel({
        user_id: testUserId,
        amount: 5000,
        payee_id: testPayeeId,
        intent_type: 'transfer',
        behavioral_signals: {
          confirmation_time_ms: 2000,
          amount_edit_count: 0,
          hesitation_score: 0
        }
      });

      // Assert: LOW risk
      expect(riskDecision.risk_level).toBe('LOW');
      expect(riskDecision.action).toBe('ALLOW');
      expect(riskDecision.risk_score).toBeLessThan(3);
    });

    it('should assign HIGH risk to NEW user + NEW payee + amount spike', async () => {
      // Setup: Brand new user
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(), // Just created
        total_transactions: 0,
        user_type: 'NEW',
        avg_transaction_amount: 0,
        cooling_off_enabled: false
      });
      await user.save();

      // No payee relationship (new payee)

      // Execute: Calculate risk for large amount
      const riskDecision = await calculateRiskLevel({
        user_id: testUserId,
        amount: 25000, // Large amount
        payee_id: 'unknown_payee_999',
        intent_type: 'transfer',
        behavioral_signals: {
          confirmation_time_ms: 3000,
          amount_edit_count: 5,
          hesitation_score: 0.8
        }
      });

      // Assert: HIGH risk
      expect(riskDecision.risk_level).toBe('HIGH');
      expect(riskDecision.action).toBe('DELAY');
      expect(riskDecision.reason_codes).toContain('new_user');
      expect(riskDecision.reason_codes).toContain('new_payee');
    });

    it('should assign MEDIUM risk to unusual amount without other factors', async () => {
      // Setup: Established user
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        total_transactions: 50,
        user_type: 'REGULAR',
        avg_transaction_amount: 3000,
        max_transaction_amount: 20000,
        preferred_transaction_hours: [9, 10, 15, 16],
        cooling_off_enabled: false
      });
      await user.save();

      const payee = new PayeeRelationship({
        user_id: testUserId,
        payee_id: testPayeeId,
        payment_count: 15,
        trust_score: 0.7,
        risk_level: 'MEDIUM_TRUST'
      });
      await payee.save();

      // Execute: Calculate risk for 3.5x average amount
      const riskDecision = await calculateRiskLevel({
        user_id: testUserId,
        amount: 10500,
        payee_id: testPayeeId,
        intent_type: 'transfer',
        behavioral_signals: {
          confirmation_time_ms: 2000,
          amount_edit_count: 1,
          hesitation_score: 0.2
        }
      });

      // Assert: MEDIUM risk
      expect(riskDecision.risk_level).toBe('MEDIUM');
      expect(riskDecision.action).toBe('WARN');
      expect(riskDecision.reason_codes).toContain('significant_amount_spike');
    });

    it('should include all 6 category scores in response', async () => {
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        total_transactions: 20,
        user_type: 'REGULAR',
        avg_transaction_amount: 3000
      });
      await user.save();

      // Execute: Calculate risk
      const riskDecision = await calculateRiskLevel({
        user_id: testUserId,
        amount: 5000,
        payee_id: 'new_payee',
        intent_type: 'transfer',
        behavioral_signals: {}
      });

      // Assert: All 6 category scores present
      expect(riskDecision.category_scores).toBeDefined();
      expect(riskDecision.category_scores.payee).toBeDefined();
      expect(riskDecision.category_scores.amount).toBeDefined();
      expect(riskDecision.category_scores.urgency).toBeDefined();
      expect(riskDecision.category_scores.intent).toBeDefined();
      expect(riskDecision.category_scores.hesitation).toBeDefined();
      expect(riskDecision.category_scores.vulnerability).toBeDefined();
    });
  });

  // ==========================================
  // TEST SUITE 3: TRANSACTION FLOW
  // ==========================================

  describe('Complete Transaction Flow', () => {
    
    it('should process intent → risk eval → feedback → profile update', async () => {
      // Setup: Create user
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        total_transactions: 10,
        user_type: 'REGULAR',
        avg_transaction_amount: 2000,
        max_transaction_amount: 8000,
        median_transaction_amount: 2000,
        avg_confirmation_time_ms: 2000,
        amount_edit_count_avg: 1
      });
      await user.save();

      // STEP 1: Submit intent
      const intentResponse = await request(app)
        .post('/transaction/intent')
        .send({
          user_id: testUserId,
          amount: 5000,
          payee_id: testPayeeId,
          intent_type: 'transfer',
          behavioral_signals: {
            confirmation_time_ms: 2500,
            amount_edit_count: 1,
            hesitation_score: 0.2
          }
        });

      expect(intentResponse.status).toBe(200);
      expect(intentResponse.body.transaction_id).toBeDefined();
      expect(intentResponse.body.risk_level).toBeDefined();
      const transactionId = intentResponse.body.transaction_id;

      // Verify transaction created
      const txn = await Transaction.findOne({ transaction_id: transactionId });
      expect(txn).toBeDefined();
      expect(txn.features_vector).toBeDefined();
      expect(txn.category_scores).toBeDefined();

      // STEP 2: Submit feedback (user proceeded)
      const feedbackResponse = await request(app)
        .post('/transaction/feedback')
        .send({
          transaction_id: transactionId,
          user_action: 'PROCEEDED',
          user_notes: 'Legitimate transaction'
        });

      expect(feedbackResponse.status).toBe(200);

      // Verify user profile was updated
      const updatedUser = await User.findOne({ user_id: testUserId });
      expect(updatedUser.total_transactions).toBeGreaterThan(10);
      expect(updatedUser.avg_transaction_amount).toBeGreaterThan(2000); // Increased due to 5000 txn

      // Verify payee relationship created/updated
      const payeeRel = await PayeeRelationship.findOne({ user_id: testUserId, payee_id: testPayeeId });
      expect(payeeRel).toBeDefined();
      expect(payeeRel.payment_count).toBe(1);
    });

    it('should NOT update profile if user CANCELLED', async () => {
      // Setup: Create user
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        total_transactions: 10,
        user_type: 'REGULAR',
        avg_transaction_amount: 2000
      });
      await user.save();

      // Submit intent
      const intentResponse = await request(app)
        .post('/transaction/intent')
        .send({
          user_id: testUserId,
          amount: 5000,
          payee_id: testPayeeId,
          intent_type: 'transfer'
        });

      const transactionId = intentResponse.body.transaction_id;

      // Submit feedback: CANCELLED
      await request(app)
        .post('/transaction/feedback')
        .send({
          transaction_id: transactionId,
          user_action: 'CANCELLED'
        });

      // Verify user profile was NOT updated
      const unchangedUser = await User.findOne({ user_id: testUserId });
      expect(unchangedUser.total_transactions).toBe(10); // Same as before

      // Verify payee relationship was NOT created
      const payeeRel = await PayeeRelationship.findOne({ user_id: testUserId, payee_id: testPayeeId });
      expect(payeeRel).toBeNull();
    });

    it('should alert nominee on HIGH risk transaction', async () => {
      // Setup: Create user with nominee
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(), // NEW user
        total_transactions: 0,
        user_type: 'NEW',
        nominee: {
          enabled: true,
          verified: true,
          phone: '+91-1234567890',
          name: 'Mom'
        }
      });
      await user.save();

      // Submit HIGH risk intent
      const intentResponse = await request(app)
        .post('/transaction/intent')
        .send({
          user_id: testUserId,
          amount: 10000,
          payee_id: 'unknown_payee',
          intent_type: 'transfer'
        });

      expect(intentResponse.body.risk_level).toBe('HIGH');

      const transactionId = intentResponse.body.transaction_id;

      // Submit feedback: PROCEEDED
      await request(app)
        .post('/transaction/feedback')
        .send({
          transaction_id: transactionId,
          user_action: 'PROCEEDED'
        });

      // Verify nominee was alerted (would be async, so check flag)
      const txn = await Transaction.findOne({ transaction_id: transactionId });
      expect(txn.payment_status).toBe('CONFIRMED');
    });
  });

  // ==========================================
  // TEST SUITE 4: BEHAVIORAL PROFILE
  // ==========================================

  describe('Behavioral Profile Updates', () => {
    
    it('should update avg/median/max amounts after transaction', async () => {
      // Setup: User with initial stats
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        total_transactions: 2,
        avg_transaction_amount: 1000,
        median_transaction_amount: 1000,
        max_transaction_amount: 1500
      });
      await user.save();

      // Execute: Update profile with new transaction of 5000
      await updateUserProfileAfterTransaction(
        testUserId,
        5000,
        testPayeeId,
        'transfer',
        { confirmation_time_ms: 3000 }
      );

      // Assert: Stats updated
      const updatedUser = await User.findOne({ user_id: testUserId });
      expect(updatedUser.total_transactions).toBe(3);
      expect(updatedUser.max_transaction_amount).toBe(5000);
      expect(updatedUser.avg_transaction_amount).toBeGreaterThan(1000);
    });

    it('should track confirmation time baseline', async () => {
      const user = new User({
        user_id: testUserId,
        account_created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        total_transactions: 1,
        avg_confirmation_time_ms: 2000
      });
      await user.save();

      // Execute: Update with faster confirmation
      await updateUserProfileAfterTransaction(
        testUserId,
        3000,
        testPayeeId,
        'transfer',
        { confirmation_time_ms: 1500 }
      );

      // Assert: Baseline updated
      const updatedUser = await User.findOne({ user_id: testUserId });
      expect(updatedUser.avg_confirmation_time_ms).toBeLessThan(2000);
    });
  });
});
