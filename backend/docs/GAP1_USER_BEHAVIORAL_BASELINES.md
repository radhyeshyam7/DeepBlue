# Gap 1: User Behavioral Baselines Implementation Guide

## Overview

User Behavioral Baselines is the foundation of DeepBlue's adaptive risk assessment. By tracking how individual users interact with the transaction form, the system learns their typical patterns and can detect significant deviations that might indicate fraud or account compromise.

**Key Metric:** EMA (Exponential Moving Average) with α=0.4, which gives 40% weight to recent transactions and 60% to historical average.

---

## What Are Behavioral Baselines?

A baseline is a statistical summary of a user's **typical transaction behavior** across four key metrics:

### 1. **Confirmation Time** (ms)
- How long between form submission and pressing "Confirm"
- Typical range: 2000-5000ms
- Unusual patterns: Extreme speed (<1s) or hesitation (>10s)

### 2. **Amount Edit Count**
- Number of times the user edits the transfer amount
- Typical range: 0-2 edits per transaction
- High edits (5+) suggest uncertainty or deliberate obfuscation

### 3. **Hesitation Score** (0-1)
- Composite of: hesitation time + edit frequency + confirmation delay
- Calculated on transaction submission
- Detects psychological hesitation

### 4. **Interaction Time** (ms)
- Total time from form open to confirmation
- Includes all pauses and re-reads
- Baseline helps identify rushed transactions

---

## EMA Formula

```
new_baseline = α × current_value + (1 - α) × old_baseline

where α = 0.4 (40% weight to current, 60% weight to history)
```

### Example Evolution:
```
Transaction 1: 5000ms input
  → baseline = 0.4 × 5000 + 0.6 × 0 = 5000ms

Transaction 2: 3000ms input
  → baseline = 0.4 × 3000 + 0.6 × 5000 = 4200ms

Transaction 3: 4500ms input
  → baseline = 0.4 × 4500 + 0.6 × 4200 = 4260ms

Transaction 4: 5500ms input
  → baseline = 0.4 × 5500 + 0.6 × 4260 = 4656ms

Transaction 5: 4800ms input
  → baseline = 0.4 × 4800 + 0.6 × 4656 = 4718ms
```

After ~20 transactions, the system has converged to a stable baseline.

---

## User Schema Updates

Add to `User.js`:

```javascript
behavioral_profile: {
  // Confirmation Time
  confirmation_time_avg_ms: Number,
  confirmation_time_p75_ms: Number,      // 75th percentile

  // Amount Edit Count
  amount_edit_count_avg: Number,

  // Hesitation Score
  hesitation_score_baseline: Number,
  transactions_with_high_hesitation: Number,

  // Interaction Time
  avg_interaction_time_ms: Number,

  // Metadata
  last_10_confirmation_times: [Number],  // For percentile
  sample_count: Number,                  // Total transactions
  last_update_at: Date
}
```

---

## Service: `behavioralProfile.js`

### 1. **updateBehavioralProfile(user_id, signals)**

Called after **every completed transaction**. Updates all four baselines using EMA.

**Input:**
```javascript
{
  confirmation_delay_ms: 3500,      // From form timing
  amount_edit_count: 1,              // # of edits
  hesitation_time_ms: 2000,          // Pause time
  hesitation_score: 0.35,            // Composite score (0-1)
  total_interaction_time_ms: 5100    // Form open to confirm
}
```

**Output:**
```javascript
{
  user_id: 'user_123',
  sample_count: 5,
  baselines: {
    confirmation_time_avg_ms: 3450,
    confirmation_time_p75_ms: 3600,
    amount_edit_count_avg: 0.8,
    hesitation_score_baseline: 0.36,
    avg_interaction_time_ms: 5050
  }
}
```

**Key Implementation Details:**
- Runs every transaction (no sampling)
- Maintains 75th percentile for robustness
- Returns null if baseline not yet initialized

### 2. **getBehavioralBaseline(user_id)**

Retrieves the current baseline for a user.

**Returns:**
```javascript
{
  confirmation_time_avg_ms: 3450,
  confirmation_time_p75_ms: 3600,
  amount_edit_count_avg: 0.8,
  hesitation_score_baseline: 0.36,
  avg_interaction_time_ms: 5050,
  sample_count: 5,
  high_hesitation_transactions: 1
}
```

**Confidence Levels:**
- **0-5 samples:** LOW (still forming)
- **5-20 samples:** MEDIUM (converging)
- **20+ samples:** HIGH (stable)

### 3. **calculateHesitationDeviation(current, baseline, sampleCount)**

Detects how far current hesitation deviates from user's baseline.

**Returns deviation score (0-1):**
- 0.0: Normal behavior
- 0.5: Moderately elevated hesitation
- 1.0: Severely elevated hesitation

**Formula:**
```javascript
If sampleCount < 20 (new user):
  if currentHesitation > 0.65: return 0.8
  if currentHesitation > 0.35: return 0.4
  return 0

If sampleCount >= 20 (established user):
  deviationRatio = (currentHesitation - baseline) / baseline
  
  if deviationRatio < 0:     return 0      (below baseline)
  if deviationRatio < 0.5:   return 0.2    (0-50% above)
  if deviationRatio < 1.0:   return 0.5    (50-100% above)
  if deviationRatio < 2.0:   return 0.75   (100-200% above)
  if deviationRatio >= 2.0:  return 0.9    (>200% above)
```

---

## Integration: `baselineIntegration.js`

Complete workflow showing how to use baselines in the risk assessment pipeline.

### Workflow Steps:

**1. Capture Behavioral Signals**
```javascript
const signals = captureBehavioralSignals(formInteractionData);
// Returns: { confirmation_delay_ms, amount_edit_count, hesitation_score, ... }
```

**2. Get User Baseline**
```javascript
const baseline = await getUserBaseline(userId);
// Returns: { confirmation_time_avg_ms, hesitation_score_baseline, ... }
```

**3. Calculate Deviations**
```javascript
const deviations = calculateFeatureDeviations(signals, baseline);
// Returns: {
//   confirmation_time_deviation: 0.3,
//   edit_count_deviation: 0.2,
//   hesitation_deviation: 0.4,
//   overall_deviation_score: 0.35
// }
```

**4. Score Transaction**
```javascript
const riskScore = await scoreTransactionWithBaseline(userId, txnData, signals);
// Combines base features with deviation penalties
```

**5. Update Baseline**
```javascript
await updateBaselineAfterTransaction(userId, signals);
// Updates EMA for next transaction
```

---

## Feature Extraction Integration

The behavioral baselines **do NOT directly replace** the existing 20-feature v1 model.

Instead, they **enhance** existing features:

### Features That Use Baselines:
1. **confirmation_time_ratio** - Adjusted for user baseline
2. **hesitation_score** - Now includes deviation component
3. **amount_edit_count_ratio** - User-relative, not absolute
4. **intent_risk_score** - Can be adjusted per user patterns

### Deviation-Based Adjustments:

```javascript
// Before: Raw hesitation score (0-1)
raw_hesitation = 0.6

// After: Hesitation + baseline deviation
baseline_deviation = calculateHesitationDeviation(0.6, user.baseline, sample_count)
adjusted_hesitation = raw_hesitation + (baseline_deviation * 0.3)
// Result: 0.6 + (0.4 × 0.3) = 0.72

// Risk level increases due to deviation
```

---

## Testing & Validation

### Test File: `baseline-evolution.test.js`

Run to see how baselines evolve over 25 transactions:

```bash
node backend/tests/baseline-evolution.test.js
```

**Output:**
- PHASE 1: Baseline formation (transactions 1-10)
- PHASE 2: Anomaly detection (transactions 11-15) 
- PHASE 3: Baseline convergence (transactions 16-25)

### Manual Testing:

```javascript
const { simulateBaselineEvolution } = require('./tests/baseline-evolution.test.js');
await simulateBaselineEvolution('test-user-001');
```

---

## Baseline Stability Indicators

**When is a baseline reliable?**

| Metric | Confidence | Use Case |
|--------|-----------|----------|
| sample_count < 5 | LOW | New accounts - use absolute thresholds |
| 5 ≤ sample_count < 20 | MEDIUM | Transitioning to relative thresholds |
| sample_count ≥ 20 | HIGH | Fully adaptive risk scoring |

**Recommendation:** Apply different risk weights based on confidence:

```javascript
if (sample_count < 5) {
  // Use strict absolute thresholds
  risk_weight = 1.0;
} else if (sample_count < 20) {
  // Gradually blend absolute and relative
  risk_weight = 0.5 + (sample_count / 20) * 0.5;
} else {
  // Fully adaptive
  risk_weight = 1.0;
}
```

---

## Common Baseline Patterns

### Pattern 1: Cautious User
```
- High confirmation time (4000-6000ms)
- Multiple edits (2-4 per transaction)
- High hesitation (0.5-0.7)
- Long interaction time (8000-10000ms)

Risk indicator: Deviations are more suspicious (suddenly fast)
```

### Pattern 2: Experienced Fast User
```
- Low confirmation time (1000-2000ms)
- Minimal edits (0-1 per transaction)
- Low hesitation (0.1-0.3)
- Quick interaction time (2000-3000ms)

Risk indicator: Sudden slowness or edits (unusual behavior change)
```

### Pattern 3: High-Frequency Trader
```
- Very quick confirmations (500-1000ms)
- No edits (0)
- Minimal hesitation (0.0-0.1)
- Minimal interaction time (1000-2000ms)

Risk indicator: Any behavioral change is red flag
```

---

## Migration Path

### Phase 2A: Foundation (Current)
1. ✅ Add `behavioral_profile` schema to User
2. ✅ Implement `updateBehavioralProfile()` with EMA
3. ✅ Implement `getBehavioralBaseline()`
4. ✅ Implement `calculateHesitationDeviation()`

### Phase 2B: Integration
1. Call `updateBehavioralProfile()` after every transaction decision
2. Use `getBehavioralBaseline()` in risk scoring
3. Add deviation to hesitation calculation
4. Test with simulator

### Phase 2C: Risk Adjustment
1. Adjust risk levels based on baseline deviations
2. Enable/disable features based on sample_count
3. Implement confidence-based weighting
4. A/B test with production users

---

## Database Performance Considerations

### Indexes to Add:
```javascript
userSchema.index({ 'behavioral_profile.sample_count': 1 });
userSchema.index({ 'behavioral_profile.last_update_at': 1 });
```

### Storage Impact:
- Per user: ~500 bytes
- 1M users: ~500MB total
- Query cost: O(1) - direct field lookup

### Update Performance:
- Single EMA update: ~5ms
- Called: once per transaction
- No index updates (numeric fields)

---

## Monitoring & Observability

### Metrics to Track:
1. **Baseline Stability:** % of users with sample_count ≥ 20
2. **Deviation Distribution:** Mean/P95 of overall_deviation_score
3. **False Positive Rate:** % flagged as anomaly who proceed successfully
4. **Update Latency:** Time to update baseline after transaction

### Alerts:
```javascript
if (deviations.overall_deviation_score > 0.75) {
  console.warn(`HIGH DEVIATION: ${userId}, score: ${deviations.overall_deviation_score}`);
  // Flag for manual review or additional verification
}
```

---

## Next Steps

1. **Schema Migration:** Add `behavioral_profile` field to existing User records
2. **Baseline Collection:** Run transactions through system to build initial baselines
3. **Risk Integration:** Update `riskEngine.js` to use baseline deviations
4. **Testing:** Run `baseline-evolution.test.js` against real transaction patterns
5. **Monitoring:** Track baseline stability metrics

---

## References

- **EMA Formula:** Exponential Moving Average (Wilder's Method)
- **Hesitation Detection:** Behavioral biometrics research
- **ML Contract:** `docs/ML_CONTRACT_v1.md`
- **Feature Definition:** Feature extractor at `src/ml/featureExtractor.js`

---

**Status:** Gap 1 Implementation Complete ✓
