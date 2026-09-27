const mongoose = require('mongoose');

/**
 * PayeeRelationship Model
 * 
 * Stores per-user payee relationship data without raw transaction logs.
 * Fields are aggregated statistics only (avg, max, count, etc.)
 */
const payeeRelationshipSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    index: true
  },
  payee_id: {
    type: String,
    required: true
  },
  
  // --- IDENTITY ---
  payee_name: String,
  payee_type: {
    type: String,
    enum: ['INDIVIDUAL', 'MERCHANT', 'BUSINESS'],
    default: 'INDIVIDUAL'
  },
  first_seen_date: {
    type: Date,
    default: Date.now
  },
  last_transaction_date: {
    type: Date,
    default: Date.now
  },
  
  // --- TRANSACTION STATS (NO raw logs, only aggregates) ---
  total_transactions: {
    type: Number,
    default: 0
  },
  failed_transactions: {
    type: Number,
    default: 0
  },
  total_amount_sent: {
    type: Number,
    default: 0
  },
  avg_amount: {
    type: Number,
    default: 0
  },
  max_amount: {
    type: Number,
    default: 0
  },
  min_amount: {
    type: Number,
    default: 0
  },
  
  // --- TRUST METRICS ---
  trust_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  days_since_first_transaction: {
    type: Number,
    default: 0
  },
  consecutive_successful: {
    type: Number,
    default: 0
  },
  intent_mismatch_count: {
    type: Number,
    default: 0
  },
  blocked_count: {
    type: Number,
    default: 0
  },
  
  // --- RELATIONSHIP CLASSIFICATION ---
  is_new_payee: {
    type: Boolean,
    default: true
  },
  is_one_time: {
    type: Boolean,
    default: true
  },
  is_recurring: {
    type: Boolean,
    default: false
  },
  relationship_duration_days: {
    type: Number,
    default: 0
  },
  
  // --- BEHAVIORAL SIGNALS ---
  typical_amount_range: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    median: { type: Number, default: 0 }
  },
  typical_day_of_week: String,
  typical_time_hour: Number,
  risk_flags: [String],
  
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
payeeRelationshipSchema.index({ user_id: 1, payee_id: 1 }, { unique: true });
payeeRelationshipSchema.index({ user_id: 1, trust_score: -1 });

/**
 * Calculate trust score based on transaction history
 * Range: 0-10
 */
payeeRelationshipSchema.methods.calculateTrustScore = function() {
  const {
    total_transactions,
    failed_transactions,
    blocked_count,
    days_since_first_transaction
  } = this;

  // Base score (0-3)
  let baseScore = 0;
  if (failed_transactions > 0 || blocked_count > 2) {
    baseScore = 1;
  } else if (total_transactions >= 10) {
    baseScore = 2.5;
  } else if (total_transactions >= 5) {
    baseScore = 2;
  } else if (total_transactions >= 2) {
    baseScore = 1.5;
  }

  // Success bonus (0-2)
  const successRate = total_transactions / (total_transactions + failed_transactions || 1);
  let successBonus = 0;
  if (successRate >= 0.95) successBonus = 2;
  else if (successRate >= 0.9) successBonus = 1.5;
  else if (successRate >= 0.8) successBonus = 1;
  else successBonus = 0.5;

  // Duration bonus (0-2)
  let durationBonus = 0;
  if (days_since_first_transaction >= 180) durationBonus = 2;
  else if (days_since_first_transaction >= 90) durationBonus = 1.5;
  else if (days_since_first_transaction >= 30) durationBonus = 1;

  // Blocking penalty (0.5-1.0)
  let blockingPenalty = 1.0;
  if (blocked_count >= 3) blockingPenalty = 0.5;
  else if (blocked_count >= 2) blockingPenalty = 0.7;
  else if (blocked_count >= 1) blockingPenalty = 0.85;

  const trustScore = Math.min(
    (baseScore + successBonus + durationBonus) * blockingPenalty,
    10
  );

  this.trust_score = trustScore;
  return trustScore;
};

/**
 * Get trust level classification
 */
payeeRelationshipSchema.methods.getTrustLevel = function() {
  const score = this.trust_score;
  
  if (score <= 0) return 'UNKNOWN';
  if (score < 1) return 'NEW';
  if (score < 3) return 'LOW_TRUST';
  if (score < 6) return 'MEDIUM_TRUST';
  return 'HIGH_TRUST';
};

/**
 * Get payee risk level
 */
payeeRelationshipSchema.methods.getPayeeRiskLevel = function() {
  return this.getTrustLevel();
};

/**
 * Check if payee is new (< 30 days OR < 3 successful transactions)
 * 
 * A payee is considered "new" if:
 * - Less than 30 days since first transaction, OR
 * - Less than 3 successful transactions
 * 
 * This ensures that even if a user makes multiple transactions to the same
 * payee on the same day, after 3 successful transactions the payee is no longer "new"
 */
payeeRelationshipSchema.methods.isNewPayee = function() {
  if (this.total_transactions === 0) return true;
  
  // Consider both time AND transaction count
  const daysSinceFirst = this.days_since_first_transaction || 0;
  const successfulTxns = this.total_transactions - this.failed_transactions;
  
  // New if less than 30 days AND less than 3 successful transactions
  return daysSinceFirst < 30 && successfulTxns < 3;
};

/**
 * Check if payee is one-time
 */
payeeRelationshipSchema.methods.isOneTimePayee = function() {
  return this.total_transactions === 1;
};

/**
 * Check if payee is recurring
 */
payeeRelationshipSchema.methods.isRecurringPayee = function() {
  return this.is_recurring || this.total_transactions >= 3;
};

/**
 * Detect risk patterns
 */
payeeRelationshipSchema.methods.detectRiskPatterns = function() {
  const risks = [];

  // High block rate
  if (this.blocked_count >= 3) {
    risks.push('high_block_rate');
  }

  // Intent mismatches
  if (this.intent_mismatch_count >= 2) {
    risks.push('intent_pattern_inconsistency');
  }

  // Amount deviations
  if (this.max_amount > (this.avg_amount * 3)) {
    risks.push('extreme_amount_variance');
  }

  // Low success rate
  const successRate = this.total_transactions / (this.total_transactions + this.failed_transactions || 1);
  if (successRate < 0.7) {
    risks.push('low_success_rate');
  }

  return risks;
};

module.exports = mongoose.model('PayeeRelationship', payeeRelationshipSchema);

