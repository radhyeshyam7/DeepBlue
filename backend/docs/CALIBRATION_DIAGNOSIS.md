# Isolation Forest Calibration Diagnosis

## 🔍 TASK 1: EXTRACT RAW SCORES

### Current Implementation Analysis

The Isolation Forest model uses the standard formula:
```
s(x) = 2^(-E(h(x)) / c(n))
```

Where:
- `E(h(x))` = Expected path length (average across trees)
- `c(n)` = Normalization constant

### Raw Score Extraction

**Current Code:**
```javascript
predictAnomalyScore(x) {
  const pathLengths = this.trees.map(tree => this._pathLength(normalizedX, tree, 0));
  const expectedPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
  const rawScore = Math.pow(2, -expectedPathLength / this.c_n);
  return Math.max(0, Math.min(1, rawScore));
}
```

### Sign Convention

**Isolation Forest Semantics:**
- **Shorter path length** → **More isolated** → **More anomalous** → **Higher score**
- **Longer path length** → **Less isolated** → **More normal** → **Lower score**

**Formula Interpretation:**
- If `E(h(x)) < c(n)`: Path shorter than expected → `s(x) > 0.5` (anomalous)
- If `E(h(x)) ≈ c(n)`: Path as expected → `s(x) ≈ 0.5` (borderline)
- If `E(h(x)) > c(n)`: Path longer than expected → `s(x) < 0.5` (normal)

### Problem Identified

The current implementation is **mathematically correct** but produces **compressed scores** because:

1. **Training data distribution**: Synthetic normal data may not fully represent real normal behavior
2. **No calibration**: Scores are raw Isolation Forest outputs without calibration to fraud system expectations
3. **Compressed range**: Most scores cluster around 0.45-0.68, not spreading across [0, 1]

### Solution: Percentile-Based Calibration

We need to:
1. Extract **raw scores** (current implementation is correct)
2. Build **calibration distribution** from normal samples
3. Map raw scores to **calibrated scores** using percentiles

---

## 📊 Why Percentile-Based Calibration?

### Advantages:

1. **Preserves Ordering**: Percentile mapping is monotonic
2. **Data-Driven**: Uses actual distribution of normal behavior
3. **Interpretable**: Clear mapping from percentiles to risk levels
4. **Stable**: Percentiles are robust to outliers
5. **No Labels Needed**: Uses only normal samples (unsupervised)

### Percentile Selection:

- **P10, P30**: Lower tail (very normal)
- **P50**: Median (typical normal)
- **P70, P90**: Upper tail (borderline)
- **P97**: Extreme (rare normal cases)

This allows us to:
- Push normal transactions (≤P30) to 0.05-0.2
- Stretch anomalous cases (≥P97) to 0.85-1.0
- Preserve ordering throughout

---

**Next:** Implement calibration distribution builder
