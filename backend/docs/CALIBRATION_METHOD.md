# Percentile-Based Anomaly Score Calibration

## 🔒 FROZEN CALIBRATION METHOD

**Status:** FROZEN - DO NOT MODIFY  
**Version:** v1.2 (Calibrated)  
**Date:** 2025-01-15  
**Method:** Percentile-Based Piecewise Linear Mapping

---

## 📊 Calibration Process

### Step 1: Generate Normal Samples

Generate **≥2000 synthetic normal transaction samples** using the same distribution as training data.

### Step 2: Compute Raw Scores

For each normal sample, compute raw Isolation Forest score:
```
raw_score = 2^(-E(h(x)) / c(n))
```

### Step 3: Compute Percentiles

From the distribution of raw scores, compute:
- **P10**: 10th percentile (very normal)
- **P30**: 30th percentile (normal)
- **P50**: 50th percentile (median)
- **P70**: 70th percentile (borderline)
- **P90**: 90th percentile (suspicious)
- **P97**: 97th percentile (rare normal cases)

### Step 4: Build Mapping

Apply piecewise linear mapping:

| Raw Score Percentile | Calibrated Score Range | Interpretation |
|---------------------|------------------------|----------------|
| ≤ P30 | 0.05 - 0.20 | Normal |
| P30 - P50 | 0.20 - 0.35 | Borderline Normal |
| P50 - P70 | 0.35 - 0.50 | Suspicious |
| P70 - P90 | 0.50 - 0.70 | Anomalous |
| P90 - P97 | 0.70 - 0.85 | Highly Anomalous |
| ≥ P97 | 0.85 - 1.00 | Extreme Anomaly |

---

## 🔧 Implementation

### Calibration Function

```javascript
_calibrateScore(rawScore) {
  const p = this.calibrationPercentiles;
  
  if (rawScore <= p.P30) {
    // ≤ P30: Map to 0.05-0.2 (normal)
    const ratio = (rawScore - p.P10) / (p.P30 - p.P10 || 1);
    return 0.05 + ratio * 0.15;
  } else if (rawScore <= p.P50) {
    // P30-P50: Map to 0.2-0.35
    const ratio = (rawScore - p.P30) / (p.P50 - p.P30 || 1);
    return 0.2 + ratio * 0.15;
  } else if (rawScore <= p.P70) {
    // P50-P70: Map to 0.35-0.5
    const ratio = (rawScore - p.P50) / (p.P70 - p.P50 || 1);
    return 0.35 + ratio * 0.15;
  } else if (rawScore <= p.P90) {
    // P70-P90: Map to 0.5-0.7
    const ratio = (rawScore - p.P70) / (p.P90 - p.P70 || 1);
    return 0.5 + ratio * 0.2;
  } else if (rawScore <= p.P97) {
    // P90-P97: Map to 0.7-0.85
    const ratio = (rawScore - p.P90) / (p.P97 - p.P90 || 1);
    return 0.7 + ratio * 0.15;
  } else {
    // ≥ P97: Map to 0.85-1.0
    const excess = (rawScore - p.P97) / (1.0 - p.P97 || 1);
    return 0.85 + excess * 0.15;
  }
}
```

---

## ✅ Properties

### 1. Preserves Ordering

The mapping is **monotonic**: if `rawScore1 < rawScore2`, then `calibratedScore1 < calibratedScore2`.

### 2. Smooth Transitions

Piecewise linear mapping ensures smooth transitions at percentile boundaries.

### 3. Deterministic

Same raw score always maps to same calibrated score.

### 4. Explainable

Mapping is based on data-driven percentiles, not arbitrary thresholds.

---

## 📈 Expected Score Distribution

After calibration, test cases should produce:

| Test Case | Expected Range | Interpretation |
|-----------|----------------|----------------|
| Normal transaction | 0.05 - 0.20 | Normal behavior |
| New payee, normal amount | 0.25 - 0.40 | Suspicious |
| Velocity burst | 0.40 - 0.60 | Anomalous |
| New payee, high amount | 0.60 - 0.75 | Highly anomalous |
| Intent mismatch at night | 0.70 - 0.85 | Highly anomalous |
| Extreme anomaly | 0.85 - 1.00 | Extreme |

---

## 🔒 Freeze Rules

1. **Percentile selection** cannot change (P10, P30, P50, P70, P90, P97)
2. **Score ranges** cannot change (0.05-0.2, 0.2-0.35, etc.)
3. **Mapping method** cannot change (piecewise linear)
4. **Calibration samples** must be ≥2000 normal samples

**Allowed:**
- Rebuilding calibration with new normal samples
- Performance optimizations
- Bug fixes

**NOT Allowed:**
- Changing percentile values
- Changing score ranges
- Changing mapping method
- Using supervised labels

---

## 🧪 Validation

Run validation script:
```bash
npm run validate-scoring
```

Expected results:
- Normal transactions: 0.05 - 0.20 ✅
- Anomalous transactions: 0.60 - 1.00 ✅
- Score spread: > 0.5 ✅
- Ordering preserved ✅

---

**END OF CALIBRATION METHOD v1.2**
