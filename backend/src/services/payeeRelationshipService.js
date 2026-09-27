/**
 * payeeRelationshipService.js
 * 
 * Manages payee relationship updates and trust scoring
 * Called after each transaction to update payee records
 */

const PayeeRelationship = require('../models/PayeeRelationship');

/**
 * Detect payee type from transaction data
 */
function detectPayeeType(transactionData) {
  const { payee_name = '' } = transactionData;

  // Simple heuristics - can be enhanced
  if (payee_name.toLowerCase().includes('merchant') ||
    payee_name.toLowerCase().includes('store') ||
    payee_name.toLowerCase().includes('shop')) {
    return 'MERCHANT';
  }
  if (payee_name.toLowerCase().includes('company') ||
    payee_name.toLowerCase().includes('business') ||
    payee_name.toLowerCase().includes('inc')) {
    return 'BUSINESS';
  }

  return 'INDIVIDUAL';
}

/**
 * Update payee relationship after transaction
 * 
 * Called in POST /transaction/feedback when user action = 'PROCEEDED'
 * 
 * @param {string} userId
 * @param {string} payeeId
 * @param {object} transactionData { payee_name, amount }
 * @param {string} userAction 'PROCEEDED' | 'CANCELLED'
 * @param {boolean} intentMatched whether intent matched user's patterns
 * @param {boolean} wasBlocked whether transaction was blocked/delayed
 */
async function updatePayeeRelationship(
  userId,
  payeeId,
  transactionData,
  userAction = 'PROCEEDED',
  intentMatched = true,
  wasBlocked = false
) {
  try {
    // Find or create payee relationship record
    let payeeRecord = await PayeeRelationship.findOne({
      user_id: userId,
      payee_id: payeeId
    });

    if (!payeeRecord) {
      // NEW PAYEE: Create entry
      payeeRecord = new PayeeRelationship({
        user_id: userId,
        payee_id: payeeId,
        payee_name: transactionData.payee_name || 'Unknown',
        payee_type: detectPayeeType(transactionData),
        first_seen_date: new Date(),
        last_transaction_date: new Date(),

        total_transactions: 0,
        failed_transactions: 0,
        total_amount_sent: 0,
        avg_amount: 0,
        max_amount: 0,
        min_amount: Number.MAX_VALUE,

        trust_score: 0,
        days_since_first_transaction: 0,
        consecutive_successful: 0,
        intent_mismatch_count: 0,
        blocked_count: 0,

        is_new_payee: true,
        is_one_time: true,
        is_recurring: false,
        relationship_duration_days: 0,

        typical_amount_range: { min: 0, max: 0, median: 0 },
        typical_day_of_week: null,
        typical_time_hour: null,
        risk_flags: []
      });
    }

    const amount = transactionData.amount || 0;

    // UPDATE based on user action
    if (userAction === 'PROCEEDED') {
      payeeRecord.total_transactions += 1;
      payeeRecord.last_transaction_date = new Date();
      payeeRecord.consecutive_successful += 1;
    } else if (userAction === 'CANCELLED') {
      payeeRecord.failed_transactions += 1;
      payeeRecord.consecutive_successful = 0;
    }

    // UPDATE aggregates
    payeeRecord.total_amount_sent += amount;
    payeeRecord.avg_amount = Math.round(
      payeeRecord.total_amount_sent / payeeRecord.total_transactions
    );
    payeeRecord.max_amount = Math.max(payeeRecord.max_amount || 0, amount);
    payeeRecord.min_amount = Math.min(payeeRecord.min_amount || Number.MAX_VALUE, amount);

    // UPDATE relationship classification
    const daysSinceFirst = Math.floor(
      (Date.now() - new Date(payeeRecord.first_seen_date)) / (1000 * 60 * 60 * 24)
    );
    payeeRecord.days_since_first_transaction = daysSinceFirst;
    payeeRecord.relationship_duration_days = daysSinceFirst;

    // Update is_new_payee using the model method (considers both days AND transaction count)
    payeeRecord.is_new_payee = payeeRecord.isNewPayee();
    payeeRecord.is_one_time = payeeRecord.total_transactions === 1;
    payeeRecord.is_recurring = payeeRecord.total_transactions >= 3;

    // UPDATE intent mismatch count
    if (!intentMatched) {
      payeeRecord.intent_mismatch_count += 1;
    }

    // UPDATE blocked count
    if (wasBlocked) {
      payeeRecord.blocked_count += 1;
    }

    // UPDATE timing patterns
    const txnDate = new Date();
    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    payeeRecord.typical_day_of_week = daysOfWeek[txnDate.getDay()];
    payeeRecord.typical_time_hour = txnDate.getHours();

    // UPDATE trust score
    payeeRecord.calculateTrustScore();

    // UPDATE risk flags
    payeeRecord.risk_flags = payeeRecord.detectRiskPatterns();

    // Save
    await payeeRecord.save();

    return payeeRecord;
  } catch (error) {
    console.error('Error updating payee relationship:', error);
    throw error;
  }
}

/**
 * Get payee relationship for a user
 */
async function getPayeeRelationship(userId, payeeId) {
  try {
    const payeeRecord = await PayeeRelationship.findOne({
      user_id: userId,
      payee_id: payeeId
    });

    if (!payeeRecord) {
      return null; // New payee, no record yet
    }

    return {
      payee_id: payeeRecord.payee_id,
      payee_name: payeeRecord.payee_name,
      trust_score: payeeRecord.trust_score,
      trust_level: payeeRecord.getTrustLevel(),
      is_new_payee: payeeRecord.isNewPayee(),
      is_one_time: payeeRecord.isOneTimePayee(),
      is_recurring: payeeRecord.isRecurringPayee(),
      total_transactions: payeeRecord.total_transactions,
      avg_amount: payeeRecord.avg_amount,
      max_amount: payeeRecord.max_amount,
      blocked_count: payeeRecord.blocked_count,
      risk_flags: payeeRecord.risk_flags
    };
  } catch (error) {
    console.error('Error getting payee relationship:', error);
    throw error;
  }
}

/**
 * Extract features for risk engine from payee relationship
 */
async function extractPayeeFeatures(userId, payeeId) {
  try {
    const payeeRecord = await PayeeRelationship.findOne({
      user_id: userId,
      payee_id: payeeId
    });

    if (!payeeRecord) {
      // New payee, no history - truly never seen before
      return {
        is_new_payee: true,
        payee_trust_score: 0,
        payee_payment_count: 0,
        payee_is_individual: true,
        is_one_time: false,
        is_recurring: false,
        avg_payee_amount: 0,
        payee_blocked_count: 0,
        payee_risk_patterns: []
      };
    }

    return {
      is_new_payee: payeeRecord.isNewPayee(),
      payee_trust_score: payeeRecord.trust_score,
      payee_payment_count: payeeRecord.total_transactions,
      payee_is_individual: payeeRecord.payee_type === 'INDIVIDUAL',
      is_one_time: payeeRecord.isOneTimePayee(),
      is_recurring: payeeRecord.isRecurringPayee(),
      avg_payee_amount: payeeRecord.avg_amount,
      payee_blocked_count: payeeRecord.blocked_count,
      payee_risk_patterns: payeeRecord.detectRiskPatterns()
    };
  } catch (error) {
    console.error('Error extracting payee features:', error);
    throw error;
  }
}

/**
 * Get all payees for a user (for profile view)
 */
async function getUserPayees(userId, limit = 50) {
  try {
    const payees = await PayeeRelationship.find({ user_id: userId })
      .sort({ last_transaction_date: -1 })
      .limit(limit)
      .lean();

    return payees.map(p => ({
      payee_id: p.payee_id,
      payee_name: p.payee_name,
      payee_type: p.payee_type,
      trust_level: p.trust_score <= 0 ? 'UNKNOWN' :
        p.trust_score < 1 ? 'NEW' :
          p.trust_score < 3 ? 'LOW_TRUST' :
            p.trust_score < 6 ? 'MEDIUM_TRUST' : 'HIGH_TRUST',
      trust_score: p.trust_score,
      total_transactions: p.total_transactions,
      days_known: p.days_since_first_transaction,
      last_transaction: p.last_transaction_date,
      is_recurring: p.is_recurring
    }));
  } catch (error) {
    console.error('Error getting user payees:', error);
    throw error;
  }
}

module.exports = {
  updatePayeeRelationship,
  getPayeeRelationship,
  extractPayeeFeatures,
  getUserPayees
};
