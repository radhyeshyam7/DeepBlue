# Hybrid Risk Scoring System: How It Works

## Current System Architecture

Your system uses a **PARALLEL HYBRID** approach, not sequential. Both the rule-based engine and ML model run simultaneously, and their scores are combined using weighted averaging.

## Step-by-Step Process

### Step 1: Rule-Based Scoring (ALWAYS runs first)

The system calculates risk using 6 rule-based categories:

```javascript
// 1. PAYEE RISK (30% weight)
payeeScore = 0.60  // New payee
scores.payee = 0.60

// 2. AMOUNT RISK (30% weight)
amountScore = 0.80  // Large amount + spike
scores.amount = 0.80

// 3. URGENCY RISK (15% weight)
urgencyScore = 0.0  // No urgency signals
scores.urgency = 0.0

// 4. INTENT RISK (10% weight)
intentScore = 0.25  // Intent mismatch
scores.intent = 0.25

// 5. HESITATION RISK (5% weight)
hesitationScore = 0.0  // No hesitation
scores.hesitation = 0.0

// 6. VULNERABILITY RISK (10% weight)
vulnerabilityScore = 0.25  // Low experience user
scores.vulnerability = 0.25
```

**Weighted Sum**:
```
compositeScore = (0.60 × 0.30) + (0.80 × 0.30) + (0.0 × 0.15) + 
                 (0.25 × 0.10) + (0.0 × 0.05) + (0.25 × 0.10)
               = 0.18 + 0.24 + 0.0 + 0.025 + 0.0 + 0.025
               = 0.47
```

**Vulnerability Amplification**:
```
amplifiedScore = 0.47 × (1 + 0.25 × 0.8)  // 0.8 factor for large amounts
               = 0.47 × 1.20
               = 0.564
```

**Result**: Rule-based score = **0.564** (56.4%)

---

### Step 2: ML Model Scoring (Runs in parallel)

While rules are being calculated, the ML model also runs:

```javascript
// Extract ML features (different format than rule features)
mlFeatures = extractFeaturesV1(transaction, user, payeeRelationship)

// Run Isolation Forest model
mlResult = infer(mlFeatures)
mlAnomalyScore = 0.855  // High anomaly detected

// Cap ML score at 0.7 (synthetic data unreliable)
cappedMLScore = Math.min(0.855, 0.7) = 0.7
```

**Result**: ML score = **0.7** (70%)

---

### Step 3: Hybrid Combination (Weighted Average)

The system combines both scores using adaptive weights:

```javascript
// Determine ML weight based on context
if (amount >= 5000) {
  mlWeight = 0.1;  // Large amounts: trust rules more (90% rules, 10% ML)
} else if (amount < 200) {
  mlWeight = 0.15; // Small amounts: 85% rules, 15% ML
} else if (user.total_transactions < 10) {
  mlWeight = 0.15; // New users: 85% rules, 15% ML
} else {
  mlWeight = 0.2;  // Regular users: 80% rules, 20% ML
}

ruleWeight = 1 - mlWeight;

// For ₹10,000 transaction:
mlWeight = 0.1
ruleWeight = 0.9

// Weighted average
finalScore = (ruleScore × ruleWeight) + (mlScore × mlWeight)
           = (0.564 × 0.9) + (0.7 × 0.1)
           = 0.508 + 0.07
           = 0.578
```

**Result**: Final hybrid score = **0.578** (57.8%)

---

### Step 4: Risk Level Mapping

The final score is mapped to risk levels using adaptive thresholds:

```javascript
// For large amounts (≥ ₹5,000) to new payees: STRICT thresholds
if (amount >= 5000 && isNewPayee) {
  if (finalScore < 0.15) {
    riskLevel = 'LOW';
  } else if (finalScore < 0.35) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'HIGH';  // ← 0.578 falls here
  }
}

// For ₹10,000 to new payee:
finalScore = 0.578
riskLevel = 'HIGH'  // Because 0.578 > 0.35
riskScore = Math.round(0.578 × 10) = 6  // Display as 60%
```

**Result**: Risk level = **HIGH**, Risk score = **60%**

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TRANSACTION INPUT                         │
│  Amount: ₹10,000 | Payee: new | User: 8 transactions        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────┴────────────────┐
        │                                  │
        ▼                                  ▼
┌───────────────────┐            ┌──────────────────┐
│  RULE-BASED       │            │  ML MODEL        │
│  SCORING          │            │  (Isolation      │
│                   │            │   Forest)        │
│  6 Categories:    │            │                  │
│  • Payee: 0.60    │            │  Anomaly Score:  │
│  • Amount: 0.80   │            │  0.855 → 0.7     │
│  • Urgency: 0.0   │            │  (capped)        │
│  • Intent: 0.25   │            │                  │
│  • Hesitation: 0.0│            │                  │
│  • Vuln: 0.25     │            │                  │
│                   │            │                  │
│  Weighted: 0.47   │            │                  │
│  Amplified: 0.564 │            │                  │
└─────────┬─────────┘            └────────┬─────────┘
          │                               │
          │                               │
          └───────────┬───────────────────┘
                      ▼
          ┌───────────────────────┐
          │  HYBRID COMBINATION   │
          │                       │
          │  Rule Weight: 90%     │
          │  ML Weight: 10%       │
          │                       │
          │  Final Score:         │
          │  (0.564 × 0.9) +      │
          │  (0.7 × 0.1)          │
          │  = 0.578              │
          └───────────┬───────────┘
                      ▼
          ┌───────────────────────┐
          │  THRESHOLD MAPPING    │
          │                       │
          │  0.578 > 0.35         │
          │  → HIGH RISK          │
          │  → 60% display        │
          └───────────┬───────────┘
                      ▼
          ┌───────────────────────┐
          │  FINAL DECISION       │
          │                       │
          │  Risk: HIGH (60%)     │
          │  Action: DELAY        │
          │  SMS: Send alert      │
          └───────────────────────┘
```

---

## Why Parallel Hybrid (Not Sequential)?

### Current Approach: PARALLEL
```
Rules → 0.564 ─┐
               ├─→ Weighted Average → 0.578 → HIGH
ML → 0.7 ──────┘
```

**Advantages**:
1. ✅ Both models contribute to decision
2. ✅ ML can catch patterns rules miss
3. ✅ Rules provide explainability
4. ✅ Adaptive weighting based on context
5. ✅ Graceful degradation if ML fails

### Alternative: SEQUENTIAL (Rules → ML)
```
Rules → 0.564 → If HIGH → Return HIGH
              → If LOW/MEDIUM → Check ML → Adjust
```

**Disadvantages**:
1. ❌ ML only used as "second opinion"
2. ❌ ML insights ignored if rules say HIGH
3. ❌ Less flexible
4. ❌ Harder to tune

---

## Adaptive ML Weighting Strategy

The system adjusts ML weight based on context:

| Context | ML Weight | Rule Weight | Rationale |
|---------|-----------|-------------|-----------|
| **Very small amounts** (< ₹50) | 10% | 90% | Rules handle simple cases |
| **Small amounts** (< ₹200) | 15% | 85% | Rules more reliable |
| **Large amounts** (≥ ₹5,000) | 10% | 90% | High stakes, trust rules |
| **New users** (< 10 txns) | 15% | 85% | Rules more explainable |
| **Regular users** (10-50 txns) | 20% | 80% | ML learns patterns |
| **Experienced users** (> 50 txns) | 25% | 75% | ML more reliable |

**Why reduce ML weight for large amounts?**
- ML trained on synthetic data (not real-world)
- High-stakes decisions need explainability
- Rules are more conservative and safer

---

## Example Calculations

### Example 1: ₹10,000 to New Payee (Your Case)

```
Rule Score: 0.564 (56.4%)
ML Score: 0.7 (70%)
ML Weight: 10% (large amount)

Final = (0.564 × 0.9) + (0.7 × 0.1)
      = 0.508 + 0.07
      = 0.578 (57.8%)

Threshold: 0.35 (strict for large + new payee)
Result: HIGH (0.578 > 0.35)
Display: 60% (rounded from 57.8%)
```

### Example 2: ₹100 to New Payee

```
Rule Score: 0.181 (18.1%)
ML Score: 0.7 (70%)
ML Weight: 15% (small amount)

Final = (0.181 × 0.85) + (0.7 × 0.15)
      = 0.154 + 0.105
      = 0.259 (25.9%)

Threshold: 0.25 (standard)
Result: MEDIUM (0.259 > 0.25)
Display: 30% (rounded from 25.9%)
```

### Example 3: ₹10,000 to Trusted Payee

```
Rule Score: 0.35 (35%)  // Lower due to trust bonus
ML Score: 0.4 (40%)     // Lower anomaly
ML Weight: 10%

Final = (0.35 × 0.9) + (0.4 × 0.1)
      = 0.315 + 0.04
      = 0.355 (35.5%)

Threshold: 0.40 (less strict for known payee)
Result: MEDIUM (0.355 < 0.40)
Display: 40%
```

---

## When ML Matters Most

ML has the MOST impact when:

1. **Regular users** (20-25% weight)
2. **Normal amounts** (₹200-5,000)
3. **Complex patterns** that rules can't detect
4. **Behavioral anomalies** (unusual timing, hesitation)

ML has the LEAST impact when:

1. **Large amounts** (10% weight)
2. **Very small amounts** (10% weight)
3. **New users** (15% weight)
4. **High-stakes transactions**

---

## Fallback Behavior

If ML model fails (error, timeout, etc.):

```javascript
try {
  mlScore = infer(mlFeatures);
  mlEnabled = true;
} catch (error) {
  console.error('ML inference failed, falling back to rule-based only');
  mlEnabled = false;
  mlWeight = 0;  // 100% rules
}

if (mlEnabled) {
  finalScore = (ruleScore × ruleWeight) + (mlScore × mlWeight);
} else {
  finalScore = ruleScore;  // Pure rule-based
}
```

**Result**: System gracefully degrades to 100% rule-based if ML fails

---

## Console Logs (What You See)

When a transaction is processed, you'll see:

```
[AMPLIFICATION] Composite before: 0.470, Vuln score: 0.250, Amount: ₹10000
[AMPLIFICATION] Composite after: 0.564, Factor: 0.8
[HYBRID] Rule score: 0.564, ML score: 0.855, ML weight: 0.1, Amount: ₹10000
[HYBRID] ML score capped: 0.855 → 0.700

🎯 FINAL RISK CALCULATION for ₹10000:
   Category Scores: Payee=0.60, Amount=0.80, Urgency=0.00, Intent=0.25, Hesitation=0.00, Vuln=0.25
   Composite (rule) score: 0.564
   ML anomaly score: 0.855 (weight: 0.1)
   Final hybrid score: 0.578
   Risk level: HIGH (6/10)
   Action: DELAY
```

---

## Summary

**Current System**: PARALLEL HYBRID
- ✅ Rules and ML run simultaneously
- ✅ Scores combined using weighted average
- ✅ Adaptive weights based on context
- ✅ Rules dominate for high-stakes (90%)
- ✅ ML contributes insights (10-25%)
- ✅ Graceful degradation if ML fails

**Formula**:
```
final_score = (rule_score × rule_weight) + (ml_score × ml_weight)
```

**For ₹10,000 to new payee**:
```
final_score = (0.564 × 0.9) + (0.7 × 0.1) = 0.578 = 60% HIGH
```

This approach gives you the best of both worlds: explainable rule-based decisions with ML pattern detection as a supporting signal.
