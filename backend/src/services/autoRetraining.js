/**
 * Auto-Retraining Service
 * 
 * Automatically retrains the ML model using real transaction data
 * Triggers retraining when enough new normal transactions are collected
 */

const { trainModel } = require('../ml/training');
const Transaction = require('../models/Transaction');
const { extractFeaturesV1 } = require('../ml/featureExtractor');
const User = require('../models/User');
const PayeeRelationship = require('../models/PayeeRelationship');

// Configuration
const RETRAINING_CONFIG = {
  MIN_TRANSACTIONS: 100,        // Minimum transactions before retraining
  RETRAINING_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours in ms
  AUTO_RETRAIN_ENABLED: true,   // Enable/disable auto-retraining
  USE_REAL_DATA: true           // Use real transactions instead of synthetic
};

let lastRetrainingTime = null;
let retrainingInProgress = false;

/**
 * Check if retraining is needed and trigger if conditions are met
 */
async function checkAndRetrain() {
  if (!RETRAINING_CONFIG.AUTO_RETRAIN_ENABLED) {
    console.log('⏸️  Auto-retraining is disabled');
    return { retrained: false, reason: 'disabled' };
  }

  if (retrainingInProgress) {
    console.log('⏸️  Retraining already in progress');
    return { retrained: false, reason: 'in_progress' };
  }

  // Check if enough time has passed since last retraining
  if (lastRetrainingTime) {
    const timeSinceLastRetrain = Date.now() - lastRetrainingTime;
    if (timeSinceLastRetrain < RETRAINING_CONFIG.RETRAINING_INTERVAL) {
      const hoursRemaining = Math.ceil((RETRAINING_CONFIG.RETRAINING_INTERVAL - timeSinceLastRetrain) / (60 * 60 * 1000));
      console.log(`⏸️  Too soon to retrain. Wait ${hoursRemaining} more hours`);
      return { retrained: false, reason: 'too_soon', hoursRemaining };
    }
  }

  // Check if we have enough transactions
  const normalTxnCount = await Transaction.countDocuments({
    risk_level: 'LOW',
    payment_status: 'CONFIRMED'
  });

  if (normalTxnCount < RETRAINING_CONFIG.MIN_TRANSACTIONS) {
    console.log(`⏸️  Not enough transactions for retraining (${normalTxnCount}/${RETRAINING_CONFIG.MIN_TRANSACTIONS})`);
    return { 
      retrained: false, 
      reason: 'insufficient_data', 
      current: normalTxnCount,
      required: RETRAINING_CONFIG.MIN_TRANSACTIONS 
    };
  }

  // Trigger retraining
  console.log(`🔄 Starting auto-retraining with ${normalTxnCount} transactions...`);
  return await retrainModel();
}

/**
 * Retrain the model using real transaction data
 */
async function retrainModel() {
  retrainingInProgress = true;
  const startTime = Date.now();

  try {
    console.log('📊 Fetching normal transactions from database...');
    
    // Fetch LOW risk, CONFIRMED transactions (these are "normal" behavior)
    const normalTransactions = await Transaction.find({
      risk_level: 'LOW',
      payment_status: 'CONFIRMED'
    })
    .sort({ createdAt: -1 })
    .limit(2000) // Use last 2000 normal transactions
    .lean();

    console.log(`✅ Found ${normalTransactions.length} normal transactions`);

    if (normalTransactions.length < RETRAINING_CONFIG.MIN_TRANSACTIONS) {
      throw new Error(`Insufficient data: ${normalTransactions.length} transactions (need ${RETRAINING_CONFIG.MIN_TRANSACTIONS})`);
    }

    // Extract feature vectors from real transactions
    console.log('🔧 Extracting features from transactions...');
    const featureVectors = [];
    
    for (const txn of normalTransactions) {
      try {
        // Get user and payee relationship for feature extraction
        const user = await User.findOne({ user_id: txn.user_id });
        const payeeRel = await PayeeRelationship.findOne({
          user_id: txn.user_id,
          payee_id: txn.payee_id
        });

        if (!user) continue; // Skip if user not found

        // Extract features using the same method as during inference
        const features = await extractFeaturesV1(
          {
            amount: txn.amount,
            payee_id: txn.payee_id,
            intent_type: txn.intent_type
          },
          user,
          payeeRel,
          txn.behavioral_signals || {}
        );

        // Convert feature object to array
        const featureArray = [
          features.amount_ratio,
          features.amount_zscore,
          features.is_new_payee,
          features.payee_trust_score,
          features.payee_payment_count,
          features.txn_frequency_recent,
          features.velocity_spike,
          features.time_deviation_score,
          features.is_unusual_hour,
          features.confirmation_time_ratio,
          features.hesitation_score,
          features.amount_edit_count_ratio,
          features.intent_risk_score,
          features.intent_direction_mismatch,
          features.user_maturity_flag,
          features.cooling_off_active,
          features.recent_warning_ignored,
          features.device_change_flag,
          features.account_age_days,
          features.transaction_count
        ];

        featureVectors.push(featureArray);
      } catch (error) {
        console.warn(`⚠️  Failed to extract features for transaction ${txn.transaction_id}:`, error.message);
        // Continue with other transactions
      }
    }

    console.log(`✅ Extracted ${featureVectors.length} feature vectors`);

    if (featureVectors.length < 5) {
      throw new Error(`Too few valid feature vectors: ${featureVectors.length} (need at least 5)`);
    }

    // Train new model with real data
    console.log('🧠 Training new Autoencoder model...');
    const Autoencoder = require('../ml/autoencoder');
    const fs = require('fs').promises;
    const path = require('path');

    const model = new Autoencoder(20, 10, 5);
    model.fit(featureVectors, {
      epochs: 100,
      learningRate: 0.01,
      batchSize: 32,
      verbose: true
    });
    console.log('✅ Autoencoder training completed (includes calibration)');

    // Save model
    const modelPath = path.join(__dirname, '../models/ml_model.json');
    await fs.writeFile(modelPath, JSON.stringify(model.toJSON(), null, 2));
    console.log(`✅ Model saved to ${modelPath}`);

    // Update retraining timestamp
    lastRetrainingTime = Date.now();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`🎉 Retraining completed in ${duration}s`);
    console.log(`📈 Training data: ${featureVectors.length} real transactions`);

    // Clear cached model in inference service to force reload
    const { initializeModel } = require('../ml/inferenceService');
    const inferenceService = require('../ml/inferenceService');
    inferenceService.cachedModel = null;
    inferenceService.cachedFeatureNames = null;

    return {
      retrained: true,
      duration: parseFloat(duration),
      trainingSize: featureVectors.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Retraining failed:', error);
    return {
      retrained: false,
      error: error.message
    };
  } finally {
    retrainingInProgress = false;
  }
}

/**
 * Schedule periodic retraining checks
 */
function startAutoRetrainingScheduler() {
  if (!RETRAINING_CONFIG.AUTO_RETRAIN_ENABLED) {
    console.log('⏸️  Auto-retraining scheduler disabled');
    return;
  }

  console.log('🔄 Starting auto-retraining scheduler...');
  console.log(`   - Minimum transactions: ${RETRAINING_CONFIG.MIN_TRANSACTIONS}`);
  console.log(`   - Check interval: ${RETRAINING_CONFIG.RETRAINING_INTERVAL / (60 * 60 * 1000)} hours`);

  // Check every hour
  const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

  setInterval(async () => {
    console.log('🔍 Checking if retraining is needed...');
    const result = await checkAndRetrain();
    
    if (result.retrained) {
      console.log('✅ Auto-retraining completed successfully');
    }
  }, CHECK_INTERVAL);

  // Also check on startup (after 5 minutes)
  setTimeout(async () => {
    console.log('🔍 Initial retraining check on startup...');
    await checkAndRetrain();
  }, 5 * 60 * 1000);
}

/**
 * Manually trigger retraining (for API endpoint)
 */
async function manualRetrain() {
  console.log('🔄 Manual retraining triggered...');
  return await retrainModel();
}

/**
 * Get retraining status
 */
function getRetrainingStatus() {
  return {
    enabled: RETRAINING_CONFIG.AUTO_RETRAIN_ENABLED,
    lastRetrainingTime: lastRetrainingTime ? new Date(lastRetrainingTime).toISOString() : null,
    inProgress: retrainingInProgress,
    config: RETRAINING_CONFIG
  };
}

module.exports = {
  checkAndRetrain,
  retrainModel,
  startAutoRetrainingScheduler,
  manualRetrain,
  getRetrainingStatus,
  RETRAINING_CONFIG
};
