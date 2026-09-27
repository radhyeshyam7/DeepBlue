/**
 * Model Training Script
 * 
 * Run this to train the Isolation Forest model:
 * node scripts/train-model.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { trainModel } = require('../src/ml/training');

async function main() {
  try {
    console.log('🚀 Starting model training...\n');

    // Connect to MongoDB (optional - for loading Phase 1 data)
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/upi_fraud_prevention';
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB\n');
    } catch (error) {
      console.warn('⚠️  MongoDB not available, using synthetic data only\n');
    }

    // Train model
    const { model, featureNames } = await trainModel();

    console.log('\n✅ Model training completed successfully!');
    console.log(`📊 Model trained on ${featureNames.length} features`);
    console.log(`🌲 Isolation Forest with ${model.nEstimators} trees\n`);

    // Test inference
    console.log('🧪 Testing inference...');
    const testFeatures = {
      amount_ratio: 1.5,
      amount_zscore: 0.5,
      is_new_payee: 0,
      payee_trust_score: 0.8,
      payee_payment_count: 10,
      txn_frequency_recent: 1.0,
      velocity_spike: 0,
      time_deviation_score: 0.1,
      is_unusual_hour: 0,
      confirmation_time_ratio: 1.0,
      hesitation_score: 0.1,
      amount_edit_count_ratio: 1.0,
      intent_risk_score: 0.5,
      intent_direction_mismatch: 0,
      user_maturity_flag: 1,
      cooling_off_active: 0,
      recent_warning_ignored: 0,
      device_change_flag: 0,
      account_age_days: 100,
      transaction_count: 50
    };

    const { infer } = require('../src/ml/inferenceService');
    const result = await infer(testFeatures);
    console.log('Test inference result:', JSON.stringify(result, null, 2));
    console.log('\n✅ Inference test passed!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Training failed:', error);
    process.exit(1);
  }
}

main();
