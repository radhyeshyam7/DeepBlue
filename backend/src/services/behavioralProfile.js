/**
 * BEHAVIORAL PROFILE SERVICE
 * 
 * Maintains rolling user-level behavioral aggregates using exponential moving average.
 * 
 * EXPONENTIAL MOVING AVERAGE (EMA) FORMULA:
 * EMA_new = α × current_value + (1 - α) × EMA_old
 * 
 * Benefits:
 * - O(1) storage complexity (not O(n) history)
 * - Resistant to single outliers
 * - Recent transactions weighted more heavily
 * - Converges to user pattern after 10-15 transactions
 * 
 * EXAMPLE EVOLUTION:
 * User makes 5 transactions with confirmation times: [2000, 2100, 2050, 10000, 2200]
 * (α = 0.3)
 * 
 * Txn 1: avg = 2000ms (initialized)
 * Txn 2: avg = 0.3×2100 + 0.7×2000 = 2030ms
 * Txn 3: avg = 0.3×2050 + 0.7×2030 = 2036ms
 * Txn 4: avg = 0.3×10000 + 0.7×2036 = 4425ms ← spike
 * Txn 5: avg = 0.3×2200 + 0.7×4425 = 3757ms ← recovering
 * Txn 6: avg = 0.3×2150 + 0.7×3757 = 3262ms ← back to normal
 * 
 * Notice: Outlier affects 2-3 transactions, then decays naturally.
 */

const User = require('../models/User');

const ALPHA = 0.3;  // EMA smoothing factor
const PERCENTILE_WINDOW = 10;  // Keep last 10 values for p75 calculation

/**
 * Get or create user behavioral profile
 */
async function buildUserProfile(userId) {
  let user = await User.findOne({ user_id: userId });
  if (!user) {
    // Create default new user profile
    user = new User({
      user_id: userId,
      account_created_at: new Date(),
      total_transactions: 0,
      user_type: 'NEW',
      behavioral_profile: {
        confirmation_time_avg_ms: 0,
        confirmation_time_p75_ms: 0,
        amount_edit_count_avg: 0,
        hesitation_score_baseline: 0,
        transactions_with_high_hesitation: 0,
        high_hesitation_threshold: 0.65,
        avg_interaction_time_ms: 0,
        last_10_confirmation_times: [],
        sample_count: 0,
        last_update_at: new Date()
      },
      transaction_stats: {
        avg_transaction_amount: 0,
        median_transaction_amount: 0,
        max_transaction_amount: 0,
        transactions_per_day_avg: 0,
        transactions_per_week_avg: 0,
        preferred_transaction_hours: []
      }
    });
    await user.save();
  }

  // Compute account age
  if (user.computeAccountAge) {
    user.computeAccountAge();
  }

  // Build profile object with all required behavioral features
  const profile = {
    user_id: userId,
    
    // --- IDENTITY & MATURITY ---
    account_created_at: user.account_created_at,
    account_age_days: user.account_age_days,
    total_transactions: user.total_transactions,
    user_type: user.user_type,
    cooling_off_enabled: user.cooling_off_enabled,
    risk_sensitivity_level: user.risk_sensitivity_level,
    
    // --- BEHAVIORAL BASELINES (NEW) ---
    behavioral_baselines: {
      confirmation_time_avg_ms: user.behavioral_profile?.confirmation_time_avg_ms || 0,
      confirmation_time_p75_ms: user.behavioral_profile?.confirmation_time_p75_ms || 0,
      amount_edit_count_avg: user.behavioral_profile?.amount_edit_count_avg || 0,
      hesitation_score_baseline: user.behavioral_profile?.hesitation_score_baseline || 0,
      avg_interaction_time_ms: user.behavioral_profile?.avg_interaction_time_ms || 0,
      sample_count: user.behavioral_profile?.sample_count || 0
    },
    vulnerability_score: (typeof user.getVulnerabilityScore === 'function') ? user.getVulnerabilityScore() : (user.vulnerability_score || 0.2),
    
    // --- TRANSACTION BEHAVIOR STATISTICS ---
    transaction_stats: user.transaction_stats || {
      avg_transaction_amount: 0,
      median_transaction_amount: 0,
      max_transaction_amount: 0,
      transactions_per_day_avg: 0,
      transactions_per_week_avg: 0,
      preferred_transaction_hours: []
    },
    
    // --- PAYEE RELATIONSHIP MEMORY ---
    unique_payees_count: user.payee_stats?.unique_payees_count || 0,
    
    // --- TRANSACTION CONTEXT (RECENT WINDOW) ---
    last_transaction_time: user.context?.last_transaction_time,
    recent_transactions_count_24h: user.context?.recent_transactions_count_24h || 0,
    recent_transactions_sum_24h: user.context?.recent_transactions_sum_24h || 0,
    
    // --- BEHAVIORAL INTERACTION SIGNALS ---
    behavioral_signals: user.behavioral_signals || {
      avg_confirmation_time_ms: 0,
      last_confirmation_time_ms: null,
      amount_edit_count_avg: 0,
      hesitation_score_recent: 0
    },
    
    // --- INTENT & OUTCOME HISTORY ---
    intent_history: user.intent_history || {
      last_selected_intent: null,
      intent_mismatch_count: 0,
      flagged_transaction_count: 0,
      canceled_flagged_transactions: 0,
      ignored_warnings_count: 0,
      last_warning_time: null
    },
    
    // --- DEVICE & CONTEXT ---
    device_context: user.device_context || {
      known_devices: [],
      last_device_id: null,
      usual_region: null
    }
  };

  return profile;
}

/**
 * Get payee relationship for a user.
 * Returns trust score, payment history, and risk classification.
 */
async function getPayeeProfile(userId, payeeId) {
  let relationship = await PayeeRelationship.findOne({ user_id: userId, payee_id: payeeId });
  
  if (!relationship) {
    // New payee (never transacted with)
    return {
      payee_id: payeeId,
      payment_count: 0,
      first_payment_time: null,
      last_payment_time: null,
      trust_score: 0,
      days_since_first_payment: 0,
      is_one_time: true,
      risk_level: 'UNKNOWN'
    };
  }

  return {
    payee_id: payeeId,
    payment_count: relationship.payment_count,
    first_payment_time: relationship.first_payment_time,
    last_payment_time: relationship.last_payment_time,
    trust_score: relationship.trust_score,
    days_since_first_payment: relationship.days_since_first_payment,
    is_one_time: relationship.is_one_time,
    risk_level: relationship.getPayeeRiskLevel()
  };
}

/**
 * Update user profile after transaction completion.
 * Called after a transaction is saved.
 */
async function updateUserProfileAfterTransaction(userId, amount, payeeId, intent, behavioralSignals) {
  const Transaction = require('../models/Transaction');
  const user = await User.findOne({ user_id: userId });
  if (!user) return;

  // Update transaction statistics (this increments total_transactions)
  user.updateTransactionStats(amount);

  // Update context (recent window)
  if (!user.context) user.context = {};
  user.context.last_transaction_time = new Date();
  
  // Track recent transactions (24h window)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentTxns = await Transaction.countDocuments({
    user_id: userId,
    createdAt: { $gte: oneDayAgo }
  });
  user.context.recent_transactions_count_24h = recentTxns;
  
  const recentSum = await Transaction.aggregate([
    {
      $match: {
        user_id: userId,
        createdAt: { $gte: oneDayAgo }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);
  user.context.recent_transactions_sum_24h = recentSum[0]?.total || 0;

  // Update behavioral signals from frontend data
  if (behavioralSignals) {
    if (!user.behavioral_signals) user.behavioral_signals = {};
    
    if (behavioralSignals.confirmation_delay_ms !== undefined) {
      const signals = user.behavioral_signals;
      const oldAvg = signals.avg_confirmation_time_ms || 0;
      signals.last_confirmation_time_ms = behavioralSignals.confirmation_delay_ms;
      // Update moving average
      signals.avg_confirmation_time_ms = (oldAvg + behavioralSignals.confirmation_delay_ms) / 2;
    }
    
    if (behavioralSignals.amount_edit_count !== undefined) {
      const signals = user.behavioral_signals;
      const oldAvg = signals.amount_edit_count_avg || 0;
      signals.amount_edit_count_avg = (oldAvg + behavioralSignals.amount_edit_count) / 2;
    }
  }

  // Update intent history
  if (!user.intent_history) user.intent_history = {};
  user.intent_history.last_selected_intent = intent;

  // Update payee stats
  if (!user.payee_stats) user.payee_stats = {};
  const PayeeRelationship = require('../models/PayeeRelationship');
  const uniquePayees = await PayeeRelationship.distinct('payee_id', { user_id: userId });
  user.payee_stats.unique_payees_count = uniquePayees.length;

  await user.save();
  
  console.log(`✅ User profile updated: ${userId} - Total transactions: ${user.total_transactions}, User type: ${user.user_type}`);
}

/**
 * UPDATE BEHAVIORAL PROFILE WITH EMA
 * 
 * Call after each completed transaction
 * Updates rolling averages for:
 * - Confirmation time
 * - Amount edit count
 * - Hesitation score
 * - Interaction time
 */
async function updateBehavioralProfile(user_id, signals) {
  try {
    if (!signals || typeof signals !== 'object') {
      console.warn(`[${user_id}] Invalid signals object`);
      return null;
    }

    let user = await User.findOne({ user_id });
    if (!user) {
      console.warn(`[${user_id}] User not found`);
      return null;
    }

    if (!user.behavioral_profile) {
      user.behavioral_profile = {
        confirmation_time_avg_ms: 0,
        confirmation_time_p75_ms: 0,
        amount_edit_count_avg: 0,
        hesitation_score_baseline: 0,
        transactions_with_high_hesitation: 0,
        high_hesitation_threshold: 0.65,
        avg_interaction_time_ms: 0,
        last_10_confirmation_times: [],
        sample_count: 0,
        last_update_at: new Date()
      };
    }

    const profile = user.behavioral_profile;

    // ========================================
    // 1. UPDATE CONFIRMATION TIME (EMA)
    // ========================================
    const confirmationTime = Math.max(0, signals.confirmation_delay_ms || 0);
    const newConfirmationAvg = 
      ALPHA * confirmationTime + 
      (1 - ALPHA) * profile.confirmation_time_avg_ms;
    
    profile.confirmation_time_avg_ms = newConfirmationAvg;

    // Track last N confirmation times for percentile
    profile.last_10_confirmation_times.push(confirmationTime);
    if (profile.last_10_confirmation_times.length > PERCENTILE_WINDOW) {
      profile.last_10_confirmation_times.shift();
    }

    // Calculate 75th percentile
    if (profile.last_10_confirmation_times.length > 0) {
      const sorted = [...profile.last_10_confirmation_times].sort((a, b) => a - b);
      const p75Index = Math.ceil(sorted.length * 0.75) - 1;
      profile.confirmation_time_p75_ms = sorted[Math.max(0, p75Index)];
    }

    console.log(`[${user_id}] Confirmation: ${confirmationTime}ms → avg: ${Math.round(profile.confirmation_time_avg_ms)}ms, p75: ${Math.round(profile.confirmation_time_p75_ms)}ms`);

    // ========================================
    // 2. UPDATE AMOUNT EDIT COUNT (EMA)
    // ========================================
    const editCount = Math.max(0, signals.amount_edit_count || 0);
    profile.amount_edit_count_avg = 
      ALPHA * editCount + 
      (1 - ALPHA) * profile.amount_edit_count_avg;

    console.log(`[${user_id}] Edit count: ${editCount} → avg: ${profile.amount_edit_count_avg.toFixed(2)}`);

    // ========================================
    // 3. UPDATE HESITATION SCORE BASELINE (EMA)
    // ========================================
    const hesitationScore = Math.max(0, Math.min(1, signals.hesitation_score || 0));
    const newHesitationBaseline = 
      ALPHA * hesitationScore + 
      (1 - ALPHA) * profile.hesitation_score_baseline;
    
    profile.hesitation_score_baseline = newHesitationBaseline;

    // Track high-hesitation transactions
    if (hesitationScore > profile.high_hesitation_threshold) {
      profile.transactions_with_high_hesitation += 1;
    }

    console.log(`[${user_id}] Hesitation: ${hesitationScore.toFixed(3)} → baseline: ${profile.hesitation_score_baseline.toFixed(3)}`);

    // ========================================
    // 4. UPDATE INTERACTION TIME (EMA)
    // ========================================
    const interactionTime = Math.max(0, signals.total_interaction_time_ms || 0);
    profile.avg_interaction_time_ms = 
      ALPHA * interactionTime + 
      (1 - ALPHA) * profile.avg_interaction_time_ms;

    console.log(`[${user_id}] Interaction: ${interactionTime}ms → avg: ${Math.round(profile.avg_interaction_time_ms)}ms`);

    // ========================================
    // 5. SAMPLE COUNT & TIMESTAMP
    // ========================================
    profile.sample_count = (profile.sample_count || 0) + 1;
    profile.last_update_at = new Date();

    console.log(`[${user_id}] Profile updated (transaction #${profile.sample_count})\n`);

    await user.save();

    return {
      user_id,
      sample_count: profile.sample_count,
      baselines: {
        confirmation_time_avg_ms: Math.round(profile.confirmation_time_avg_ms),
        confirmation_time_p75_ms: Math.round(profile.confirmation_time_p75_ms),
        amount_edit_count_avg: profile.amount_edit_count_avg.toFixed(2),
        hesitation_score_baseline: profile.hesitation_score_baseline.toFixed(3),
        avg_interaction_time_ms: Math.round(profile.avg_interaction_time_ms)
      }
    };
  } catch (error) {
    console.error('Error updating behavioral profile:', error);
    return null;
  }
}

/**
 * GET BASELINE FOR COMPARISON
 */
async function getBehavioralBaseline(user_id) {
  try {
    const user = await User.findOne({ user_id });
    if (!user || !user.behavioral_profile) {
      return null;
    }

    const profile = user.behavioral_profile;
    if (profile.sample_count === 0) {
      return null;
    }

    return {
      confirmation_time_avg_ms: profile.confirmation_time_avg_ms,
      confirmation_time_p75_ms: profile.confirmation_time_p75_ms,
      amount_edit_count_avg: profile.amount_edit_count_avg,
      hesitation_score_baseline: profile.hesitation_score_baseline,
      avg_interaction_time_ms: profile.avg_interaction_time_ms,
      sample_count: profile.sample_count,
      high_hesitation_transactions: profile.transactions_with_high_hesitation
    };
  } catch (error) {
    console.error('Error getting behavioral baseline:', error);
    return null;
  }
}

/**
 * CALCULATE HESITATION DEVIATION
 * 
 * Compares current hesitation against user baseline
 * Returns score 0-1 where:
 * - 0: Not unusual
 * - 0.5: Moderately elevated
 * - 1: Severely elevated
 */
function calculateHesitationDeviation(currentHesitation, userBaseline, sampleCount = 1) {
  // New user - use absolute thresholds
  if (sampleCount === 0 || userBaseline === 0) {
    if (currentHesitation > 0.65) return 0.8;
    if (currentHesitation > 0.35) return 0.4;
    return 0;
  }

  // Established user - relative deviation
  const deviationRatio = (currentHesitation - userBaseline) / userBaseline;

  if (deviationRatio < 0) return 0;           // Below baseline
  if (deviationRatio < 0.5) return 0.2;       // 0-50% above
  if (deviationRatio < 1.0) return 0.5;       // 50-100% above
  if (deviationRatio < 2.0) return 0.75;      // 100-200% above
  return Math.min(1.0, 0.9);                  // >200% above
}

/**
 * UPDATE PAYEE RELATIONSHIP
 */
async function updatePayeeRelationship(userId, payeeId) {
  const PayeeRelationship = require('../models/PayeeRelationship');
  let relationship = await PayeeRelationship.findOne({ user_id: userId, payee_id: payeeId });
  
  if (!relationship) {
    relationship = new PayeeRelationship({
      user_id: userId,
      payee_id: payeeId,
      payment_count: 0,
      trust_score: 0
    });
  }

  if (relationship.updateAfterTransaction) {
    relationship.updateAfterTransaction();
  }
  await relationship.save();
}

module.exports = {
  buildUserProfile,
  getPayeeProfile,
  updateUserProfileAfterTransaction,
  updatePayeeRelationship,
  updateBehavioralProfile,
  getBehavioralBaseline,
  calculateHesitationDeviation,
  ALPHA,
  PERCENTILE_WINDOW
};
