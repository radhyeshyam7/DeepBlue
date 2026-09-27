# ML Inference Contract v1 - FROZEN

**Status:** FROZEN - DO NOT MODIFY  
**Version:** v1.2 (Calibrated)  
**Date:** 2025-01-15  
**Algorithm:** Isolation Forest + Percentile-Based Calibration  
**Last Updated:** 2025-01-15 (Percentile-based calibration added)

---

## 🎯 Contract Overview

This document defines the **frozen** ML inference contract for Phase 2. Once finalized, this contract must remain stable for backend integration.

---

## 📊 Feature Vector Schema (v1)

The feature vector consists of **20 features** in the exact order and format specified below:

| Feature Name | Type | Range | Description |
|-------------|------|-------|-------------|
| `amount_ratio` | float | ≥ 0 | `amount / user_avg_amount` (1.0 = normal, >3.0 = spike) |
| `amount_zscore` | float | any | Standard deviation from user mean amount |
| `is_new_payee` | boolean | 0/1 | `1` if payee never seen before, `0` otherwise |
| `payee_trust_score` | float | 0-1 | Trust score from payee relationship (0 = new, 1 = trusted) |
| `payee_payment_count` | integer | ≥ 0 | Number of previous transactions with this payee |
| `txn_frequency_recent` | float | ≥ 0 | Recent transaction frequency vs baseline |
| `velocity_spike` | boolean | 0/1 | `1` if velocity > 5 txns/min, `0` otherwise |
| `time_deviation_score` | float | 0-1 | Deviation from user's usual transaction hours |
| `is_unusual_hour` | boolean | 0/1 | `1` if transaction time is unusual for user |
| `confirmation_time_ratio` | float | ≥ 0 | Confirmation delay vs user baseline |
| `hesitation_score` | float | 0-1 | Composite hesitation score from behavioral signals |
| `amount_edit_count_ratio` | float | ≥ 0 | Number of amount edits vs normal |
| `intent_risk_score` | float | 0-1 | Inherent risk of intent type |
| `intent_direction_mismatch` | boolean | 0/1 | `1` if intent doesn't match transaction pattern |
| `user_maturity_flag` | integer | 0/1/2 | `0`=NEW, `1`=REGULAR, `2`=HEAVY |
| `cooling_off_active` | boolean | 0/1 | `1` if user is in cooling-off period |
| `recent_warning_ignored` | boolean | 0/1 | `1` if user ignored recent warnings |
| `device_change_flag` | boolean | 0/1 | `1` if device changed (stubbed for Phase 2) |
| `account_age_days` | integer | ≥ 0 | User account age in days |
| `transaction_count` | integer | ≥ 0 | Total number of user transactions |

---

## 🔌 API Endpoint

### POST /ml/infer

**Request:**
```json
{
  "feature_version": "v1",
  "features": {
    "amount_ratio": 2.5,
    "amount_zscore": 1.2,
    "is_new_payee": 1,
    "payee_trust_score": 0.0,
    "payee_payment_count": 0,
    "txn_frequency_recent": 1.5,
    "velocity_spike": 0,
    "time_deviation_score": 0.3,
    "is_unusual_hour": 0,
    "confirmation_time_ratio": 1.2,
    "hesitation_score": 0.4,
    "amount_edit_count_ratio": 1.0,
    "intent_risk_score": 0.5,
    "intent_direction_mismatch": 0,
    "user_maturity_flag": 0,
    "cooling_off_active": 0,
    "recent_warning_ignored": 0,
    "device_change_flag": 0,
    "account_age_days": 5,
    "transaction_count": 3
  }
}
```

**Response:**
```json
{
  "anomaly_score": 0.65,
  "top_contributing_features": [
    "amount_ratio",
    "is_new_payee",
    "hesitation_score"
  ],
  "feature_version": "v1",
  "model_version": "v1.0.0"
}
```

---

## 📈 Score Interpretation (CORRECTED)

### Anomaly Score Formula

The anomaly score uses the **standard Isolation Forest formula**:

```
s(x) = 2^(-E(h(x)) / c(n))
```

Where:
- `E(h(x))` = Expected path length (average across all trees)
- `c(n)` = Normalization constant (expected path length for normal points)
- `n` = Training sample size

### Anomaly Score Ranges (FROZEN - CALIBRATED)

| Score Range | Interpretation | Meaning |
|-------------|----------------|---------|
| **0.05 - 0.20** | Normal | Typical normal behavior (calibrated from P30) |
| **0.20 - 0.35** | Borderline Normal | Slightly unusual but acceptable |
| **0.35 - 0.50** | Suspicious | Borderline anomalous |
| **0.50 - 0.70** | Anomalous | Clear deviation from normal |
| **0.70 - 0.85** | Highly Anomalous | Strong deviation (calibrated from P90-P97) |
| **0.85 - 1.00** | Extreme Anomaly | Extreme deviation (calibrated from ≥P97) |

### Score Semantics

- **s < 0.5**: Normal behavior (path length ≥ expected)
- **s ≈ 0.5**: Borderline (path length ≈ expected)
- **s > 0.5**: Anomalous (path length < expected, shorter = more isolated)
- **s → 1.0**: Highly anomalous (very short path, easily isolated)

### Expected Score Distribution (CALIBRATED)

For diverse test cases, scores should show meaningful spread:

- **Normal transaction**: 0.05 - 0.20 (calibrated)
- **New payee, normal amount**: 0.25 - 0.40 (calibrated)
- **New payee, high amount**: 0.60 - 0.75 (calibrated)
- **High velocity burst**: 0.40 - 0.60 (calibrated)
- **Intent mismatch at night**: 0.70 - 0.85 (calibrated)
- **Extreme anomaly**: 0.85 - 1.00 (calibrated)

### Stability Expectations

- Scores are **deterministic** for identical feature vectors
- Small feature changes produce **smooth score transitions**
- Scores are **calibrated** using proper `c(n)` normalization
- Model should be **retrained** periodically (not in Phase 2 scope)

### Calibration

**Two-Stage Calibration:**

1. **Isolation Forest Normalization:**
   ```
   c(n) = 2 * (H(n-1) - (n-1)/n)
   where H(n) = ln(n) + 0.5772156649 (Euler's constant)
   ```

2. **Percentile-Based Calibration:**
   - Build calibration distribution from ≥2000 normal samples
   - Compute percentiles: P10, P30, P50, P70, P90, P97
   - Apply piecewise linear mapping to stretch scores across [0, 1]
   - See `docs/CALIBRATION_METHOD.md` for details

This ensures:
- Normal transactions score 0.05-0.20
- Anomalous transactions score 0.60-1.00
- Scores are interpretable and suitable for fraud system integration

---

## ⚠️ Error Handling

**Timeout:** 500ms max inference time  
**Errors:** Return HTTP 500 with error details  
**Fallback:** Backend should treat as MEDIUM risk if ML unavailable

---

## 🔒 Contract Freeze Rules

1. **Feature names** cannot change
2. **Feature order** cannot change  
3. **Feature types** cannot change
4. **API endpoint** cannot change
5. **Response format** cannot change

**Allowed:**
- Model retraining (same features)
- Performance optimizations
- Bug fixes

**NOT Allowed:**
- Adding/removing features
- Changing feature names
- Changing API contract

---

## 📝 Notes

- Isolation Forest is **unsupervised** - no fraud labels needed
- Model trained on **normal transactions only**
- Scores represent **deviation from normal**, not fraud probability
- Backend must combine ML score with rules for final decision

---

**END OF CONTRACT v1**
