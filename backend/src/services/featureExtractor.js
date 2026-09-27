/**
 * featureExtractor.js
 * 
 * FEATURE EXTRACTION ENGINE
 * 
 * Converts transaction context + user memory into risk features.
 * Maps 6 scam-detection QUESTIONS to measurable FEATURES.
 * 
 * Questions → Features:
 * Q1: "Do I know this person?" → payee.is_new_payee, payee.trust_score
 * Q2: "Is this amount too high?" → amount.is_largest_ever, amount_vs_avg_ratio
 * Q3: "Why the rush?" → time_urgency.rapid_succession, confirmation_faster_than_baseline
 * Q4: "What are you sending money for?" → intent.intent_mismatch, is_risky_intent
 * Q5: "Am I hesitating?" → hesitation.excessive_edits, unusual_hesitation
 * Q6: "Can I afford to lose this?" → vulnerability.is_new_user, vulnerability_score
 */

const { buildUserProfile, getPayeeProfile } = require('./behavioralProfile');
const { extractPayeeFeatures } = require('./payeeRelationshipService');

/**
 * QUESTION-TO-FEATURE MAPPING
 * 
 * Each scam-detection question is answered by multiple features:
 */
const QUESTION_MAPPING = {
  Q1_KNOW_PERSON: {
    question: "Do I know this person?",
    features: [
      'payee.is_new_payee',
      'payee.payee_trust_score',
      'payee.payee_is_individual',
      'payee.is_one_time',
      'payee.is_recurring'
    ]
  },
  Q2_AMOUNT_TOO_HIGH: {
    question: "Is this amount too high for me?",
    features: [
      'amount.is_largest_ever',
      'amount.amount_vs_avg_ratio',
      'amount.is_multiple_of_avg',
      'amount.near_max'
    ]
  },
  Q3_WHY_RUSH: {
    question: "Why the rush? Is someone pressuring me?",
    features: [
      'time_urgency.rapid_succession',
      'time_urgency.confirmation_faster_than_baseline',
      'time_urgency.is_unusual_hour',
      'time_urgency.recent_tx_count_24h'
    ]
  },
  Q4_WHY_SEND: {
    question: "What am I sending money for?",
    features: [
      'intent.intent_mismatch',
      'intent.is_risky_intent',
      'intent.is_refund',
      'intent.intent_mismatch_count'
    ]
  },
  Q5_HESITATING: {
    question: "Am I hesitating? Does something feel off?",
    features: [
      'hesitation.excessive_edits',
      'hesitation.unusual_hesitation',
      'hesitation.amount_edit_count',
      'hesitation.confirmation_delay_ms'
    ]
  },
  Q6_AFFORD_LOSS: {
    question: "Can I afford to lose this money?",
    features: [
      'vulnerability.is_new_user',
      'vulnerability.is_low_experience',
      'vulnerability.vulnerability_score',
      'vulnerability.ignored_warnings_count'
    ]
  }
};

/**
 * Extract all features for a transaction.
 * Returns a comprehensive feature vector for risk evaluation.
 * 
 * @param {string} userId
 * @param {object} transactionData { amount, payee_id, intent_type, timestamp? }
 * @param {object} behavioralSignals { amount_edit_count, confirmation_delay_ms, ... }
 * @returns {object} { features, userProfile, metadata }
 */
async function extractTransactionFeatures(userId, transactionData, behavioralSignals) {
  const {
    amount,
    payee_id,
    intent_type,
    timestamp = new Date()
  } = transactionData;

  // Get user behavioral profile
  const userProfile = await buildUserProfile(userId);

  // Get payee features from payee relationship service
  const payeeFeatures = await extractPayeeFeatures(userId, payee_id);

  // Extract all feature categories
  const features = {};

  // --- CATEGORY 1: PAYEE-BASED FEATURES ---
  // Answers Q1: "Do I know this person?"
  features.payee = {
    // Core: Is this payee new to me?
    is_new_payee: payeeFeatures.is_new_payee,
    
    // Derived: How much do I trust this payee? (0-10)
    payee_trust_score: payeeFeatures.payee_trust_score,
    
    // Characteristic: Is this person (vs business)?
    payee_is_individual: payeeFeatures.payee_is_individual,
    
    // History: Have I paid them before?
    is_one_time: payeeFeatures.is_one_time,
    is_recurring: payeeFeatures.is_recurring,
    
    // Baseline: What do I normally send to this payee?
    avg_payee_amount: payeeFeatures.avg_payee_amount,
    
    // Pattern: Has this payee been blocked/flagged before?
    payee_blocked_count: payeeFeatures.payee_blocked_count,
    
    // Risk: What patterns trigger warnings with this payee?
    payee_risk_patterns: payeeFeatures.payee_risk_patterns || []
  };

  // --- CATEGORY 2: AMOUNT-BASED FEATURES ---
  // Answers Q2: "Is this amount too high for me?"
  const stats = userProfile.transaction_stats;
  features.amount = {
    // Raw: How much am I sending?
    amount_value: amount,
    
    // User Baseline: What's my typical transaction?
    user_avg_amount: stats.avg_transaction_amount,
    user_max_amount: stats.max_transaction_amount,
    user_median_amount: stats.median_transaction_amount,
    
    // Deviation: How different is this from my baseline?
    amount_vs_avg_ratio: stats.avg_transaction_amount > 0 ? amount / stats.avg_transaction_amount : 1,
    amount_vs_max_ratio: stats.max_transaction_amount > 0 ? amount / stats.max_transaction_amount : 1,
    
    // Risk Flags: Is this amount unusual for me?
    is_largest_ever: amount > stats.max_transaction_amount,
    is_multiple_of_avg: stats.avg_transaction_amount > 0 && amount > (stats.avg_transaction_amount * 3),
    near_max: amount > (stats.max_transaction_amount * 0.8)
  };

  // --- CATEGORY 3: TIME & URGENCY FEATURES ---
  // Answers Q3: "Why the rush? Is someone pressuring me?"
  const hour = new Date(timestamp).getHours();
  const preferredHours = userProfile.transaction_stats.preferred_transaction_hours || [];
  
  features.time_urgency = {
    // Raw: When am I sending this?
    transaction_hour: hour,
    
    // Pattern: Is this an unusual time for me?
    is_unusual_hour: !preferredHours.includes(hour) && preferredHours.length > 0,
    is_night_time: hour >= 20 || hour <= 2,
    
    // Velocity: Am I sending multiple transactions rapidly?
    recent_tx_count_24h: userProfile.recent_transactions_count_24h,
    rapid_succession: userProfile.recent_transactions_count_24h > 3,
    
    // Speed: Am I confirming faster than usual? (scam pressure indicator)
    last_confirmation_time_ms: userProfile.behavioral_signals.last_confirmation_time_ms,
    confirmation_faster_than_baseline: 
      userProfile.behavioral_signals.last_confirmation_time_ms < 
      (userProfile.behavioral_signals.avg_confirmation_time_ms * 0.7),
    
    // Frequency: How long since my last transaction?
    time_since_last_tx_seconds: userProfile.last_transaction_time 
      ? (timestamp - new Date(userProfile.last_transaction_time)) / 1000 
      : null
  };

  // --- CATEGORY 4: INTENT-BASED FEATURES ---
  // Answers Q4: "What am I sending money for?"
  features.intent = {
    // Raw: What's my stated purpose?
    selected_intent: intent_type,
    
    // History: What did I usually send for?
    last_selected_intent: userProfile.intent_history.last_selected_intent,
    
    // Consistency: Does this match my pattern?
    intent_mismatch: intent_type !== userProfile.intent_history.last_selected_intent,
    
    // Risk: Is this a high-scam-rate category?
    is_risky_intent: ['purchase', 'test'].includes(intent_type),
    is_refund: intent_type === 'refund',
    
    // History: Have I changed my mind about this intent before?
    intent_mismatch_count: userProfile.intent_history.intent_mismatch_count,
    flagged_tx_count: userProfile.intent_history.flagged_transaction_count
  };

  // --- CATEGORY 5: HESITATION & CONFUSION FEATURES ---
  // Answers Q5: "Am I hesitating? Does something feel off?"
  features.hesitation = {
    // Raw: How many times did I change the amount?
    amount_edit_count: behavioralSignals?.amount_edit_count || 0,
    amount_edit_count_avg: userProfile.behavioral_signals.amount_edit_count_avg,
    
    // Indicator: Excessive editing = confusion or second-guessing
    excessive_edits: (behavioralSignals?.amount_edit_count || 0) > 3,
    
    // Raw: How long did I pause before confirming?
    confirmation_delay_ms: behavioralSignals?.confirmation_delay_ms,
    avg_confirmation_ms: userProfile.behavioral_signals.avg_confirmation_time_ms,
    
    // Indicator: Long hesitation = doubt or pressure
    unusual_hesitation: 
      (behavioralSignals?.confirmation_delay_ms || 0) > 
      (userProfile.behavioral_signals.avg_confirmation_time_ms * 1.5),
    
    // Composite: Overall hesitation signal
    hesitation_score_recent: userProfile.behavioral_signals.hesitation_score_recent
  };

  // --- CATEGORY 6: USER VULNERABILITY FEATURES ---
  // Answers Q6: "Can I afford to lose this money?"
  features.vulnerability = {
    // Profile: Am I new to this platform?
    user_type: userProfile.user_type,
    account_age_days: userProfile.account_age_days,
    is_new_user: userProfile.user_type === 'NEW',
    
    // Experience: Do I have enough transaction history?
    is_low_experience: userProfile.total_transactions < 10,
    total_transactions: userProfile.total_transactions,
    
    // Settings: Have I enabled extra protections?
    cooling_off_enabled: userProfile.cooling_off_enabled,
    risk_sensitivity_level: userProfile.risk_sensitivity_level,
    
    // History: Have I been scammed before or ignored warnings?
    ignored_warnings_count: userProfile.intent_history.ignored_warnings_count,
    canceled_flagged_tx_count: userProfile.intent_history.canceled_flagged_transactions,
    
    // Composite: Overall vulnerability score (0-1)
    vulnerability_score: userProfile.vulnerability_score
  };

  return {
    user_id: userId,
    timestamp,
    features,
    userProfile,      // Include profile for reference
    metadata: {
      feature_count: Object.values(features).reduce((sum, cat) => sum + Object.keys(cat).length, 0),
      categories: Object.keys(features).length,
      question_mapping: QUESTION_MAPPING
    }
  };
}

module.exports = {
  extractTransactionFeatures,
  QUESTION_MAPPING
};
