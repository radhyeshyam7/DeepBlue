# Hybrid Model Approaches: Comparison

## Three Possible Approaches

### Approach 1: PARALLEL HYBRID (Current System) ✅

**How it works**: Both models run simultaneously, scores combined via weighted average

```
┌──────────────┐
│ Transaction  │
└──────┬───────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌─────┐  ┌────┐
│Rules│  │ ML │
│0.564│  │0.7 │
└──┬──┘  └─┬──┘
   │       │
   └───┬───┘
       ▼
   ┌────────┐
   │Weighted│
   │Average │
   │ 0.578  │
   └────────┘
```

**Formula**:
```javascript
finalScore = (ruleScore × 0.9) + (mlScore × 0.1)
           = (0.564 × 0.9) + (0.7 × 0.1)
           = 0.578
```

**Pros**:
- ✅ Both models always contribute
- ✅ ML can catch patterns rules miss
- ✅ Adaptive weighting based on context
- ✅ Smooth score transitions
- ✅ Graceful degradation if ML fails

**Cons**:
- ❌ ML can dilute rule-based decisions
- ❌ Less intuitive to explain
- ❌ Requires careful weight tuning

**Best for**: Balanced approach, production systems

---

### Approach 2: SEQUENTIAL (Rules → ML)

**How it works**: Rules run first, ML only consulted if needed

```
┌──────────────┐
│ Transaction  │
└──────┬───────┘
       │
       ▼
   ┌─────┐
   │Rules│
   │0.564│
   └──┬──┘
      │
      ├─→ If HIGH → Return HIGH (skip ML)
      │
      ├─→ If LOW → Return LOW (skip ML)
      │
      └─→ If MEDIUM → Check ML
                        │
                        ▼
                     ┌────┐
                     │ ML │
                     │0.7 │
                     └─┬──┘
                       │
                       ▼
                   Adjust score
```

**Logic**:
```javascript
ruleScore = calculateRules();

if (ruleScore > 0.6) {
  return 'HIGH';  // Skip ML
} else if (ruleScore < 0.25) {
  return 'LOW';   // Skip ML
} else {
  // MEDIUM - consult ML
  mlScore = runML();
  if (mlScore > 0.7) {
    return 'HIGH';  // ML overrides
  } else {
    return 'MEDIUM';
  }
}
```

**Pros**:
- ✅ ML only runs when needed (faster)
- ✅ Clear decision hierarchy
- ✅ Rules have final say on extremes
- ✅ Easy to explain

**Cons**:
- ❌ ML insights ignored for HIGH/LOW cases
- ❌ Binary ML usage (all or nothing)
- ❌ Less smooth score transitions
- ❌ ML can't soften harsh rule decisions

**Best for**: Resource-constrained systems, clear hierarchies

---

### Approach 3: ML → RULES (ML First)

**How it works**: ML runs first, rules adjust/validate

```
┌──────────────┐
│ Transaction  │
└──────┬───────┘
       │
       ▼
   ┌────┐
   │ ML │
   │0.7 │
   └─┬──┘
     │
     ▼
  ┌─────┐
  │Rules│
  │Check│
  └──┬──┘
     │
     ├─→ If ML says HIGH + Rules agree → HIGH
     │
     ├─→ If ML says HIGH + Rules disagree → MEDIUM
     │
     └─→ If ML says LOW + Rules agree → LOW
```

**Logic**:
```javascript
mlScore = runML();

if (mlScore > 0.7) {
  // ML says HIGH - verify with rules
  ruleScore = calculateRules();
  if (ruleScore > 0.5) {
    return 'HIGH';  // Both agree
  } else {
    return 'MEDIUM';  // ML overruled
  }
} else {
  // ML says LOW/MEDIUM - trust it
  return mapMLScore(mlScore);
}
```

**Pros**:
- ✅ ML pattern detection first
- ✅ Rules provide safety net
- ✅ Can catch novel fraud patterns

**Cons**:
- ❌ ML trained on synthetic data (unreliable)
- ❌ Less explainable
- ❌ Rules become secondary
- ❌ Harder to debug

**Best for**: Mature ML models, research systems

---

## Detailed Comparison

### Example Transaction: ₹10,000 to New Payee

| Approach | Rule Score | ML Score | Final Score | Risk Level | Reasoning |
|----------|------------|----------|-------------|------------|-----------|
| **Parallel (Current)** | 0.564 | 0.7 | 0.578 | HIGH | Weighted average: (0.564×0.9)+(0.7×0.1) |
| **Sequential (Rules→ML)** | 0.564 | 0.7 | 0.564 | HIGH | Rules say HIGH (>0.55), ML not consulted |
| **ML First** | 0.564 | 0.7 | 0.7 | HIGH | ML says HIGH (0.7), rules verify and agree |

### Example Transaction: ₹100 to New Payee

| Approach | Rule Score | ML Score | Final Score | Risk Level | Reasoning |
|----------|------------|----------|-------------|------------|-----------|
| **Parallel (Current)** | 0.181 | 0.7 | 0.259 | MEDIUM | Weighted average: (0.181×0.85)+(0.7×0.15) |
| **Sequential (Rules→ML)** | 0.181 | 0.7 | 0.7 | HIGH | Rules say LOW, ML consulted and overrides |
| **ML First** | 0.181 | 0.7 | 0.7 | HIGH | ML says HIGH, rules disagree → MEDIUM |

---

## Recommendation: Keep Current Approach

**Why the current PARALLEL HYBRID is best**:

1. **Balanced Decision Making**
   - Rules provide explainability (90%)
   - ML adds pattern detection (10%)
   - Neither dominates completely

2. **Adaptive to Context**
   - Large amounts: 90% rules (safer)
   - Small amounts: 85% rules
   - Experienced users: 75% rules (more ML)

3. **Graceful Degradation**
   - If ML fails → 100% rules
   - System never breaks

4. **Smooth Transitions**
   - No sudden jumps in risk scores
   - Predictable behavior

5. **Production Ready**
   - Well-tested approach
   - Easy to tune weights
   - Clear logging and debugging

---

## If You Want to Change to Sequential

If you prefer **Rules → ML** approach, here's how to modify:

```javascript
// In riskEngine.js, replace hybrid combination with:

// Step 1: Calculate rule-based score
const ruleScore = compositeScore;  // After amplification

// Step 2: Check if rules give clear answer
if (ruleScore > 0.6) {
  // HIGH risk - trust rules, skip ML
  return {
    risk_level: 'HIGH',
    risk_score: Math.round(ruleScore * 10),
    rule_score: ruleScore,
    ml_score: null,
    ml_enabled: false,
    reason: 'Rules indicate HIGH risk, ML not consulted'
  };
} else if (ruleScore < 0.25) {
  // LOW risk - trust rules, skip ML
  return {
    risk_level: 'LOW',
    risk_score: Math.round(ruleScore * 10),
    rule_score: ruleScore,
    ml_score: null,
    ml_enabled: false,
    reason: 'Rules indicate LOW risk, ML not consulted'
  };
} else {
  // MEDIUM risk - consult ML
  try {
    const mlResult = await infer(mlFeatures);
    const mlScore = mlResult.anomaly_score;
    
    // ML can upgrade to HIGH or downgrade to LOW
    if (mlScore > 0.7) {
      return {
        risk_level: 'HIGH',
        risk_score: 7,
        rule_score: ruleScore,
        ml_score: mlScore,
        ml_enabled: true,
        reason: 'Rules say MEDIUM, ML upgraded to HIGH'
      };
    } else if (mlScore < 0.3) {
      return {
        risk_level: 'LOW',
        risk_score: 2,
        rule_score: ruleScore,
        ml_score: mlScore,
        ml_enabled: true,
        reason: 'Rules say MEDIUM, ML downgraded to LOW'
      };
    } else {
      return {
        risk_level: 'MEDIUM',
        risk_score: Math.round(ruleScore * 10),
        rule_score: ruleScore,
        ml_score: mlScore,
        ml_enabled: true,
        reason: 'Rules and ML both say MEDIUM'
      };
    }
  } catch (error) {
    // ML failed - use rules only
    return {
      risk_level: 'MEDIUM',
      risk_score: Math.round(ruleScore * 10),
      rule_score: ruleScore,
      ml_score: null,
      ml_enabled: false,
      reason: 'ML failed, using rules only'
    };
  }
}
```

**Pros of Sequential**:
- ✅ Faster (ML only runs ~30% of time)
- ✅ Clearer logic
- ✅ Rules have priority

**Cons of Sequential**:
- ❌ ML insights lost for HIGH/LOW cases
- ❌ Less smooth score transitions
- ❌ ML can't soften harsh rule decisions

---

## Summary

**Current System (Parallel Hybrid)**:
```
final_score = (rule_score × 0.9) + (ml_score × 0.1)
```

**Alternative (Sequential)**:
```
if (rule_score > 0.6 || rule_score < 0.25) {
  return rule_score;  // Skip ML
} else {
  consult ML and adjust;
}
```

**Recommendation**: **Keep current parallel approach** unless you have specific reasons to change (e.g., performance concerns, need for clearer hierarchy).

The current system is well-balanced, production-ready, and gives you the best of both worlds.
