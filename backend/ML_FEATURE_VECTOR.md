# ML Feature Vector: Behavioral Anomaly Detection

## Executive Summary

The ML Feature Vector is an **unsupervised anomaly detection system** that converts behavioral and transactional features into a normalized vector (0-1 scale) representing deviation from user baseline. No labels required—purely statistical deviation detection.

**Key Insight:** Fraud isn't about absolute values; it's about **deviation from personal norms**. A $10,000 transfer is normal for a CEO but anomalous for a student.

---

## 1. Feature Vector Architecture

### 1.1 Vector Composition

The feature vector contains **32 normalized features** across 6 behavioral domains:

```
Feature Vector = [
  // Domain 1: Transaction Behavior (8 features)
  amount_zscore,
  amount_percentile_rank,
  avg_amount_zscore,
  max_amount_zscore,
  
  // Domain 2: Temporal Patterns (6 features)
  hour_zscore,
  day_of_week_zscore,
  time_since_last_zscore,
  transaction_velocity_zscore,
  night_time_ratio_deviation,
  unusual_time_score,
  
  // Domain 3: Payee Patterns (7 features)
  payee_age_zscore,
  payee_trust_zscore,
  new_payee_ratio_deviation,
  payee_frequency_zscore,
  payee_relationship_duration_zscore,
  
  // Domain 4: User Experience Level (4 features)
  account_age_zscore,
  total_transactions_zscore,
  transaction_frequency_zscore,
  account_maturity_percentile,
  
  // Domain 5: Behavioral Signals (4 features)
  hesitation_score_zscore,
  edit_count_zscore,
  confirmation_delay_zscore,
  intent_mismatch_ratio,
  
  // Domain 6: Risk Indicators (3 features)
  blocked_transaction_ratio,
  failed_transaction_ratio,
  warning_ignored_ratio
]
```

**Dimension:** 32-feature vector
**Sparsity:** None (all features computed for every transaction)
**Update Frequency:** Per transaction + weekly aggregate refresh

---

## 2. Feature Categories & Normalization Strategy

### 2.1 Domain 1: Transaction Behavior (8 features)

#### Feature 1.1: Amount Z-Score
```
zscore = (transaction_amount - user_avg_amount) / user_amount_stdev
```

**Type:** Continuous
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:** 
- Fraud often involves unusual amounts (too large/small)
- Z-score captures deviation from user's typical behavior
- $5,000 is normal for a CEO, anomalous for a student

**Example:**
- User avg: $500, stdev: $200
- Transaction: $1,500
- Z-score: (1500 - 500) / 200 = +5.0 (extremely anomalous, capped at +3)

**Interpretation:**
- Z-score < -1: Unusually small
- Z-score 0: Average for user
- Z-score > +3: Extremely large for user

#### Feature 1.2: Amount Percentile Rank
```
percentile = (count of user's transactions <= current amount) / total_user_transactions
```

**Type:** Continuous
**Range:** 0.0 to 1.0
**Why Detects Anomalies:**
- Captures whether amount is in user's top 10%, top 5%, or completely new territory
- Non-parametric (doesn't assume normal distribution)
- More robust to extreme outliers than z-score alone

**Example:**
- User has 100 transactions
- Current amount ($1,500) is higher than 98 previous transactions
- Percentile rank: 0.98 (top 2%)

#### Feature 1.3: Average Amount Z-Score
```
zscore = (user_avg_amount - overall_population_avg) / population_stdev
```

**Type:** Continuous
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Detects users whose typical amount is unusual for their account type
- If user's average is $50,000 but typical user averages $500, flag it
- Detects money mule accounts (unusually high volume)

**Example:**
- Population avg: $500
- User's personal avg: $15,000
- Z-score: +2.5 (this user is unusual even within themselves)

#### Feature 1.4: Max Amount Z-Score
```
zscore = (user_max_amount - population_max_median) / population_max_stdev
```

**Type:** Continuous
**Why Detects Anomalies:**
- User's max-ever-sent amount is unusual
- If user's maximum is $50,000 but other users max out at $5,000, suspicious

#### Feature 1.5-1.8: Reserved for Amount Variants
- Amount to same payee z-score
- Amount vs. account balance ratio
- Amount vs. daily spending limit ratio
- Amount variance (is user becoming more consistent or erratic?)

---

### 2.2 Domain 2: Temporal Patterns (6 features)

#### Feature 2.1: Hour Z-Score
```
zscore = (transaction_hour - user_avg_hour) / user_hour_stdev
```

**Type:** Circular (hour wraps 0-23)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Scammers often send money at night (less monitoring)
- Normal users have consistent transaction times
- If user always transfers at 10 AM but does it at 2 AM, anomalous

**Circular Distance Calculation:**
```
distance = min(|a - b|, 24 - |a - b|)  // Shortest path on 24-hour clock
```

**Example:**
- User typically transacts at 10 AM (±2 hours)
- Transaction at 2 AM
- Distance: 8 hours = 2.67 sigma → Z-score ≈ +2.67 (very unusual)

#### Feature 2.2: Day of Week Z-Score
```
zscore = encoded_distance(transaction_dow, user_avg_dow) / user_dow_stdev
```

**Type:** Circular (7 days)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Most users have day-of-week patterns (e.g., pay rent on 1st, never weekends)
- Scammers don't follow these patterns
- If user only transacts on weekdays but does it on 2 AM Saturday, red flag

#### Feature 2.3: Time Since Last Transaction Z-Score
```
zscore = (current_interval - user_avg_interval) / user_interval_stdev
```

**Type:** Continuous (in hours)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Rapid sequences (< 5 minutes apart) are scam-like
- Users normally space transactions out
- If user typically waits 7 days but does 3 transfers in 10 minutes, anomalous

**Example:**
- User avg interval: 7 days (168 hours), stdev: 72 hours
- Current interval: 10 minutes (0.17 hours)
- Z-score: (0.17 - 168) / 72 = -2.33 (extremely rapid)

#### Feature 2.4: Transaction Velocity Z-Score
```
transactions_per_hour = count(transactions in last 24h) / 24
zscore = (current_velocity - user_avg_velocity) / user_velocity_stdev
```

**Type:** Continuous
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Sudden spike in transaction frequency
- If user normally does 2/week but does 5 in an hour, suspicious

#### Feature 2.5: Night Time Ratio Deviation
```
night_ratio = count(transactions between 23:00-06:00) / total_transactions
deviation = current_night_ratio - user_baseline_night_ratio
```

**Type:** Continuous
**Range:** -1.0 to +1.0
**Why Detects Anomalies:**
- Tracks shift toward nighttime activity
- Legitimate users have consistent time-of-day patterns
- Sudden shift to night = behavioral change

#### Feature 2.6: Unusual Time Score
```
unusual_time_score = (distance_from_user_avg_hour / 12) + 
                     (is_weekend * 0.3) + 
                     (is_holiday * 0.2)
```

**Type:** Continuous
**Range:** 0.0 to 1.0
**Why Detects Anomalies:**
- Composite score combining multiple temporal dimensions
- Captures "how weird is this time for this user?"

---

### 2.3 Domain 3: Payee Patterns (7 features)

#### Feature 3.1: Payee Age Z-Score
```
days_since_payee_created = current_date - payee_first_seen_date
zscore = (payee_age - user_avg_payee_age) / user_payee_age_stdev
```

**Type:** Continuous (days)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Scams often involve brand new payee accounts
- Normal users have established payee relationships
- New payee + new account = high risk

**Example:**
- User typically pays people they've known for months/years
- Current payee created 2 hours ago
- Z-score: +3.0 (capped, extremely new)

#### Feature 3.2: Payee Trust Score Z-Score
```
zscore = (payee_trust_score - user_avg_payee_trust) / user_payee_trust_stdev
```

**Type:** Continuous (0-10 scale)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Paying low-trust payees is anomalous if user typically pays trusted ones
- If user's avg trusted payees score 8.5 but current is 1.0, anomalous

#### Feature 3.3: New Payee Ratio Deviation
```
new_payee_ratio = count(new payees in last 30 days) / total_payees
deviation = current_ratio - baseline_ratio
```

**Type:** Continuous
**Range:** -1.0 to +1.0
**Why Detects Anomalies:**
- Sudden increase in new payees
- Money mule accounts show spike in new payees
- Legitimate users add payees gradually

#### Feature 3.4: Payee Frequency Z-Score
```
frequency = count(transactions to this payee) / payee_age_days
zscore = (frequency - user_avg_payee_frequency) / user_frequency_stdev
```

**Type:** Continuous (transactions per day)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Unusual frequency with specific payee
- If user pays monthly to rent payee but suddenly does 5 transfers in one day, anomalous

#### Feature 3.5: Payee Relationship Duration Z-Score
```
zscore = (relationship_age - user_avg_relationship_age) / user_relationship_stdev
```

**Type:** Continuous (days)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Compares against user's typical payee tenure
- If user typically maintains relationships for years but switches to brand new payee, anomalous

#### Feature 3.6-3.7: Reserved for Payee Variants
- Payee consistency score (do you keep using same payees or always new ones?)
- Payee amount consistency (do you send similar amounts to each payee?)

---

### 2.4 Domain 4: User Experience Level (4 features)

#### Feature 4.1: Account Age Z-Score (Population)
```
zscore = (user_account_age - population_avg_age) / population_age_stdev
```

**Type:** Continuous (days)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Brand new accounts are higher risk
- Scammer often creates fresh account for attack
- If user is < 7 days old, baseline anomaly score already higher

**Example:**
- Population avg account age: 2 years
- New user: 2 days old
- Z-score: +3.0 (capped, new user)

#### Feature 4.2: Total Transactions Z-Score (Population)
```
zscore = (user_total_txns - population_avg_txns) / population_txn_stdev
```

**Type:** Continuous (count)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Low-transaction users are less experienced, more vulnerable
- If user has only 3 transactions ever, higher anomaly baseline

#### Feature 4.3: Transaction Frequency Z-Score (Population)
```
frequency = total_transactions / account_age_days
zscore = (frequency - population_avg_frequency) / population_frequency_stdev
```

**Type:** Continuous (transactions per day)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Very high frequency users (> 10/day) may be bots or money mules
- Very low frequency users (< 1/month) are less experienced

#### Feature 4.4: Account Maturity Percentile
```
percentile = (count of users with age <= current_user_age) / total_users
```

**Type:** Continuous
**Range:** 0.0 to 1.0
**Why Detects Anomalies:**
- Non-parametric account age ranking
- Captures where user falls in age distribution
- Top 5% oldest users = different baseline than bottom 5% newest

---

### 2.5 Domain 5: Behavioral Signals (4 features)

#### Feature 5.1: Hesitation Score Z-Score
```
zscore = (current_hesitation_score - user_avg_hesitation) / user_hesitation_stdev
```

**Type:** Continuous (0-1 scale)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Unusual hesitation = user self-doubting
- If confident user suddenly hesitates heavily, might indicate pressure
- Detects behavioral change

**Hesitation Components:**
- Edit count (number of amount edits)
- Confirmation delay (time between initiation and confirmation)
- Edit ratio (edits relative to typical)

#### Feature 5.2: Edit Count Z-Score
```
zscore = (current_edits - user_avg_edits) / user_edit_stdev
```

**Type:** Continuous (count)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Users who suddenly edit heavily are uncertain
- May indicate they're being coached/pressured
- Normal user edits ~0-1 time; 5+ is anomalous

#### Feature 5.3: Confirmation Delay Z-Score
```
delay_ms = confirmation_time - submission_time
zscore = (delay_ms - user_avg_delay) / user_delay_stdev
```

**Type:** Continuous (milliseconds)
**Range:** -3 to +3 (capped)
**Why Detects Anomalies:**
- Very fast confirmation (< 2 seconds) = automated or pressured
- Very slow (> 5 minutes) = user uncertainty
- Deviation from personal norm = anomalous

**Example:**
- User typically confirms in 30±10 seconds
- Current: 3 seconds (automated) or 10 minutes (uncertain)
- Z-score: ±3.0+ (anomalous in both directions)

#### Feature 5.4: Intent Mismatch Ratio
```
mismatch_count = count(recent transactions with intent mismatch)
mismatch_ratio = mismatch_count / recent_transaction_count
```

**Type:** Continuous
**Range:** 0.0 to 1.0
**Why Detects Anomalies:**
- User sending for purposes inconsistent with history
- If user always sends for "bills" but suddenly "emergency loans", anomalous
- High mismatch = behavioral change

---

### 2.6 Domain 6: Risk Indicators (3 features)

#### Feature 6.1: Blocked Transaction Ratio
```
blocked_ratio = count(blocked transactions) / total_transactions
deviation = current_ratio - baseline_ratio
```

**Type:** Continuous
**Range:** 0.0 to 1.0
**Why Detects Anomalies:**
- User with history of blocked transactions is higher risk
- New pattern of blocks = suspicious change
- Indicates user or account being flagged repeatedly

#### Feature 6.2: Failed Transaction Ratio
```
failed_ratio = count(failed transactions) / total_transactions
deviation = current_ratio - baseline_ratio
```

**Type:** Continuous
**Range:** 0.0 to 1.0
**Why Detects Anomalies:**
- Repeated failures suggest invalid account or deliberate testing
- Money mules test multiple accounts before sending large amounts
- Sudden spike = behavioral anomaly

#### Feature 6.3: Warning Ignored Ratio
```
ignored_count = count(warnings user clicked through)
ignored_ratio = ignored_count / total_warnings_shown
```

**Type:** Continuous
**Range:** 0.0 to 1.0
**Why Detects Anomalies:**
- User ignoring warnings = behavioral change
- Or indicates user is under pressure/coercion
- Increased ignore rate = anomalous

---

## 3. Normalization Strategies

### 3.1 Z-Score Normalization (16 features)

**Formula:**
```
z = (value - user_mean) / user_stdev
```

**Pros:**
- Standard deviation indicates confidence
- Handles outliers reasonably (capped at ±3)
- Interpretable (1σ = 68% of data)

**Cons:**
- Assumes normal distribution
- Sensitive to extreme outliers (clipped)

**Implementation:**
```javascript
function normalizeZScore(value, userMean, userStdev) {
  if (userStdev === 0) return 0;  // No variation in user's history
  const zscore = (value - userMean) / userStdev;
  return Math.max(-3, Math.min(3, zscore));  // Clamp to [-3, +3]
}
```

**Normalization to [0, 1] for ML:**
```
normalized = (zscore + 3) / 6  // Maps [-3, +3] to [0, 1]
```

### 3.2 Percentile Normalization (4 features)

**Formula:**
```
percentile = count(values <= current) / total_count
```

**Pros:**
- Non-parametric (no distribution assumptions)
- Robust to outliers
- Easy to interpret (0.95 = top 5%)

**Cons:**
- Less granular with small datasets
- Doesn't measure magnitude of deviation

**Implementation:**
```javascript
function normalizePercentile(value, userHistoricalValues) {
  const sortedValues = [...userHistoricalValues].sort((a, b) => a - b);
  const countLessEqual = sortedValues.filter(v => v <= value).length;
  return countLessEqual / sortedValues.length;  // [0, 1]
}
```

### 3.3 Min-Max Normalization (6 features)

**Formula:**
```
normalized = (value - user_min) / (user_max - user_min)
```

**Pros:**
- Bounded to [0, 1] naturally
- Captures range of user behavior

**Cons:**
- Sensitive to single extreme outliers
- If user ever sent $100k, everything else compressed

**Use Case:** Ratio features (blocked_ratio, failed_ratio, ignore_ratio)

**Implementation:**
```javascript
function normalizeMinMax(value, userMin, userMax) {
  if (userMin === userMax) return 0.5;  // No range
  return (value - userMin) / (userMax - userMin);
}
```

### 3.4 Circular Normalization (2 features: hour, day_of_week)

**Formula:**
```
distance = min(|a - b|, period - |a - b|)
normalized_distance = distance / (period / 2)  // Max distance = period/2
zscore = distance / circular_stdev
```

**Pros:**
- Handles wraparound (11 PM to 1 AM = 2 hours, not 22)
- Respects circular nature of time

**Example:**
```
Hour: User avg 10 AM, current 2 AM
Direct distance: |10 - 2| = 8
Circular distance: min(8, 24 - 8) = 8
Z-score: 8 / hour_stdev
```

**Implementation:**
```javascript
function circularDistance(a, b, period) {
  const diff = Math.abs(a - b);
  return Math.min(diff, period - diff);
}

function normalizeCircular(value, userMean, userStdev, period) {
  const distance = circularDistance(value, userMean, period);
  const zscore = distance / userStdev;
  return Math.max(-3, Math.min(3, zscore)) / 3 + 0.5;  // Maps to [0, 1]
}
```

### 3.5 Deviation Normalization (8 features: ratios and deviations)

**Formula:**
```
deviation = current_value - baseline_value
max_deviation = user_max_positive_deviation + user_max_negative_deviation
normalized = (deviation + max_negative_deviation) / (max_positive + max_negative)
```

**Pros:**
- Measures change from baseline
- Captures behavioral shifts

**Implementation:**
```javascript
function normalizeDeviation(value, baseline, maxDeviation) {
  if (maxDeviation === 0) return 0.5;
  const deviation = value - baseline;
  return 0.5 + (deviation / (2 * maxDeviation));  // Maps to [0, 1]
}
```

---

## 4. User Baseline Computation

### 4.1 Baseline Components

For each user, compute:

1. **Transactional Baseline** (from last 90 days or 30 transactions, whichever is larger):
   - Average amount, standard deviation
   - Min, max, median amount
   - Amount distribution (25th, 50th, 75th, 95th percentiles)

2. **Temporal Baseline**:
   - Average hour of day + stdev
   - Average day of week distribution
   - Average interval between transactions
   - Average daily velocity
   - Night-time transaction ratio

3. **Payee Baseline**:
   - Average payee age, trust score
   - Average number of payees
   - Payee tenure distribution
   - New payee introduction rate

4. **Experience Baseline**:
   - Account age, total transactions
   - Transaction frequency
   - Account maturity percentile (computed across population)

5. **Behavioral Baseline**:
   - Average hesitation score
   - Average edit count per transaction
   - Average confirmation delay
   - Intent distribution

6. **Risk Baseline**:
   - Historical block rate, fail rate, warning ignore rate
   - Trends (increasing/decreasing?)

### 4.2 Baseline Refresh Strategy

```
Initial baseline: Use first 30 days of account activity (minimum)
Daily refresh: Update percentiles, ratios
Weekly refresh: Recompute means and standard deviations (more stable)
Monthly refresh: Full baseline recomputation
Override: If user marks transaction as fraudulent, update baselines
```

### 4.3 Cold Start (New User)

For new users (< 7 days, < 5 transactions), use **population baselines**:

```javascript
function getUserBaseline(userId) {
  const userHistory = database.getTransactionHistory(userId, days = 90);
  
  if (userHistory.count < 5) {
    // Cold start: use population baselines
    return {
      amount_mean: POPULATION.amount_mean,
      amount_stdev: POPULATION.amount_stdev,
      // ... all population baselines
      is_cold_start: true
    };
  } else {
    // Warm start: use personal baselines
    return {
      amount_mean: userHistory.mean,
      amount_stdev: userHistory.stdev,
      // ... personal baselines
      is_cold_start: false
    };
  }
}
```

---

## 5. Feature Vector Generation Algorithm

### 5.1 Complete Pipeline

```javascript
async function generateFeatureVector(transaction) {
  const user = await database.getUser(transaction.user_id);
  const payee = await database.getPayee(transaction.payee_id);
  const baseline = await getUserBaseline(user.id);
  const populationStats = await getPopulationStatistics();
  
  // Extract raw values
  const raw = {
    amount: transaction.amount,
    hour: transaction.timestamp.getHours(),
    day_of_week: transaction.timestamp.getDay(),
    time_since_last: transaction.timestamp - user.last_transaction_time,
    payee_age: Date.now() - payee.created_at,
    account_age: Date.now() - user.created_at,
    // ... extract all 32 raw values
  };
  
  // Normalize each feature
  const vector = {
    // Domain 1: Transaction Behavior
    amount_zscore: normalizeZScore(raw.amount, baseline.amount_mean, baseline.amount_stdev),
    amount_percentile: normalizePercentile(raw.amount, baseline.historical_amounts),
    // ... normalize all 32 features
  };
  
  // Optionally compute composite anomaly score
  const anomalyScore = computeAnomalyScore(vector);
  
  return {
    vector: vector,  // 32-dim feature vector
    anomaly_score: anomalyScore,  // 0-1 scalar
    baseline_info: baseline,
    timestamp: new Date()
  };
}
```

### 5.2 Anomaly Score (Aggregate)

```javascript
function computeAnomalyScore(vector) {
  // Simple approach: RMS of all features
  const deviations = Object.values(vector).map(v => Math.abs(v - 0.5));
  const rms = Math.sqrt(deviations.reduce((a, b) => a + b*b) / deviations.length);
  
  // Or use domain weights
  const domainScores = {
    transaction: mean([vector.amount_zscore, vector.amount_percentile, ...]),
    temporal: mean([vector.hour_zscore, vector.day_of_week_zscore, ...]),
    payee: mean([vector.payee_age_zscore, ...]),
    // ... compute domain means
  };
  
  // Weighted average
  return (
    0.35 * domainScores.transaction +  // Most important
    0.25 * domainScores.temporal +
    0.25 * domainScores.payee +
    0.10 * domainScores.experience +
    0.05 * domainScores.behavioral
  );
}
```

---

## 6. Why Each Feature Detects Anomalies

### 6.1 Feature Importance Ranking

| Rank | Feature | Why It Matters | Anomaly Type Detected |
|------|---------|----------------|----------------------|
| 1 | amount_zscore | Fraud involves unusual amounts | Amount manipulation |
| 2 | payee_age_zscore | New accounts are risky | Account takeover, new scammer |
| 3 | time_since_last_zscore | Rapid sequences are suspicious | Velocity attack, compromise |
| 4 | hour_zscore | Scammers work at night | Behavioral shift, coercion |
| 5 | account_age_zscore | New accounts more vulnerable | Young account exploitation |
| 6 | transaction_velocity_zscore | Sudden spikes unusual | Burst fraud, bot activity |
| 7 | hesitation_score_zscore | Doubt indicates pressure | Coercion, manipulation |
| 8 | payee_frequency_zscore | Unusual payee patterns | Money mule network detection |
| 9 | new_payee_ratio_deviation | Too many new payees suspicious | Money laundering |
| 10 | blocked_transaction_ratio | History of blocks = risk | Repeat offender |

### 6.2 Feature Combinations That Signal Fraud

```
High-Risk Pattern 1: New Account + New Payee + Large Amount + Night Time
  → Features: account_age_zscore, payee_age_zscore, amount_zscore, hour_zscore
  → Anomaly: Classic fraud setup

High-Risk Pattern 2: Rapid Sequence + Multiple New Payees + Increasing Amounts
  → Features: velocity_zscore, new_payee_ratio, amount_percentile
  → Anomaly: Money mule activity

High-Risk Pattern 3: Behavioral Change + Hesitation + Warning Ignores
  → Features: hesitation_zscore, intent_mismatch_ratio, warning_ignored_ratio
  → Anomaly: Coercion/compromise

High-Risk Pattern 4: Off-Peak Time + Fast Confirmation + High Amount
  → Features: hour_zscore, confirmation_delay_zscore, amount_zscore
  → Anomaly: Automated fraud, bot activity
```

---

## 7. Implementation: mlAnomalyVector.js

This service generates feature vectors for ML anomaly detection:

```javascript
// src/services/mlAnomalyVector.js
// Responsibility: Convert transactions to normalized feature vectors

class MLAnomalyVectorService {
  
  // Generate 32-dimensional feature vector for a transaction
  async generateFeatureVector(transaction, userId) {
    const user = await User.findById(userId);
    const payee = await Payee.findById(transaction.payee_id);
    const baseline = await this.computeUserBaseline(userId);
    const population = await this.getPopulationBaselines();
    
    const features = {};
    
    // Domain 1: Transaction Behavior (8 features)
    features.amount_zscore = this.normalizeZScore(
      transaction.amount,
      baseline.amount_mean,
      baseline.amount_stdev
    );
    features.amount_percentile = this.normalizePercentile(
      transaction.amount,
      baseline.historical_amounts
    );
    // ... extract 8 features
    
    // Domain 2: Temporal Patterns (6 features)
    const hour = transaction.timestamp.getHours();
    features.hour_zscore = this.normalizeCircular(
      hour,
      baseline.hour_mean,
      baseline.hour_stdev,
      24
    );
    // ... extract 6 features
    
    // ... continue for other domains
    
    return {
      vector: features,
      anomaly_score: this.computeAnomalyScore(features),
      baseline_id: baseline.id
    };
  }
  
  // Compute user's personal baseline from history
  async computeUserBaseline(userId) {
    const transactions = await Transaction.find({
      user_id: userId,
      created_at: { $gte: Date.now() - 90*24*60*60*1000 }  // Last 90 days
    }).limit(100);  // Use most recent 100
    
    if (transactions.length < 5) {
      return this.getPopulationBaselines();
    }
    
    const amounts = transactions.map(t => t.amount);
    const hours = transactions.map(t => t.timestamp.getHours());
    
    return {
      amount_mean: this.mean(amounts),
      amount_stdev: this.stdev(amounts),
      amount_percentiles: this.percentiles(amounts, [0.25, 0.5, 0.75, 0.95]),
      hour_mean: this.circularMean(hours),
      hour_stdev: this.circularStdev(hours),
      // ... compute all baseline statistics
    };
  }
  
  // Compute anomaly score (0-1) from feature vector
  computeAnomalyScore(featureVector) {
    const values = Object.values(featureVector);
    const deviations = values.map(v => Math.abs(v - 0.5));
    const rms = Math.sqrt(
      deviations.reduce((sum, d) => sum + d*d, 0) / deviations.length
    );
    return Math.min(1.0, rms);
  }
  
  // Z-score normalization with clamping
  normalizeZScore(value, mean, stdev, clamp = 3) {
    if (stdev === 0) return 0.5;
    const zscore = (value - mean) / stdev;
    const clamped = Math.max(-clamp, Math.min(clamp, zscore));
    return (clamped + clamp) / (2 * clamp);  // Maps to [0, 1]
  }
  
  // Percentile normalization
  normalizePercentile(value, sortedValues) {
    const count = sortedValues.filter(v => v <= value).length;
    return count / sortedValues.length;
  }
  
  // Circular mean for hour/day
  circularMean(values, period = 24) {
    const radians = values.map(v => (v / period) * 2 * Math.PI);
    const sinSum = radians.reduce((s, r) => s + Math.sin(r), 0);
    const cosSum = radians.reduce((s, r) => s + Math.cos(r), 0);
    const angle = Math.atan2(sinSum / radians.length, cosSum / radians.length);
    return ((angle + Math.PI) / (2 * Math.PI)) * period;
  }
}

module.exports = new MLAnomalyVectorService();
```

---

## 8. Integration with Risk Engine

The ML anomaly score feeds into the risk engine as an optional 7th category:

```javascript
// In riskEngine.js
const mlAnomalyVector = require('./mlAnomalyVector');

async function calculateRiskLevel(transaction) {
  const features = await featureExtractor.extractTransactionFeatures(transaction);
  
  // Generate ML feature vector
  const mlVector = await mlAnomalyVector.generateFeatureVector(transaction);
  const mlAnomalyScore = mlVector.anomaly_score;
  
  // Compute risk categories
  const scores = {};
  scores.payee = computePayeeRisk(features);
  // ... other categories
  
  // Optional: Add ML anomaly as 7th category
  // Start at 0% weight, increase as model matures
  const ml_weight = 0.0;  // Can gradually increase to 0.1
  scores.ml_anomaly = mlAnomalyScore;
  
  // Include ML vector in output for monitoring
  return {
    risk_level,
    risk_score,
    category_scores: scores,
    ml_vector: mlVector.vector,
    ml_anomaly_score: mlAnomalyScore,
    reason_codes
  };
}
```

---

## 9. Model Training Workflow (Future)

Once vectors are collected, can train unsupervised models:

```
Phase 1: Vector Collection (0-30 days)
  → Generate feature vectors for all transactions
  → Store vectors + outcomes (fraud/legitimate)
  → Build baseline statistics

Phase 2: Baseline Modeling (30-60 days)
  → Train Isolation Forest on normal transactions
  → Learn multivariate anomaly patterns
  → Test on known fraud cases

Phase 3: Model Evaluation (60-90 days)
  → Measure precision/recall
  → Compare to rule-based system
  → Fine-tune anomaly thresholds

Phase 4: Production Deployment (90+ days)
  → Deploy model predictions
  → Start with low weight (5%)
  → Gradually increase weight to 10-20%
  → Monitor performance and drift
```

---

## 10. Unsupervised Learning Approaches

### 10.1 Isolation Forest
```
Pros: Works well with high-dim data, detects global and local outliers
Cons: Needs tuning, can be slow with large datasets
Use: Primary unsupervised anomaly detection
```

### 10.2 Local Outlier Factor (LOF)
```
Pros: Density-based, detects local anomalies
Cons: More computationally expensive
Use: For detecting subtle behavioral changes
```

### 10.3 One-Class SVM
```
Pros: Maps normal behavior, detects deviations
Cons: Sensitive to kernel choice
Use: Alternative to Isolation Forest
```

### 10.4 Autoencoders (Deep Learning)
```
Pros: Learns complex patterns, adaptable
Cons: Requires more data, harder to explain
Use: Long-term, after collecting 1M+ vectors
```

---

## 11. Feature Vector Monitoring

### 11.1 Metrics to Track

```
1. Vector Staleness: How often is baseline updated?
2. Feature Coverage: % of features with valid data
3. Anomaly Score Distribution: Is it drifting?
4. Cold Start Rate: % of users without personal baseline
5. Feature Correlation: Are some features redundant?
```

### 11.2 Anomaly Score Distribution

```
Expected distribution (legitimate users):
  - Mean: 0.3
  - Std Dev: 0.15
  - 99th percentile: < 0.8

If actual is higher:
  → Users becoming more anomalous (potential fraud spike)
  → Need investigation

If actual is lower:
  → More consistent users (good)
  → Could be underfitting anomalies
```

---

## 12. Privacy & Fairness

### 12.1 Privacy Considerations

- Baselines computed locally (don't expose individual feature values)
- Population statistics anonymized (aggregate only)
- Vectors deleted after risk scoring (don't store raw features)
- Audit logs for model decisions

### 12.2 Fairness Considerations

- Feature analysis: Ensure no proxies for protected attributes
- Baseline parity: New users vs. established users treated fairly
- Threshold calibration: Don't penalize legitimate user behavioral changes
- Explainability: Reason codes must be understandable

---

## Summary

The **32-dimensional feature vector** captures behavioral deviations across 6 domains:
1. **Transaction Behavior** (8) - Amount anomalies
2. **Temporal Patterns** (6) - Timing anomalies
3. **Payee Patterns** (7) - Relationship anomalies
4. **Experience Level** (4) - User maturity
5. **Behavioral Signals** (4) - Hesitation/doubt
6. **Risk Indicators** (3) - Historical flags

**Normalization** is per-user and multi-strategy:
- Z-score for distributions
- Percentile for robustness
- Circular for time
- Deviation for change

**No labels needed**: Pure statistical anomaly detection from baseline comparison.

This enables unsupervised fraud detection complementing the rule-based risk engine.
