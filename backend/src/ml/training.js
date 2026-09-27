/**
 * Model Training Service
 * 
 * Generates training data and trains the Autoencoder model
 */

const Autoencoder = require('./autoencoder');
const fs = require('fs').promises;
const path = require('path');

/**
 * Generate synthetic training data (normal transactions)
 * Calibrated for Indian Rupee amounts:
 * - LOW risk: ₹10-1000 (normal daily transactions)
 * - MEDIUM risk: ₹1000-10000 (larger but reasonable)
 * - HIGH risk: ₹10000+ (very large, unusual)
 */
function generateSyntheticTrainingData(count = 3000) {
  const data = [];
  const featureNames = [
    'amount_ratio', 'amount_zscore', 'is_new_payee', 'payee_trust_score',
    'payee_payment_count', 'txn_frequency_recent', 'velocity_spike',
    'time_deviation_score', 'is_unusual_hour', 'confirmation_time_ratio',
    'hesitation_score', 'amount_edit_count_ratio', 'intent_risk_score',
    'intent_direction_mismatch', 'user_maturity_flag', 'cooling_off_active',
    'recent_warning_ignored', 'device_change_flag', 'account_age_days',
    'transaction_count'
  ];

  // Generate diverse normal transactions
  // 70% LOW risk (small amounts, trusted payees)
  // 25% MEDIUM risk (moderate amounts, some new payees)
  // 5% HIGH risk (large amounts, new payees, unusual patterns)
  
  for (let i = 0; i < count; i++) {
    const riskCategory = Math.random();
    let features;

    if (riskCategory < 0.70) {
      // LOW RISK: Small amounts (₹10-1000), trusted payees, normal behavior
      features = [
        Math.random() * 0.8 + 0.3,         // amount_ratio: 0.3-1.1 (small amounts)
        (Math.random() - 0.5) * 1.2,       // amount_zscore: -0.6 to 0.6 (normal)
        Math.random() < 0.2 ? 1 : 0,       // is_new_payee: 20% new
        Math.random() * 0.4 + 0.6,         // payee_trust_score: 0.6-1.0 (trusted)
        Math.floor(Math.random() * 30) + 5, // payee_payment_count: 5-35 (established)
        Math.random() * 1.0 + 0.7,         // txn_frequency_recent: 0.7-1.7 (normal)
        0,                                  // velocity_spike: no spike
        Math.random() * 0.2,               // time_deviation_score: 0-0.2 (normal timing)
        Math.random() < 0.15 ? 1 : 0,      // is_unusual_hour: 15%
        Math.random() * 0.8 + 0.8,         // confirmation_time_ratio: 0.8-1.6 (quick)
        Math.random() * 0.2,               // hesitation_score: 0-0.2 (confident)
        Math.random() * 1.0 + 0.5,         // amount_edit_count_ratio: 0.5-1.5 (few edits)
        Math.random() * 0.2 + 0.3,         // intent_risk_score: 0.3-0.5 (low risk intent)
        0,                                  // intent_direction_mismatch: no mismatch
        Math.floor(Math.random() * 2) + 1, // user_maturity_flag: 1-2 (mature user)
        0,                                  // cooling_off_active: no cooling off
        0,                                  // recent_warning_ignored: no warnings
        0,                                  // device_change_flag: same device
        Math.floor(Math.random() * 300) + 60, // account_age_days: 60-360 (established)
        Math.floor(Math.random() * 80) + 20   // transaction_count: 20-100 (active)
      ];
    } else if (riskCategory < 0.95) {
      // MEDIUM RISK: Moderate amounts (₹1000-10000), some new payees
      features = [
        Math.random() * 2.0 + 1.0,         // amount_ratio: 1.0-3.0 (moderate amounts)
        (Math.random() - 0.3) * 2.5,       // amount_zscore: -0.75 to 1.75 (above average)
        Math.random() < 0.5 ? 1 : 0,       // is_new_payee: 50% new
        Math.random() * 0.6 + 0.3,         // payee_trust_score: 0.3-0.9 (mixed trust)
        Math.floor(Math.random() * 15),    // payee_payment_count: 0-15 (less established)
        Math.random() * 1.5 + 0.8,         // txn_frequency_recent: 0.8-2.3
        Math.random() < 0.2 ? 1 : 0,       // velocity_spike: 20% spike
        Math.random() * 0.4,               // time_deviation_score: 0-0.4
        Math.random() < 0.3 ? 1 : 0,       // is_unusual_hour: 30%
        Math.random() * 1.5 + 0.6,         // confirmation_time_ratio: 0.6-2.1
        Math.random() * 0.4,               // hesitation_score: 0-0.4 (some hesitation)
        Math.random() * 2.0 + 0.8,         // amount_edit_count_ratio: 0.8-2.8
        Math.random() * 0.3 + 0.4,         // intent_risk_score: 0.4-0.7
        Math.random() < 0.15 ? 1 : 0,      // intent_direction_mismatch: 15%
        Math.floor(Math.random() * 3),     // user_maturity_flag: 0-2
        Math.random() < 0.1 ? 1 : 0,       // cooling_off_active: 10%
        Math.random() < 0.15 ? 1 : 0,      // recent_warning_ignored: 15%
        0,                                  // device_change_flag: same device
        Math.floor(Math.random() * 200) + 10, // account_age_days: 10-210
        Math.floor(Math.random() * 60) + 5    // transaction_count: 5-65
      ];
    } else {
      // HIGH RISK: Large amounts (₹10000+), new payees, unusual patterns
      features = [
        Math.random() * 4.0 + 3.0,         // amount_ratio: 3.0-7.0 (very large)
        Math.random() * 3.0 + 1.5,         // amount_zscore: 1.5-4.5 (way above average)
        Math.random() < 0.8 ? 1 : 0,       // is_new_payee: 80% new
        Math.random() * 0.4,               // payee_trust_score: 0-0.4 (low trust)
        Math.floor(Math.random() * 5),     // payee_payment_count: 0-5 (new relationship)
        Math.random() * 2.0 + 1.5,         // txn_frequency_recent: 1.5-3.5 (high frequency)
        Math.random() < 0.5 ? 1 : 0,       // velocity_spike: 50% spike
        Math.random() * 0.6 + 0.3,         // time_deviation_score: 0.3-0.9 (unusual timing)
        Math.random() < 0.5 ? 1 : 0,       // is_unusual_hour: 50%
        Math.random() * 2.0 + 1.5,         // confirmation_time_ratio: 1.5-3.5 (slow/rushed)
        Math.random() * 0.6 + 0.3,         // hesitation_score: 0.3-0.9 (high hesitation)
        Math.random() * 3.0 + 1.5,         // amount_edit_count_ratio: 1.5-4.5 (many edits)
        Math.random() * 0.4 + 0.6,         // intent_risk_score: 0.6-1.0 (high risk intent)
        Math.random() < 0.3 ? 1 : 0,       // intent_direction_mismatch: 30%
        0,                                  // user_maturity_flag: 0 (new/immature)
        Math.random() < 0.3 ? 1 : 0,       // cooling_off_active: 30%
        Math.random() < 0.3 ? 1 : 0,       // recent_warning_ignored: 30%
        Math.random() < 0.2 ? 1 : 0,       // device_change_flag: 20% device change
        Math.floor(Math.random() * 30),    // account_age_days: 0-30 (new account)
        Math.floor(Math.random() * 10)     // transaction_count: 0-10 (few transactions)
      ];
    }

    data.push(features);
  }

  return { data, featureNames };
}

/**
 * Load training data from Phase 1 transactions (if available)
 */
async function loadPhase1Transactions() {
  try {
    const Transaction = require('../models/Transaction');
    const transactions = await Transaction.find({
      risk_level: 'LOW' // Only use low-risk transactions as "normal"
    }).limit(500);

    if (transactions.length === 0) {
      return null;
    }

    // Convert transactions to feature vectors
    // Note: This is simplified - in production, you'd use the actual feature extractor
    const featureVectors = transactions.map(txn => {
      // Simplified feature extraction for training data
      // In production, use extractFeaturesV1
      return [
        Math.random() * 2 + 0.5,  // Placeholder - would use real features
        // ... other features
      ];
    });

    return featureVectors;
  } catch (error) {
    console.warn('Could not load Phase 1 transactions:', error.message);
    return null;
  }
}

/**
 * Train the Autoencoder model
 */
async function trainModel() {
  console.log('🔄 Training Autoencoder model...');

  // Generate synthetic data for training (3000 samples for better calibration)
  const synthetic = generateSyntheticTrainingData(3000);
  console.log(`✅ Generated ${synthetic.data.length} synthetic training samples`);

  // Train Autoencoder model (20 → 10 → 5 → 10 → 20)
  const model = new Autoencoder(20, 10, 5);
  model.fit(synthetic.data, {
    epochs: 100,
    learningRate: 0.01,
    batchSize: 32,
    verbose: true
  });
  console.log('✅ Model training completed');

  // Save model (includes calibration percentiles)
  const modelPath = path.join(__dirname, '../models/ml_model.json');
  await fs.writeFile(modelPath, JSON.stringify(model.toJSON(), null, 2));
  console.log(`✅ Model saved to ${modelPath}`);

  return { model, featureNames: synthetic.featureNames };
}

/**
 * Load trained model from disk
 */
async function loadModel() {
  try {
    const modelPath = path.join(__dirname, '../models/ml_model.json');
    const modelData = await fs.readFile(modelPath, 'utf8');
    const json = JSON.parse(modelData);
    
    // Check model type and load accordingly
    let model;
    if (json.modelType === 'autoencoder') {
      model = Autoencoder.fromJSON(json);
    } else {
      // Backward compatibility: if no modelType, assume old Isolation Forest
      console.warn('⚠️  Old model format detected. Please retrain with Autoencoder.');
      throw new Error('Incompatible model format. Please retrain the model.');
    }
    
    // Get feature names
    const featureNames = [
      'amount_ratio', 'amount_zscore', 'is_new_payee', 'payee_trust_score',
      'payee_payment_count', 'txn_frequency_recent', 'velocity_spike',
      'time_deviation_score', 'is_unusual_hour', 'confirmation_time_ratio',
      'hesitation_score', 'amount_edit_count_ratio', 'intent_risk_score',
      'intent_direction_mismatch', 'user_maturity_flag', 'cooling_off_active',
      'recent_warning_ignored', 'device_change_flag', 'account_age_days',
      'transaction_count'
    ];

    return { model, featureNames };
  } catch (error) {
    console.warn('Model not found, training new model...', error.message);
    return await trainModel();
  }
}

module.exports = {
  trainModel,
  loadModel,
  generateSyntheticTrainingData
};
