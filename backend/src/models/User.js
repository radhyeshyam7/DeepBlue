const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // --- IDENTITY & MATURITY ---
  user_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String
  },
  email: {
    type: String
  },
  phone: {
    type: String
  },
  usage_context: {
    type: String,
    enum: ['personal', 'business', 'family'],
    default: 'personal'
  },
  account_created_at: {
    type: Date,
    required: true,
    default: Date.now
  },
  account_age_days: {
    type: Number,
    required: true,
    default: 0
  },
  total_transactions: {
    type: Number,
    required: true,
    default: 0
  },
  user_type: {
    type: String,
    enum: ['NEW', 'REGULAR', 'HEAVY'],
    default: 'NEW',
    index: true
  },
  user_maturity_flag: {
    // Alias for backward compatibility
    type: String,
    enum: ['NEW', 'REGULAR', 'HEAVY'],
    default: 'NEW'
  },
  cooling_off_enabled: {
    type: Boolean,
    default: false
  },
  risk_sensitivity_level: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },

  // --- TRANSACTION BEHAVIOR STATISTICS (CORE ML INPUT) ---
  transaction_stats: {
    avg_transaction_amount: {
      type: Number,
      default: 0
    },
    median_transaction_amount: {
      type: Number,
      default: 0
    },
    max_transaction_amount: {
      type: Number,
      default: 0
    },
    transactions_per_day_avg: {
      type: Number,
      default: 0
    },
    transactions_per_week_avg: {
      type: Number,
      default: 0
    },
    preferred_transaction_hours: {
      type: [Number], // 0-23 hours
      default: []
    },
    last_updated: {
      type: Date,
      default: Date.now
    }
  },

  // --- PAYEE RELATIONSHIP MEMORY (CRITICAL) ---
  payee_stats: {
    unique_payees_count: {
      type: Number,
      default: 0
    },
    last_updated: {
      type: Date,
      default: Date.now
    }
  },

  // --- TRANSACTION CONTEXT (RECENT WINDOW) ---
  context: {
    last_transaction_time: {
      type: Date
    },
    recent_transactions_count_24h: {
      type: Number,
      default: 0
    },
    recent_transactions_sum_24h: {
      type: Number,
      default: 0
    }
  },

  // --- BEHAVIORAL INTERACTION SIGNALS ---
  behavioral_signals: {
    avg_confirmation_time_ms: {
      type: Number,
      default: 0
    },
    last_confirmation_time_ms: {
      type: Number
    },
    amount_edit_count_avg: {
      type: Number,
      default: 0
    },
    hesitation_score_recent: {
      type: Number,
      default: 0, // 0-1
      min: 0,
      max: 1
    }
  },

  // --- INTENT & OUTCOME HISTORY (ANTI-OTP/QR SCAMS) ---
  intent_history: {
    last_selected_intent: {
      type: String
    },
    intent_mismatch_count: {
      type: Number,
      default: 0
    },
    flagged_transaction_count: {
      type: Number,
      default: 0
    },
    canceled_flagged_transactions: {
      type: Number,
      default: 0
    },
    ignored_warnings_count: {
      type: Number,
      default: 0
    },
    last_warning_time: {
      type: Date
    }
  },

  // --- DEVICE & CONTEXT (OPTIONAL) ---
  device_context: {
    known_devices: [{
      device_id: String,
      last_used: Date
    }],
    last_device_id: String,
    usual_region: String
  },

  // --- PHASE 2: ADAPTIVE THRESHOLDS (LEGACY) ---
  adaptive_thresholds: {
    low_threshold: {
      type: Number,
      default: 3
    },
    high_threshold: {
      type: Number,
      default: 6
    },
    ml_weight: {
      type: Number,
      default: 0.4,
      min: 0,
      max: 1
    },
    warnings_ignored_count: {
      type: Number,
      default: 0
    },
    last_updated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Nominee / Trusted contact fields (optional, opt-in)
userSchema.add({
  nominee: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String },
    enabled: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    // OTP for verification (demo only) and expiry
    otp_code: { type: String },
    otp_expiry: { type: Date },
    // Timestamp of last nominee alert sent (for cooldown enforcement)
    last_nominee_alert_at: { type: Date }
  },
  
  // PIN security
  pin_hash: { type: String },
  pin_set_at: { type: Date }
});

// Update user maturity based on transaction count
userSchema.methods.updateMaturity = function() {
  const count = this.total_transactions || 0;
  let newType;
  if (count < 5) {
    newType = 'NEW';
  } else if (count < 50) {
    newType = 'REGULAR';
  } else {
    newType = 'HEAVY';
  }
  this.user_type = newType;
  this.user_maturity_flag = newType; // backward compatibility
};

// Compute account age in days
userSchema.methods.computeAccountAge = function() {
  const now = new Date();
  const created = new Date(this.account_created_at);
  const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  this.account_age_days = days;
  return days;
};

// Update transaction statistics after a new transaction
userSchema.methods.updateTransactionStats = function(newAmount) {
  if (!this.transaction_stats) {
    this.transaction_stats = {
      avg_transaction_amount: 0,
      median_transaction_amount: 0,
      max_transaction_amount: 0,
      transactions_per_day_avg: 0,
      transactions_per_week_avg: 0,
      preferred_transaction_hours: []
    };
  }
  
  const stats = this.transaction_stats;
  const oldTotal = stats.avg_transaction_amount * this.total_transactions;
  this.total_transactions += 1;
  stats.avg_transaction_amount = (oldTotal + newAmount) / this.total_transactions;
  stats.max_transaction_amount = Math.max(stats.max_transaction_amount, newAmount);
  stats.last_updated = new Date();
  this.updateMaturity();
};

// Get user vulnerability score (0-1) for risk amplification
// NEW users and those with cooling_off_enabled are more vulnerable to scams
userSchema.methods.getVulnerabilityScore = function() {
  let score = 0;
  if (this.user_type === 'NEW') score += 0.5;
  if (this.cooling_off_enabled) score += 0.3;
  if (this.intent_history && this.intent_history.ignored_warnings_count > 3) score += 0.2;
  return Math.min(score, 1.0);
};

// Update user maturity based on transaction count
userSchema.methods.updateMaturity_OLD = function() {
  if (this.transaction_count < 5) {
    this.user_maturity_flag = 'NEW';
  } else if (this.transaction_count < 50) {
    this.user_maturity_flag = 'REGULAR';
  } else {
    this.user_maturity_flag = 'HEAVY';
  }
};

// Update average transaction amount (legacy method - replaced by updateTransactionStats)

userSchema.methods.updateAvgAmount = function(newAmount) {
  const totalAmount = (this.avg_transaction_amount * this.transaction_count) + newAmount;
  this.transaction_count += 1;
  this.avg_transaction_amount = totalAmount / this.transaction_count;
  this.updateMaturity();
};

// Phase 2: Update adaptive thresholds based on feedback
userSchema.methods.updateAdaptiveThresholds = function(warningIgnored) {
  if (!this.adaptive_thresholds) {
    this.adaptive_thresholds = {
      low_threshold: 3,
      high_threshold: 6,
      ml_weight: 0.4,
      warnings_ignored_count: 0,
      last_updated: new Date()
    };
  }

  if (warningIgnored) {
    // Increase sensitivity if warnings ignored
    this.adaptive_thresholds.warnings_ignored_count += 1;
    this.adaptive_thresholds.low_threshold = Math.max(1, this.adaptive_thresholds.low_threshold - 0.5);
    this.adaptive_thresholds.high_threshold = Math.max(3, this.adaptive_thresholds.high_threshold - 1);
  } else {
    // Gradually relax if warnings respected (over time)
    // This happens naturally as user matures
    if (this.user_maturity_flag === 'REGULAR' || this.user_maturity_flag === 'HEAVY') {
      this.adaptive_thresholds.low_threshold = Math.min(4, this.adaptive_thresholds.low_threshold + 0.1);
      this.adaptive_thresholds.high_threshold = Math.min(7, this.adaptive_thresholds.high_threshold + 0.2);
    }
  }

  this.adaptive_thresholds.last_updated = new Date();
};

// Helper methods related to nominee alerts
userSchema.methods.canSendNomineeAlert = function(cooldownMs = 24 * 60 * 60 * 1000) {
  if (!this.nominee || !this.nominee.enabled || !this.nominee.verified) return false;
  if (!this.nominee.last_nominee_alert_at) return true;
  const elapsed = Date.now() - new Date(this.nominee.last_nominee_alert_at).getTime();
  return elapsed >= cooldownMs;
};

userSchema.methods.recordNomineeAlert = function() {
  if (!this.nominee) this.nominee = {};
  this.nominee.last_nominee_alert_at = new Date();
};

/**
 * ==========================================
 * BEHAVIORAL PROFILE SCHEMA
 * ==========================================
 * 
 * behavioral_profile: {
 *   // CONFIRMATION TIME BASELINE (EMA with α=0.4)
 *   confirmation_time_avg_ms: Number,      // Running EMA
 *   confirmation_time_p75_ms: Number,      // 75th percentile over last 10
 *   
 *   // AMOUNT EDIT COUNT BASELINE (EMA)
 *   amount_edit_count_avg: Number,         // Running EMA
 *   
 *   // HESITATION SCORE BASELINE (EMA)
 *   hesitation_score_baseline: Number,     // Running EMA (0-1)
 *   transactions_with_high_hesitation: Number,
 *   high_hesitation_threshold: 0.65,
 *   
 *   // INTERACTION TIME BASELINE (EMA)
 *   avg_interaction_time_ms: Number,       // Running EMA
 *   
 *   // TRACKING FIELDS
 *   last_10_confirmation_times: [Number],  // Used for percentile calc
 *   sample_count: Number,                  // Total transactions observed
 *   last_update_at: Date
 * }
 * 
 * ==========================================
 * EMA FORMULA: new_avg = α × current + (1 - α) × old_avg
 * where α = 0.4 (gives recent transactions 40% weight)
 * ==========================================
 * 
 * EXAMPLE BASELINE EVOLUTION:
 * 
 * Transaction 1: 5000ms → baseline: 5000ms
 * Transaction 2: 3000ms → baseline: 4200ms
 * Transaction 3: 4500ms → baseline: 4260ms
 * Transaction 4: 5500ms → baseline: 4656ms
 * Transaction 5: 4800ms → baseline: 4718ms
 * 
 * After ~20 transactions, system converges to user's typical behavior
 */

module.exports = mongoose.model('User', userSchema);

