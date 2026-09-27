/**
 * Feature Extraction Engine v1
 * 
 * Extracts the frozen v1 feature vector from transaction data.
 * This is the SINGLE SOURCE OF TRUTH for ML features.
 * 
 * Contract: docs/ML_CONTRACT_v1.md
 */

const User = require('../models/User');
const PayeeRelationship = require('../models/PayeeRelationship');
const Transaction = require('../models/Transaction');
const { getVelocityCount, getCoolingOffFlag } = require('../utils/redis');

/**
 * Extract v1 feature vector from transaction data
 * @param {Object} transactionData - Raw transaction data
 * @param {Object} user - User model instance
 * @param {Object} payeeRelationship - PayeeRelationship model instance or null
 * @param {Object} behavioralSignals - Behavioral signals object
 * @returns {Object} Feature vector matching v1 contract
 */
async function extractFeaturesV1(transactionData, user, payeeRelationship, behavioralSignals = {}) {
  const { amount, payee_id, intent_type } = transactionData;
  const now = new Date();
  const currentHour = now.getHours();
  
  // Feature 1: amount_ratio
  const amount_ratio = user.avg_transaction_amount > 0 
    ? amount / user.avg_transaction_amount 
    : amount > 0 ? 10.0 : 1.0; // First transaction: high ratio
  
  // Feature 2: amount_zscore (simplified - would need std dev in production)
  const amount_zscore = user.avg_transaction_amount > 0
    ? (amount - user.avg_transaction_amount) / Math.max(user.avg_transaction_amount * 0.5, 1)
    : 0;
  
  // Feature 3: is_new_payee
  const is_new_payee = payeeRelationship === null ? 1 : 0;
  
  // Feature 4: payee_trust_score
  const payee_trust_score = payeeRelationship ? payeeRelationship.trust_score : 0.0;
  
  // Feature 5: payee_payment_count
  const payee_payment_count = payeeRelationship ? (payeeRelationship.payment_count || payeeRelationship.total_transactions || 0) : 0;
  
  // Feature 6: txn_frequency_recent (transactions in last hour vs baseline)
  const recentTxnCount = await getRecentTransactionCount(user.user_id, 60); // Last 60 minutes
  const baselineFreq = user.transaction_count / Math.max(user.account_age_days * 24, 1); // Per hour baseline
  const txn_frequency_recent = baselineFreq > 0 ? recentTxnCount / baselineFreq : recentTxnCount;
  
  // Feature 7: velocity_spike
  const velocityCount = await getVelocityCount(user.user_id, 60);
  const velocity_spike = velocityCount > 5 ? 1 : 0;
  
  // Feature 8: time_deviation_score (simplified - would use user's historical times)
  const time_deviation_score = calculateTimeDeviation(currentHour, user);
  
  // Feature 9: is_unusual_hour
  const is_unusual_hour = (currentHour >= 0 && currentHour < 6) || (currentHour >= 22) ? 1 : 0;
  
  // Feature 10: confirmation_time_ratio
  const baselineConfirmation = 2000; // 2 seconds baseline (ms)
  const confirmation_time_ratio = behavioralSignals.confirmation_delay_ms 
    ? behavioralSignals.confirmation_delay_ms / baselineConfirmation 
    : 1.0;
  
  // Feature 11: hesitation_score (composite from behavioral signals)
  const hesitation_score = calculateHesitationScore(behavioralSignals);
  
  // Feature 12: amount_edit_count_ratio
  const baselineEdits = 1; // Normal: 1 edit
  const amount_edit_count_ratio = behavioralSignals.amount_edit_count 
    ? behavioralSignals.amount_edit_count / baselineEdits 
    : 1.0;
  
  // Feature 13: intent_risk_score
  const intent_risk_score = getIntentRiskScore(intent_type);
  
  // Feature 14: intent_direction_mismatch
  const intent_direction_mismatch = checkIntentMismatch(intent_type, amount, user) ? 1 : 0;
  
  // Feature 15: user_maturity_flag (0=NEW, 1=REGULAR, 2=HEAVY)
  const user_maturity_flag = user.user_maturity_flag === 'NEW' ? 0 
    : user.user_maturity_flag === 'REGULAR' ? 1 
    : 2;
  
  // Feature 16: cooling_off_active
  const cooling_off_active = await getCoolingOffFlag(user.user_id) ? 1 : 0;
  
  // Feature 17: recent_warning_ignored
  const recent_warning_ignored = await checkRecentWarningIgnored(user.user_id) ? 1 : 0;
  
  // Feature 18: device_change_flag (stubbed for Phase 2)
  const device_change_flag = 0;
  
  // Feature 19: account_age_days
  const account_age_days = user.account_age_days || 0;
  
  // Feature 20: transaction_count
  const transaction_count = user.transaction_count || 0;
  
  // Return feature vector in exact order per contract
  return {
    amount_ratio: parseFloat(amount_ratio.toFixed(4)),
    amount_zscore: parseFloat(amount_zscore.toFixed(4)),
    is_new_payee,
    payee_trust_score: parseFloat(payee_trust_score.toFixed(4)),
    payee_payment_count,
    txn_frequency_recent: parseFloat(txn_frequency_recent.toFixed(4)),
    velocity_spike,
    time_deviation_score: parseFloat(time_deviation_score.toFixed(4)),
    is_unusual_hour,
    confirmation_time_ratio: parseFloat(confirmation_time_ratio.toFixed(4)),
    hesitation_score: parseFloat(hesitation_score.toFixed(4)),
    amount_edit_count_ratio: parseFloat(amount_edit_count_ratio.toFixed(4)),
    intent_risk_score: parseFloat(intent_risk_score.toFixed(4)),
    intent_direction_mismatch,
    user_maturity_flag,
    cooling_off_active,
    recent_warning_ignored,
    device_change_flag,
    account_age_days,
    transaction_count
  };
}

/**
 * Get recent transaction count for user
 */
async function getRecentTransactionCount(userId, minutes) {
  try {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const count = await Transaction.countDocuments({
      user_id: userId,
      createdAt: { $gte: cutoffTime }
    });
    return count;
  } catch (error) {
    return 0;
  }
}

/**
 * Calculate time deviation score
 */
function calculateTimeDeviation(currentHour, user) {
  // Simplified: assume normal hours are 8-20
  // In production, would use user's historical transaction times
  if (currentHour >= 8 && currentHour < 20) {
    return 0.0; // Normal hours
  } else if (currentHour >= 6 && currentHour < 8) {
    return 0.3; // Early morning
  } else if (currentHour >= 20 && currentHour < 22) {
    return 0.2; // Evening
  } else {
    return 0.8; // Late night/early morning
  }
}

/**
 * Calculate composite hesitation score
 */
function calculateHesitationScore(behavioralSignals) {
  if (!behavioralSignals) return 0.0;
  
  let score = 0.0;
  
  // Hesitation time component (0-0.5)
  if (behavioralSignals.hesitation_time_ms) {
    const hesitationNormalized = Math.min(behavioralSignals.hesitation_time_ms / 10000, 1.0);
    score += hesitationNormalized * 0.5;
  }
  
  // Amount edits component (0-0.3)
  if (behavioralSignals.amount_edit_count) {
    const editsNormalized = Math.min(behavioralSignals.amount_edit_count / 10, 1.0);
    score += editsNormalized * 0.3;
  }
  
  // Confirmation delay component (0-0.2)
  if (behavioralSignals.confirmation_delay_ms) {
    const delayNormalized = Math.min(behavioralSignals.confirmation_delay_ms / 10000, 1.0);
    score += delayNormalized * 0.2;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Get inherent risk score for intent type
 */
function getIntentRiskScore(intent_type) {
  const riskScores = {
    'purchase': 0.5,
    'refund': 0.7,  // Higher risk - less common
    'receive': 0.3, // Lower risk - receiving money
    'support': 0.4  // Support transactions
  };
  return riskScores[intent_type] || 0.5;
}

/**
 * Check if intent direction mismatches transaction pattern
 */
function checkIntentMismatch(intent_type, amount, user) {
  // Simplified heuristic: large purchases are more suspicious
  if (intent_type === 'purchase' && amount > 50000) {
    return true;
  }
  // Could add more sophisticated pattern matching here
  return false;
}

/**
 * Check if user ignored recent warnings
 */
async function checkRecentWarningIgnored(userId) {
  try {
    const recentWarnings = await Transaction.find({
      user_id: userId,
      action: 'WARN',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ createdAt: -1 }).limit(3);
    
    // Check if user proceeded after warnings
    for (const txn of recentWarnings) {
      if (txn.user_feedback && txn.user_feedback.user_action === 'PROCEEDED') {
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

module.exports = {
  extractFeaturesV1
};
