/**
 * ML Anomaly Vector Service
 * 
 * Generates 32-dimensional feature vectors for behavioral anomaly detection.
 * Uses per-user baselines for normalization (unsupervised learning).
 * 
 * Feature Vector Composition:
 * - Domain 1: Transaction Behavior (8 features) - Amount anomalies
 * - Domain 2: Temporal Patterns (6 features) - Timing anomalies
 * - Domain 3: Payee Patterns (7 features) - Relationship anomalies
 * - Domain 4: Experience Level (4 features) - User maturity
 * - Domain 5: Behavioral Signals (4 features) - Hesitation/doubt
 * - Domain 6: Risk Indicators (3 features) - Historical flags
 * 
 * Normalization: Per-user baseline + population statistics
 * Output: 32-dim vector (all values 0-1) + anomaly_score (0-1)
 * 
 * No labels required - pure statistical deviation detection
 */

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const PayeeRelationship = require('../models/PayeeRelationship');

class MLAnomalyVectorService {
  
  // ============================================================================
  // PRIMARY: Generate complete 32-dim feature vector for a transaction
  // ============================================================================
  
  /**
   * Generate ML feature vector for behavioral anomaly detection
   * @param {Object} transaction - Transaction with user_id, payee_id, amount, timestamp
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Feature vector + anomaly score
   */
  async generateFeatureVector(transaction, userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    
    const baseline = await this.computeUserBaseline(userId);
    const populationStats = this._getPopulationStatistics();
    
    // Extract raw transaction values
    const raw = this._extractRawValues(transaction, user);
    
    // Normalize each feature domain
    const vector = {};
    
    // Domain 1: Transaction Behavior (8 features)
    Object.assign(vector, this._normalizeDomain1_TransactionBehavior(
      raw, baseline, populationStats
    ));
    
    // Domain 2: Temporal Patterns (6 features)
    Object.assign(vector, this._normalizeDomain2_TemporalPatterns(
      raw, baseline
    ));
    
    // Domain 3: Payee Patterns (7 features)
    Object.assign(vector, this._normalizeDomain3_PayeePatterns(
      raw, baseline
    ));
    
    // Domain 4: Experience Level (4 features)
    Object.assign(vector, this._normalizeDomain4_ExperienceLevel(
      user, populationStats
    ));
    
    // Domain 5: Behavioral Signals (4 features)
    Object.assign(vector, this._normalizeDomain5_BehavioralSignals(
      raw, baseline
    ));
    
    // Domain 6: Risk Indicators (3 features)
    Object.assign(vector, this._normalizeDomain6_RiskIndicators(
      user, baseline
    ));
    
    // Compute aggregate anomaly score
    const anomalyScore = this._computeAnomalyScore(vector);
    
    return {
      vector: vector,           // 32-dim feature vector [0-1]
      anomaly_score: anomalyScore,  // Scalar [0-1]
      baseline_info: {
        is_cold_start: baseline.is_cold_start,
        transactions_used: baseline.transactions_used,
        baseline_age_days: baseline.baseline_age_days
      },
      timestamp: new Date()
    };
  }
  
  // ============================================================================
  // DOMAIN 1: Transaction Behavior (8 features)
  // ============================================================================
  
  _normalizeDomain1_TransactionBehavior(raw, baseline, populationStats) {
    return {
      // Feature 1.1: Amount Z-Score (deviation from user average)
      amount_zscore: this._normalizeZScore(
        raw.amount,
        baseline.amount_mean,
        baseline.amount_stdev
      ),
      
      // Feature 1.2: Amount Percentile Rank (where in user's distribution)
      amount_percentile: this._normalizePercentile(
        raw.amount,
        baseline.historical_amounts
      ),
      
      // Feature 1.3: Average Amount Z-Score (user's typical is unusual)
      avg_amount_zscore: this._normalizeZScore(
        baseline.amount_mean,
        populationStats.amount_mean,
        populationStats.amount_stdev
      ),
      
      // Feature 1.4: Max Amount Z-Score (user's max-ever is unusual)
      max_amount_zscore: this._normalizeZScore(
        Math.max(...baseline.historical_amounts || [0]),
        populationStats.max_amount_median,
        populationStats.max_amount_stdev
      ),
      
      // Feature 1.5: Amount to Average Ratio
      amount_to_avg_ratio: Math.min(2.0,
        baseline.amount_mean > 0 
          ? raw.amount / baseline.amount_mean 
          : 1.0
      ) / 2.0,  // Normalize to [0, 1]
      
      // Feature 1.6: Amount Variance (is user becoming erratic?)
      amount_variance_zscore: this._normalizeZScore(
        baseline.amount_stdev,
        populationStats.amount_stdev_mean,
        populationStats.amount_stdev_stdev
      ),
      
      // Feature 1.7: Largest Ever Indicator
      is_largest_ever: raw.amount > (Math.max(...baseline.historical_amounts || [0]))
        ? 1.0
        : 0.0,
      
      // Feature 1.8: Amount to Account Balance Ratio (if available)
      amount_to_balance_ratio: raw.account_balance > 0
        ? Math.min(1.0, raw.amount / raw.account_balance)
        : 0.5  // Unknown = neutral
    };
  }
  
  // ============================================================================
  // DOMAIN 2: Temporal Patterns (6 features)
  // ============================================================================
  
  _normalizeDomain2_TemporalPatterns(raw, baseline) {
    return {
      // Feature 2.1: Hour Z-Score (using circular distance)
      hour_zscore: this._normalizeCircular(
        raw.hour,
        baseline.hour_mean,
        baseline.hour_stdev,
        24  // 24-hour period
      ),
      
      // Feature 2.2: Day of Week Z-Score (using circular distance)
      day_of_week_zscore: this._normalizeCircular(
        raw.day_of_week,
        baseline.day_of_week_mean,
        baseline.day_of_week_stdev,
        7   // 7-day period
      ),
      
      // Feature 2.3: Time Since Last Transaction Z-Score
      time_since_last_zscore: this._normalizeZScore(
        raw.time_since_last_ms,
        baseline.interval_mean_ms,
        baseline.interval_stdev_ms
      ),
      
      // Feature 2.4: Transaction Velocity Z-Score (transactions per hour)
      transaction_velocity_zscore: this._normalizeZScore(
        raw.velocity_per_hour,
        baseline.velocity_mean,
        baseline.velocity_stdev
      ),
      
      // Feature 2.5: Night Time Ratio Deviation
      night_time_ratio_deviation: Math.abs(
        raw.is_night_time ? 1.0 : 0.0 - baseline.night_time_ratio
      ),
      
      // Feature 2.6: Unusual Time Score (composite)
      unusual_time_score: this._computeUnusualTimeScore(
        raw.hour,
        raw.day_of_week,
        raw.is_weekend,
        baseline.hour_mean,
        baseline.day_of_week_mean
      )
    };
  }
  
  // ============================================================================
  // DOMAIN 3: Payee Patterns (7 features)
  // ============================================================================
  
  _normalizeDomain3_PayeePatterns(raw, baseline) {
    return {
      // Feature 3.1: Payee Age Z-Score (brand new payees risky)
      payee_age_zscore: this._normalizeZScore(
        raw.payee_age_days,
        baseline.payee_age_mean_days,
        baseline.payee_age_stdev_days
      ),
      
      // Feature 3.2: Payee Trust Score Z-Score
      payee_trust_zscore: this._normalizeZScore(
        raw.payee_trust_score,
        baseline.payee_trust_mean,
        baseline.payee_trust_stdev
      ),
      
      // Feature 3.3: New Payee Ratio Deviation
      new_payee_ratio_deviation: Math.abs(
        (raw.is_new_payee ? 1.0 : 0.0) - baseline.new_payee_ratio
      ),
      
      // Feature 3.4: Payee Frequency Z-Score (unusual frequency with this payee)
      payee_frequency_zscore: this._normalizeZScore(
        raw.payee_transaction_frequency,
        baseline.payee_frequency_mean,
        baseline.payee_frequency_stdev
      ),
      
      // Feature 3.5: Payee Relationship Duration Z-Score
      payee_relationship_duration_zscore: this._normalizeZScore(
        raw.payee_relationship_days,
        baseline.relationship_duration_mean,
        baseline.relationship_duration_stdev
      ),
      
      // Feature 3.6: Payee Consistency (do you keep using same payees?)
      payee_consistency_score: Math.min(1.0,
        baseline.unique_payees > 0
          ? baseline.recurring_payee_count / baseline.unique_payees
          : 0.5
      ),
      
      // Feature 3.7: Payee Amount Consistency
      payee_amount_consistency: raw.payee_avg_amount > 0
        ? 1.0 - (baseline.payee_amount_stdev / raw.payee_avg_amount)
        : 0.5  // Unknown = neutral
    };
  }
  
  // ============================================================================
  // DOMAIN 4: Experience Level (4 features)
  // ============================================================================
  
  _normalizeDomain4_ExperienceLevel(user, populationStats) {
    return {
      // Feature 4.1: Account Age Z-Score (brand new accounts risky)
      account_age_zscore: this._normalizeZScore(
        user.account_age_days,
        populationStats.account_age_mean,
        populationStats.account_age_stdev
      ),
      
      // Feature 4.2: Total Transactions Z-Score (low experience risky)
      total_transactions_zscore: this._normalizeZScore(
        user.total_transactions,
        populationStats.total_transactions_mean,
        populationStats.total_transactions_stdev
      ),
      
      // Feature 4.3: Transaction Frequency Z-Score
      transaction_frequency_zscore: this._normalizeZScore(
        user.total_transactions / Math.max(1, user.account_age_days),
        populationStats.frequency_mean,
        populationStats.frequency_stdev
      ),
      
      // Feature 4.4: Account Maturity Percentile (non-parametric)
      account_maturity_percentile: user.percentile_by_age || 0.5
    };
  }
  
  // ============================================================================
  // DOMAIN 5: Behavioral Signals (4 features)
  // ============================================================================
  
  _normalizeDomain5_BehavioralSignals(raw, baseline) {
    return {
      // Feature 5.1: Hesitation Score Z-Score
      hesitation_score_zscore: this._normalizeZScore(
        raw.hesitation_score,
        baseline.hesitation_mean,
        baseline.hesitation_stdev
      ),
      
      // Feature 5.2: Edit Count Z-Score
      edit_count_zscore: this._normalizeZScore(
        raw.edit_count,
        baseline.edit_count_mean,
        baseline.edit_count_stdev
      ),
      
      // Feature 5.3: Confirmation Delay Z-Score
      confirmation_delay_zscore: this._normalizeZScore(
        raw.confirmation_delay_ms,
        baseline.confirmation_delay_mean_ms,
        baseline.confirmation_delay_stdev_ms
      ),
      
      // Feature 5.4: Intent Mismatch Ratio
      intent_mismatch_ratio: baseline.recent_transactions > 0
        ? baseline.intent_mismatch_count / baseline.recent_transactions
        : 0.0
    };
  }
  
  // ============================================================================
  // DOMAIN 6: Risk Indicators (3 features)
  // ============================================================================
  
  _normalizeDomain6_RiskIndicators(user, baseline) {
    return {
      // Feature 6.1: Blocked Transaction Ratio
      blocked_transaction_ratio: user.total_transactions > 0
        ? user.blocked_transaction_count / user.total_transactions
        : 0.0,
      
      // Feature 6.2: Failed Transaction Ratio
      failed_transaction_ratio: user.total_transactions > 0
        ? user.failed_transaction_count / user.total_transactions
        : 0.0,
      
      // Feature 6.3: Warning Ignored Ratio
      warning_ignored_ratio: user.total_warnings_shown > 0
        ? user.warnings_ignored_count / user.total_warnings_shown
        : 0.0
    };
  }
  
  // ============================================================================
  // BASELINE COMPUTATION
  // ============================================================================
  
  /**
   * Compute user's personal baseline from transaction history
   * Uses 90 days or 30 transactions, whichever is larger
   */
  async computeUserBaseline(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    
    // Get transactions from last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const transactions = await Transaction.find({
      user_id: userId,
      created_at: { $gte: ninetyDaysAgo }
    }).sort({ created_at: -1 }).limit(100);
    
    // Cold start: use population baseline if not enough history
    if (transactions.length < 5) {
      return {
        ...this._getPopulationStatistics(),
        is_cold_start: true,
        transactions_used: transactions.length,
        baseline_age_days: 0
      };
    }
    
    // Extract arrays for statistical computation
    const amounts = transactions.map(t => t.amount);
    const hours = transactions.map(t => new Date(t.created_at).getHours());
    const daysOfWeek = transactions.map(t => new Date(t.created_at).getDay());
    
    // Compute intervals between transactions
    const intervals = [];
    for (let i = 1; i < transactions.length; i++) {
      const interval = new Date(transactions[i - 1].created_at) - 
                       new Date(transactions[i].created_at);
      intervals.push(interval);
    }
    
    // Compute transaction velocity (per hour in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24h = transactions.filter(t => new Date(t.created_at) > oneDayAgo);
    const velocity = last24h.length / 24;
    
    // Count night-time transactions
    const nightTransactions = hours.filter(h => h >= 23 || h < 6).length;
    
    // Compute night ratio
    const nightRatio = transactions.length > 0
      ? nightTransactions / transactions.length
      : 0.0;
    
    // Get payee information
    const payeeRelationships = await PayeeRelationship.find({ user_id: userId })
      .select('payee_id trust_score first_transaction_date total_transactions');
    
    const payeeAges = payeeRelationships.map(pr => 
      (Date.now() - new Date(pr.first_transaction_date)) / (24 * 60 * 60 * 1000)
    );
    
    const payeeTrustScores = payeeRelationships.map(pr => pr.trust_score);
    
    // Hesitation metrics
    const hesitationScores = transactions.map(t => t.hesitation_score || 0);
    const editCounts = transactions.map(t => t.edit_count || 0);
    const confirmationDelays = transactions.map(t => t.confirmation_delay_ms || 0);
    
    // Return comprehensive baseline
    return {
      // Transaction behavior baselines
      amount_mean: this._mean(amounts),
      amount_stdev: this._stdev(amounts),
      amount_percentiles: this._percentiles(amounts, [0.25, 0.5, 0.75, 0.95]),
      historical_amounts: amounts,
      
      // Temporal baselines
      hour_mean: this._circularMean(hours, 24),
      hour_stdev: this._circularStdev(hours, 24),
      day_of_week_mean: this._circularMean(daysOfWeek, 7),
      day_of_week_stdev: this._circularStdev(daysOfWeek, 7),
      interval_mean_ms: this._mean(intervals),
      interval_stdev_ms: this._stdev(intervals),
      velocity_mean: 0.1,  // Default 1 txn per 10 hours
      velocity_stdev: 0.05,
      night_time_ratio: nightRatio,
      
      // Payee baselines
      payee_age_mean_days: this._mean(payeeAges),
      payee_age_stdev_days: this._stdev(payeeAges),
      payee_trust_mean: this._mean(payeeTrustScores),
      payee_trust_stdev: this._stdev(payeeTrustScores),
      new_payee_ratio: payeeRelationships.length > 0
        ? payeeRelationships.filter(pr => pr.total_transactions === 1).length / payeeRelationships.length
        : 0.3,
      payee_frequency_mean: payeeRelationships.length > 0
        ? this._mean(payeeRelationships.map(pr => pr.total_transactions))
        : 1.0,
      payee_frequency_stdev: 1.0,
      relationship_duration_mean: this._mean(payeeAges),
      relationship_duration_stdev: this._stdev(payeeAges),
      unique_payees: payeeRelationships.length,
      recurring_payee_count: payeeRelationships.filter(pr => pr.total_transactions > 2).length,
      
      // Behavioral baselines
      hesitation_mean: this._mean(hesitationScores),
      hesitation_stdev: this._stdev(hesitationScores),
      edit_count_mean: this._mean(editCounts),
      edit_count_stdev: this._stdev(editCounts),
      confirmation_delay_mean_ms: this._mean(confirmationDelays),
      confirmation_delay_stdev_ms: this._stdev(confirmationDelays),
      intent_mismatch_count: 0,  // TODO: compute from transaction history
      recent_transactions: Math.min(10, transactions.length),
      
      // Metadata
      is_cold_start: false,
      transactions_used: transactions.length,
      baseline_age_days: (Date.now() - new Date(transactions[transactions.length - 1].created_at)) / (24 * 60 * 60 * 1000)
    };
  }
  
  // ============================================================================
  // NORMALIZATION FUNCTIONS
  // ============================================================================
  
  /**
   * Z-Score normalization: (value - mean) / stdev, clamped to [-3, +3]
   * Maps to [0, 1] for ML: (zscore + 3) / 6
   */
  _normalizeZScore(value, mean, stdev, clamp = 3) {
    if (stdev === 0 || stdev === undefined) return 0.5;
    const zscore = (value - mean) / stdev;
    const clamped = Math.max(-clamp, Math.min(clamp, zscore));
    return (clamped + clamp) / (2 * clamp);  // Maps to [0, 1]
  }
  
  /**
   * Percentile normalization: rank of value in distribution
   * Returns 0-1 (0 = minimum, 1 = maximum)
   */
  _normalizePercentile(value, sortedValues) {
    if (!sortedValues || sortedValues.length === 0) return 0.5;
    const count = sortedValues.filter(v => v <= value).length;
    return count / sortedValues.length;
  }
  
  /**
   * Circular normalization for hour/day of week
   * Handles wraparound (11 PM to 1 AM = 2 hours, not 22)
   */
  _normalizeCircular(value, mean, stdev, period) {
    if (stdev === 0 || stdev === undefined) return 0.5;
    
    // Compute shortest circular distance
    const diff = Math.abs(value - mean);
    const distance = Math.min(diff, period - diff);
    
    // Z-score from distance
    const zscore = distance / stdev;
    const clamped = Math.max(-3, Math.min(3, zscore));
    
    // Map to [0, 1]
    return (clamped + 3) / 6;
  }
  
  /**
   * Circular mean for periodic values (hour, day of week)
   */
  _circularMean(values, period) {
    if (values.length === 0) return 0;
    
    const radians = values.map(v => (v / period) * 2 * Math.PI);
    const sinSum = radians.reduce((s, r) => s + Math.sin(r), 0);
    const cosSum = radians.reduce((s, r) => s + Math.cos(r), 0);
    
    const angle = Math.atan2(sinSum / radians.length, cosSum / radians.length);
    return ((angle + Math.PI) / (2 * Math.PI)) * period;
  }
  
  /**
   * Circular standard deviation for periodic values
   */
  _circularStdev(values, period) {
    if (values.length === 0) return 1;
    
    const mean = this._circularMean(values, period);
    const distances = values.map(v => {
      const diff = Math.abs(v - mean);
      return Math.min(diff, period - diff);
    });
    
    return this._stdev(distances);
  }
  
  // ============================================================================
  // ANOMALY SCORE COMPUTATION
  // ============================================================================
  
  /**
   * Compute aggregate anomaly score from feature vector
   * Uses RMS (Root Mean Square) of all feature deviations
   */
  _computeAnomalyScore(featureVector) {
    const values = Object.values(featureVector);
    
    // RMS of deviations from 0.5 (neutral)
    const deviations = values.map(v => Math.abs(v - 0.5));
    const sumSquares = deviations.reduce((sum, d) => sum + d * d, 0);
    const rms = Math.sqrt(sumSquares / deviations.length);
    
    // Map RMS to [0, 1]
    // RMS=0 → score=0 (normal)
    // RMS=0.5 → score=1 (very anomalous)
    return Math.min(1.0, rms * 2);
  }
  
  // ============================================================================
  // HELPER: Raw Value Extraction
  // ============================================================================
  
  _extractRawValues(transaction, user) {
    const timestamp = new Date(transaction.created_at);
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const isNightTime = hour >= 23 || hour < 6;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const timeSinceLastMs = user.last_transaction_time
      ? timestamp - new Date(user.last_transaction_time)
      : 7 * 24 * 60 * 60 * 1000;  // Default 1 week
    
    return {
      amount: transaction.amount,
      hour: hour,
      day_of_week: dayOfWeek,
      is_night_time: isNightTime,
      is_weekend: isWeekend,
      time_since_last_ms: timeSinceLastMs,
      velocity_per_hour: 1,  // TODO: compute from recent transactions
      account_balance: user.account_balance || 0,
      payee_age_days: transaction.payee_age_days || 0,
      payee_trust_score: transaction.payee_trust_score || 0,
      is_new_payee: transaction.is_new_payee || false,
      payee_transaction_frequency: transaction.payee_transaction_frequency || 1,
      payee_relationship_days: transaction.payee_relationship_days || 0,
      payee_avg_amount: transaction.payee_avg_amount || transaction.amount,
      hesitation_score: transaction.hesitation_score || 0,
      edit_count: transaction.edit_count || 0,
      confirmation_delay_ms: transaction.confirmation_delay_ms || 0
    };
  }
  
  // ============================================================================
  // HELPER: Unusual Time Score
  // ============================================================================
  
  _computeUnusualTimeScore(hour, dayOfWeek, isWeekend, userAvgHour, userAvgDay) {
    let score = 0;
    
    // Distance from user's average hour
    const hourDistance = this._circularDistance(hour, userAvgHour, 24);
    score += (hourDistance / 12);  // Max 1.0 if opposite side of day
    
    // Weekend penalty
    if (isWeekend) score += 0.3;
    
    // Night time penalty
    if (hour >= 23 || hour < 6) score += 0.2;
    
    return Math.min(1.0, score);
  }
  
  _circularDistance(a, b, period) {
    const diff = Math.abs(a - b);
    return Math.min(diff, period - diff);
  }
  
  // ============================================================================
  // STATISTICAL UTILITIES
  // ============================================================================
  
  _mean(values) {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  _stdev(values) {
    if (values.length === 0) return 1;
    const mean = this._mean(values);
    const sumSquares = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
    return Math.sqrt(sumSquares / (values.length - 1 || 1));
  }
  
  _percentiles(values, percentiles) {
    const sorted = [...values].sort((a, b) => a - b);
    return percentiles.map(p => {
      const index = Math.floor(p * sorted.length);
      return sorted[index] || 0;
    });
  }
  
  // ============================================================================
  // POPULATION STATISTICS (Mock/Cached)
  // ============================================================================
  
  _getPopulationStatistics() {
    // In production, these would be computed from DB or cached
    return {
      // Amount statistics
      amount_mean: 500,
      amount_stdev: 200,
      amount_stdev_mean: 150,
      amount_stdev_stdev: 50,
      max_amount_median: 5000,
      max_amount_stdev: 2000,
      
      // Account age statistics
      account_age_mean: 365,  // 1 year
      account_age_stdev: 200,
      
      // Transaction count statistics
      total_transactions_mean: 50,
      total_transactions_stdev: 30,
      frequency_mean: 0.15,  // ~2 per week
      frequency_stdev: 0.1
    };
  }
}

module.exports = new MLAnomalyVectorService();
