const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  payee_id: {
    type: String,
    required: true
  },
  intent_type: {
    type: String,
    enum: ['refund', 'receive', 'purchase', 'support'],
    required: true
  },
  risk_level: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    required: true
  },
  action: {
    type: String,
    enum: ['ALLOW', 'WARN', 'DELAY'],
    required: true
  },
  reason_codes: [{
    type: String
  }],
  // Phase 2: ML Scoring Data
  risk_score: {
    type: Number
  },
  risk_score_100: {
    type: Number,
    min: 0,
    max: 100
  },
  fraud_reasons: [{
    type: String
  }],
  shap_percentage_bars: [{
    type: mongoose.Schema.Types.Mixed
  }],
  behavioral_comparison: {
    type: mongoose.Schema.Types.Mixed
  },
  ml_anomaly_score: {
    type: Number
  },
  ml_weight: {
    type: Number
  },
  rule_score: {
    type: Number
  },
  user_vulnerability_adjustment: {
    type: Number
  },
  ml_top_features: [{
    type: String
  }],
  feature_version: {
    type: String
  },
  // Post-transaction continuous feedback loop
  post_txn_feedback: {
    is_legitimate: Boolean,
    response: String,
    feedback_time: Date,
    notes: String
  },
  // Behavioral signals input from frontend
  behavioral_signals: {
    confirmation_time_ms: Number,        // Time user took to confirm
    amount_edit_count: Number,           // Edits before confirming
    hesitation_score: Number,            // Behavioral hesitation (0-1)
    device_id: String,                   // Device fingerprint
    ip_region: String                    // Region from IP
  },
  
  // Extracted features (6-category) for ML training
  features_vector: {
    // Payee features
    payee_is_new: Boolean,
    payee_trust_score: Number,
    payee_is_individual: Boolean,
    payee_one_time: Boolean,
    
    // Amount features
    amount_vs_avg_ratio: Number,
    amount_vs_max_ratio: Number,
    is_largest_ever: Boolean,
    is_multiple_of_avg: Boolean,
    near_max: Boolean,
    
    // Time features
    is_unusual_hour: Boolean,
    recent_tx_count_24h: Number,
    rapid_succession: Boolean,
    confirmation_faster_than_baseline: Boolean,
    
    // Intent features
    intent_mismatch: Boolean,
    is_risky_intent: Boolean,
    intent_mismatch_count: Number,
    is_refund: Boolean,
    
    // Hesitation features
    amount_edit_count: Number,
    excessive_edits: Boolean,
    unusual_hesitation: Boolean,
    
    // Vulnerability features
    is_new_user: Boolean,
    is_low_experience: Boolean,
    cooling_off_enabled: Boolean,
    vulnerability_score: Number
  },
  
  // Category-wise risk scores
  category_scores: {
    payee: Number,                       // 0-1 payee risk
    amount: Number,                      // 0-1 amount risk
    urgency: Number,                     // 0-1 time/urgency risk
    intent: Number,                      // 0-1 intent risk
    hesitation: Number,                  // 0-1 hesitation risk
    vulnerability: Number                // 0-1 vulnerability risk
  },
  
  // Explanation of risk decision
  explanation: String,                   // Human-readable risk summary
  
  // User feedback
  user_feedback: {
    feedback_type: String,               // CONFIRMED | WARNED_CONFIRMED | DELAYED_CONFIRMED
    user_action: {
      type: String,
      enum: ['PROCEEDED', 'CANCELLED']
    },
    feedback_time: Date,
    time_to_confirm_after_warning_ms: Number,  // If WARN was shown
    user_notes: String
  },
  
  // Payment details
  payment_status: {
    type: String,
    enum: ['INITIATED', 'CONFIRMED', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED'],
    default: 'INITIATED'
  },
  cashfree_order_id: String,
  
  // Nominee alert
  nominee_alerted: Boolean,
  nominee_approval: String,              // null | APPROVED | BLOCKED
  
  // ML feedback (ground truth)
  outcome: String,                       // LEGITIMATE | SCAM | SUSPICIOUS | UNKNOWN
  outcome_confirmed_at: Date,
  outcome_reason: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);

