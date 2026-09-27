# Isolation Forest Anomaly Scoring - Diagnosis & Fix

## 🔍 TASK 1: INSPECT ISOLATION FOREST OUTPUT

### How Isolation Forest Actually Scores Anomalies

Isolation Forest works on the principle that **anomalies are easier to isolate** (separate from the rest of the data) than normal points.

**Key Concepts:**
1. **Path Length (h(x))**: The number of edges from root to leaf in an isolation tree
2. **Expected Path Length (E(h(x)))**: Average path length across all trees
3. **Anomaly Score**: Derived from how much shorter the path is compared to expected

**Standard Isolation Forest Formula:**
```
s(x, n) = 2^(-E(h(x)) / c(n))
```
Where:
- `E(h(x))` = expected path length for point x
- `c(n)` = expected path length for normal points (normalization constant)
- `n` = sample size used in training

**Score Interpretation:**
- `s ≈ 0.5` → Normal point (path length ≈ expected)
- `s → 1.0` → Highly anomalous (much shorter path)
- `s → 0.0` → Very normal (longer path than expected)

---

## 🐛 Common Mistakes Leading to Constant/Zero Scores

### 1. **Incorrect Normalization Constant**

**Problem:** Using arbitrary divisor (e.g., `/10`) instead of proper `c(n)`

**Current Bug:**
```javascript
const normalizedScore = Math.min(avgPathLength / 10, 1.0);
```

**Issue:** 
- `c(256) ≈ 11.1`, so `/10` is close but not exact
- Doesn't account for actual training data distribution
- No calibration against normal behavior

### 2. **Inverted Score Semantics**

**Problem:** Incorrectly inverting the score

**Current Bug:**
```javascript
return 1.0 - normalizedScore; // Invert: lower path = higher anomaly
```

**Issue:**
- The inversion is correct conceptually, but the normalization is wrong
- Should use proper Isolation Forest formula: `2^(-E(h)/c(n))`

### 3. **No Calibration Against Training Data**

**Problem:** Not computing expected path length from training samples

**Issue:**
- Should compute `c(n)` from actual training data
- Should store calibration statistics during training
- Current implementation doesn't track expected path lengths

### 4. **Testing on Training-Like Data**

**Problem:** If test data is similar to training data, path lengths will be similar

**Issue:**
- Synthetic training data may not represent real anomalies
- Need diverse test cases to validate scoring

### 5. **Aggressive Clipping**

**Problem:** `Math.min(avgPathLength / 10, 1.0)` caps scores too early

**Issue:**
- Prevents high anomaly scores from being expressed
- Should use proper sigmoid/logistic transformation

---

## ✅ Correct Approach

### Standard Isolation Forest Scoring:

1. **Compute Expected Path Length for Normal Points:**
   ```
   c(n) = 2 * (H(n-1) - (n-1)/n)
   where H(n) = ln(n) + 0.5772156649 (Euler's constant)
   ```

2. **Compute Anomaly Score:**
   ```
   s(x) = 2^(-E(h(x)) / c(n))
   ```

3. **Interpretation:**
   - `s < 0.5`: Normal (path longer than expected)
   - `s ≈ 0.5`: Borderline
   - `s > 0.5`: Anomalous (path shorter than expected)
   - `s → 1.0`: Highly anomalous

### Why This Works:

- **Normal points**: Take average path length → `E(h) ≈ c(n)` → `s ≈ 0.5`
- **Anomalies**: Take shorter path → `E(h) < c(n)` → `s > 0.5`
- **Very normal**: Take longer path → `E(h) > c(n)` → `s < 0.5`

---

## 🔧 Fix Strategy

1. **Compute proper `c(n)`** during training
2. **Store calibration statistics** (expected path lengths from training samples)
3. **Use correct formula**: `2^(-E(h(x))/c(n))`
4. **Add calibration set** to validate score ranges
5. **Test on diverse inputs** to ensure score spread

---

**Next:** Implement corrected scoring in `src/ml/model.js`
