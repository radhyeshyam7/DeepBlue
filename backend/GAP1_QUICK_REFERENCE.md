# Gap 1: Quick Reference Card

## 🎯 What It Does
Learns individual user's typical transaction behavior → detects unusual deviations → adjusts risk scoring per user

## 📊 Four Baselines Tracked

| Baseline | Measures | Typical | Flag |
|----------|----------|---------|------|
| **Confirmation Time** | Form → Confirm (ms) | 2-5 sec | >10s = hesitant |
| **Amount Edits** | # of edits per txn | 0-2 | >5 = uncertain |
| **Hesitation Score** | Psychological hesitation | 0.2-0.6 | >0.7 = concerning |
| **Interaction Time** | Form open → Confirm (ms) | 3-8 sec | <1s = rushed |

## 🧮 The Math
```
new_baseline = 0.4 × current + 0.6 × old_baseline
```
**In English:** 40% weight to latest transaction, 60% to history

## 📈 Confidence Progression
```
Txn 1-4:   LOW    (use absolute rules: hesitation > 0.65 = risky)
Txn 5-19:  MEDIUM (blend absolute + relative rules)
Txn 20+:   HIGH   (fully adaptive: compare to user's own patterns)
```

## 💾 Database Schema
```javascript
user.behavioral_profile = {
  confirmation_time_avg_ms: 3450,
  hesitation_score_baseline: 0.36,
  amount_edit_count_avg: 0.8,
  sample_count: 15,
  last_update_at: Date
}
```

## 🔌 API Functions

### 1. Update After Transaction
```javascript
await updateBehavioralProfile(userId, {
  confirmation_delay_ms: 3500,
  amount_edit_count: 1,
  hesitation_score: 0.35,
  total_interaction_time_ms: 5100
});
```

### 2. Get Baseline for Comparison
```javascript
const baseline = await getBehavioralBaseline(userId);
// { confirmation_time_avg_ms: 3450, hesitation_score_baseline: 0.36, ... }
```

### 3. Calculate Deviation
```javascript
const deviation = calculateHesitationDeviation(0.65, 0.36, 20);
// 0.75 (75% above baseline - concerning!)
```

### 4. Full Workflow
```javascript
const risk = await scoreTransactionWithBaseline(userId, txnData, signals);
// { adjusted_risk_level: 'HIGH', behavioral_deviations: {...} }
```

## 📂 Files

| File | Purpose |
|------|---------|
| `behavioralProfile.js` | Core EMA updates + deviation calc |
| `baselineIntegration.js` | Workflow + 5 helper functions |
| `baseline-evolution.test.js` | Simulator showing 25-txn evolution |
| `GAP1_USER_BEHAVIORAL_BASELINES.md` | Comprehensive docs |
| `BASELINE_INTEGRATION_GUIDE.js` | 5 route examples |

## 🚀 Integration (3 Steps)

### Step 1: Add to Transaction Submit
```javascript
// When user presses "Confirm"
const signals = {
  confirmation_delay_ms: Date.now() - formStartTime,
  amount_edit_count: editCount,
  hesitation_time_ms: pauseTime,
  total_interaction_time_ms: totalTime
};
```

### Step 2: Get Baseline Before Decision
```javascript
const baseline = await getBehavioralBaseline(userId);
if (baseline?.sample_count >= 20) {
  // Use relative deviation thresholds
} else {
  // Use absolute thresholds
}
```

### Step 3: Update After Confirmation
```javascript
// After user confirms transaction
await updateBehavioralProfile(userId, signals);
```

## ⚠️ Deviation Scoring

```
0.0  = Normal behavior
0.2  = Slightly elevated
0.5  = Moderately concerning
0.75 = Significantly elevated
1.0  = Severely unusual
```

**Example:**
- User normally: 3500ms confirmation
- This time: 8000ms confirmation
- Ratio: 2.3x baseline
- **Deviation:** 0.75 ⚠️

## 🧪 Test It
```bash
node backend/tests/baseline-evolution.test.js
```
Shows how baseline evolves from scratch to stable over 25 txns

## 📋 Confidence Check
```javascript
if (baseline.sample_count < 5) {
  riskMultiplier = 1.0;  // Strict
} else if (baseline.sample_count < 20) {
  riskMultiplier = 0.5 + (baseline.sample_count / 20) * 0.5;  // Gradual
} else {
  riskMultiplier = 1.0;  // Adaptive
}
```

## 🎯 Decision Logic

```javascript
if (adjusted_risk_level === 'CRITICAL') {
  decision = 'BLOCK';
} else if (adjusted_risk_level === 'HIGH') {
  decision = 'WARN';  // Require additional verification
} else {
  decision = 'APPROVE';
}
```

## 📊 Example Output

**User with 20+ txns:**
```
Current hesitation: 0.65
User baseline: 0.36
Deviation: 0.75 (75% above baseline)
Risk level: HIGH ⚠️
```

**New user (<5 txns):**
```
Current hesitation: 0.65
No baseline yet
Risk level: MEDIUM (absolute threshold: 0.65 is borderline)
```

## 🔍 Monitoring
Track:
- % users with baseline (sample_count ≥ 5)
- % users with stable baseline (≥ 20)
- Distribution of deviations (P50, P95, P99)
- False positive rate (flagged but proceed anyway)

## ✅ Checklist
- [ ] Integrate `updateBehavioralProfile()` into transaction route
- [ ] Get baseline in `/transaction/decide` endpoint
- [ ] Test with `baseline-evolution.test.js`
- [ ] Monitor baseline stability (% users at sample_count ≥ 20)
- [ ] Verify false positive rate < 5%
- [ ] Deploy to production

---

**Think of it this way:** 
- **Without baselines:** All users judged by same absolute rules (5s is slow for everyone)
- **With baselines:** Each user judged by their own patterns (5s is normal for cautious user, red flag for fast trader)
