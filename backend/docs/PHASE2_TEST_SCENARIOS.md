# Phase 2 Test Scenarios

Comprehensive test scenarios to validate Phase 2 implementation.

---

## 🎯 Test Objectives

1. **ML Integration** - Verify ML inference works
2. **Adaptive Behavior** - Test threshold adjustments
3. **Feedback Loop** - Verify warnings affect future decisions
4. **Explainability** - Check reason codes and ML contributions
5. **Backward Compatibility** - Ensure Phase 1 APIs unchanged

---

## 📋 Test Scenarios

### Scenario 1: ML Anomaly Detection

**Objective:** Verify ML detects anomalous transactions

**Steps:**
1. Train model: `npm run train-model`
2. Submit high-risk transaction:
```bash
POST /transaction/intent
{
  "user_id": "ml_test_user",
  "amount": 75000,
  "payee_id": "unknown_payee",
  "intent_type": "purchase",
  "behavioral_signals": {
    "hesitation_time_ms": 5000,
    "amount_edit_count": 8,
    "confirmation_delay_ms": 7000
  }
}
```

3. Get decision:
```bash
POST /transaction/decision
{
  "transaction_id": "<from_step_2>"
}
```

**Expected:**
- `risk_level`: HIGH or MEDIUM
- `ml_anomaly_score`: > 0.5
- `reason_codes`: includes `ml_anomaly_detected`
- `ml_top_features`: non-empty array

---

### Scenario 2: Adaptive Thresholds - New User

**Objective:** Verify stricter thresholds for new users

**Steps:**
1. Submit transaction as new user:
```bash
POST /transaction/intent
{
  "user_id": "new_user_adaptive",
  "amount": 3000,
  "payee_id": "payee_1",
  "intent_type": "purchase"
}
```

2. Get decision

**Expected:**
- `risk_level`: MEDIUM or HIGH (stricter)
- Lower thresholds applied (2/5 instead of 3/6)

---

### Scenario 3: Feedback Loop - Warning Ignored

**Objective:** Verify system increases sensitivity after ignored warnings

**Steps:**
1. Submit transaction (should get WARN):
```bash
POST /transaction/intent
{
  "user_id": "feedback_test_user",
  "amount": 5000,
  "payee_id": "payee_feedback",
  "intent_type": "purchase"
}
```

2. Get decision (should be MEDIUM/WARN)

3. Submit feedback (PROCEEDED):
```bash
POST /transaction/feedback
{
  "transaction_id": "<from_step_1>",
  "user_action": "PROCEEDED"
}
```

4. Submit similar transaction:
```bash
POST /transaction/intent
{
  "user_id": "feedback_test_user",
  "amount": 5000,
  "payee_id": "payee_feedback",
  "intent_type": "purchase"
}
```

5. Get decision

**Expected:**
- Second transaction has **higher risk** than first
- Thresholds decreased (stricter)
- May escalate from WARN to DELAY

---

### Scenario 4: User Maturity Progression

**Objective:** Verify risk decreases as user matures

**Steps:**
1. Submit 5 small transactions (to become REGULAR):
```bash
# Repeat 5 times
POST /transaction/intent
{
  "user_id": "maturity_user",
  "amount": 1000,
  "payee_id": "known_payee",
  "intent_type": "purchase"
}
```

2. Submit 6th transaction (same pattern):
```bash
POST /transaction/intent
{
  "user_id": "maturity_user",
  "amount": 1200,
  "payee_id": "known_payee",
  "intent_type": "purchase"
}
```

3. Get decision

**Expected:**
- `user_maturity_flag`: REGULAR (after 5 transactions)
- 6th transaction: **LOW risk** (trusted user + known payee)
- ML weight increased (50% for HEAVY users)

---

### Scenario 5: ML vs Rules Comparison

**Objective:** Verify ML and rules work together

**Steps:**
1. Submit transaction with ML anomaly but low rule score:
```bash
POST /transaction/intent
{
  "user_id": "ml_rules_user",
  "amount": 2000,  # Normal amount
  "payee_id": "known_payee",  # Known payee
  "intent_type": "purchase",
  "behavioral_signals": {
    "hesitation_time_ms": 8000,  # High hesitation (ML will catch)
    "amount_edit_count": 10,      # Many edits (ML will catch)
    "confirmation_delay_ms": 10000 # Long delay (ML will catch)
  }
}
```

2. Get decision

**Expected:**
- ML detects anomaly (high hesitation_score)
- Rules may not flag (normal amount, known payee)
- **Combined score** reflects both signals
- `ml_top_features`: includes `hesitation_score`

---

### Scenario 6: ML Fallback Behavior

**Objective:** Verify system works if ML fails

**Steps:**
1. Stop ML service (or simulate failure)
2. Submit transaction:
```bash
POST /transaction/intent
{
  "user_id": "fallback_user",
  "amount": 5000,
  "payee_id": "payee_fallback",
  "intent_type": "purchase"
}
```

**Expected:**
- System continues to work
- Uses rule-based logic only
- `ml_anomaly_score`: 0.5 (fallback)
- `ml_weight`: 0 (no ML contribution)

---

### Scenario 7: Feature Extraction Validation

**Objective:** Verify all 20 features extracted correctly

**Steps:**
1. Submit transaction with all signals:
```bash
POST /transaction/intent
{
  "user_id": "feature_test_user",
  "amount": 10000,
  "payee_id": "new_payee_feature",
  "intent_type": "purchase",
  "behavioral_signals": {
    "hesitation_time_ms": 4000,
    "amount_edit_count": 5,
    "confirmation_delay_ms": 6000
  }
}
```

2. Call ML inference directly:
```bash
POST /ml/infer
{
  "feature_version": "v1",
  "features": { ... }  # Would be extracted by backend
}
```

**Expected:**
- All 20 features present
- Feature types correct (booleans as 0/1, floats, integers)
- Feature values in expected ranges

---

### Scenario 8: Explainability Output

**Objective:** Verify human-readable explanations

**Steps:**
1. Submit high-risk transaction
2. Get decision

**Expected Response:**
```json
{
  "risk_level": "HIGH",
  "action": "DELAY",
  "reason_codes": [
    "new_payee",
    "amount_spike",
    "ml_anomaly_detected",
    "hesitation_detected"
  ],
  "risk_score": 7.2,
  "ml_anomaly_score": 0.65,
  "ml_weight": 0.4,
  "rule_score": 5,
  "user_vulnerability_adjustment": 1,
  "ml_top_features": ["amount_ratio", "is_new_payee"]
}
```

**Validation:**
- All reason codes are human-readable
- ML contributions visible
- Score breakdown provided

---

## 🧪 Automated Test Script

Create `tests/phase2.test.js` to automate these scenarios.

---

## ✅ Validation Checklist

- [ ] ML inference returns valid scores (0-1)
- [ ] Feature extraction produces all 20 features
- [ ] Adaptive thresholds adjust based on feedback
- [ ] New users have stricter thresholds
- [ ] Warnings ignored → increased sensitivity
- [ ] User maturity affects ML weight
- [ ] ML fallback works (system continues)
- [ ] Reason codes are human-readable
- [ ] ML top features included in response
- [ ] All Phase 1 APIs unchanged
- [ ] Performance acceptable (< 600ms total)

---

## 📊 Expected Score Ranges

| Scenario | ML Score | Rule Score | Final Score | Risk Level |
|----------|----------|------------|-------------|------------|
| Normal transaction | 0.1-0.3 | 0-2 | 0-3 | LOW |
| Suspicious | 0.3-0.6 | 2-5 | 3-6 | MEDIUM |
| Anomalous | 0.6-0.8 | 4-7 | 6-9 | HIGH |
| Extreme | 0.8-1.0 | 7+ | 9+ | HIGH |

---

**Test Status:** Ready for execution
