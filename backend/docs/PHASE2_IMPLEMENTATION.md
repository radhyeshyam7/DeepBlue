# Phase 2 Implementation Guide

## Overview

Phase 2 upgrades DeepBlue from rule-based + stubbed ML to a real ML-assisted, adaptive fraud prevention system.

---

## 🎯 What Changed

### Before (Phase 1)
- Rule-based risk engine
- Fake ML scores (random 0-0.3)
- Static thresholds
- No feature extraction

### After (Phase 2)
- **Real ML** (Isolation Forest)
- **Feature extraction** (20 features, v1 contract)
- **Adaptive thresholds** (adjust based on user behavior)
- **Feedback loop** (warnings ignored → increased sensitivity)
- **Explainable decisions** (ML + rules combined)

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Transaction    │
│     Intent      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Feature         │
│  Extractor v1    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  ML Inference   │─────▶│  Isolation    │
│  Service        │      │  Forest Model │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│  Risk Engine    │
│  (ML + Rules)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Decision       │
│  (ALLOW/WARN/   │
│   DELAY)        │
└─────────────────┘
```

---

## 📊 ML Contract v1 (FROZEN)

**Document:** `docs/ML_CONTRACT_v1.md`

### Key Points:
- **20 features** in exact order
- **Isolation Forest** algorithm
- **Anomaly scores** 0-1 (higher = more anomalous)
- **API:** `POST /ml/infer`
- **Contract is FROZEN** - cannot change

---

## 🚀 Setup & Training

### 1. Train the Model

```bash
npm run train-model
```

This will:
- Generate synthetic training data (1000 samples)
- Load Phase 1 transactions (if available)
- Train Isolation Forest model
- Save model to `src/models/ml_model.json`

### 2. Start Server

```bash
npm start
```

Model loads automatically on first inference call.

---

## 🔌 API Endpoints

### Existing Endpoints (Unchanged)

All Phase 1 endpoints remain the same:

- `POST /transaction/intent` - Submit transaction
- `POST /transaction/decision` - Get risk decision
- `POST /transaction/feedback` - Submit feedback

### New Endpoints

#### `POST /ml/infer`

ML inference endpoint (internal use, but exposed for testing).

**Request:**
```json
{
  "feature_version": "v1",
  "features": {
    "amount_ratio": 2.5,
    "amount_zscore": 1.2,
    ...
  }
}
```

**Response:**
```json
{
  "anomaly_score": 0.65,
  "top_contributing_features": ["amount_ratio", "is_new_payee"],
  "feature_version": "v1",
  "model_version": "v1.0.0"
}
```

#### `GET /ml/health`

Check ML service status.

---

## 🧠 Risk Calculation

### Formula

```
final_score = (ml_score * ml_weight) + (rule_score * (1 - ml_weight)) + user_vulnerability_adjustment
```

### Components

1. **ML Score** (0-10 scale)
   - Converted from anomaly score (0-1)
   - Weight: 30-50% (adaptive)

2. **Rule Score** (0-10+ scale)
   - Traditional rule-based factors
   - Weight: 50-70% (adaptive)

3. **User Vulnerability Adjustment**
   - New users: +1
   - Warnings ignored: +2

### Adaptive Thresholds

| User Type | Low Threshold | High Threshold | ML Weight |
|-----------|---------------|----------------|-----------|
| NEW       | 2             | 5              | 30%       |
| REGULAR   | 3             | 6              | 40%       |
| HEAVY     | 4             | 7              | 50%       |

**Dynamic Adjustment:**
- Warnings ignored → thresholds decrease (stricter)
- Warnings respected → thresholds increase (more lenient, over time)

---

## 🔄 Feedback Loop

### How It Works

1. User receives `WARN` action
2. User proceeds anyway (`PROCEEDED`)
3. System detects warning ignored
4. **Adaptive thresholds updated:**
   - Low threshold: -0.5
   - High threshold: -1.0
   - Warnings ignored count: +1

### Result

Next transaction with similar risk profile → **higher sensitivity** → more likely to get `DELAY` instead of `WARN`.

---

## 📈 Explainability

### Response Format

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

### Reason Codes

Human-readable explanations:
- `new_payee` - First transaction with this payee
- `amount_spike` - Amount significantly higher than average
- `ml_anomaly_detected` - ML detected behavioral anomaly
- `hesitation_detected` - User showed hesitation signals
- `high_velocity` - Too many transactions in short time
- `warning_ignored` - User ignored recent warnings

---

## 🧪 Testing

### Test ML Inference

```bash
# Train model first
npm run train-model

# Test inference
curl -X POST http://localhost:3000/ml/infer \
  -H "Content-Type: application/json" \
  -d '{
    "feature_version": "v1",
    "features": {
      "amount_ratio": 3.0,
      "amount_zscore": 2.0,
      "is_new_payee": 1,
      ...
    }
  }'
```

### Test Adaptive Behavior

1. **Create new user transaction:**
```bash
POST /transaction/intent
{
  "user_id": "test_user",
  "amount": 50000,
  "payee_id": "new_payee",
  "intent_type": "purchase"
}
```

2. **Get decision** (should be HIGH/MEDIUM)

3. **Submit feedback (PROCEEDED):**
```bash
POST /transaction/feedback
{
  "transaction_id": "...",
  "user_action": "PROCEEDED"
}
```

4. **Submit similar transaction** → Should have **higher risk** due to adaptive thresholds

---

## 📁 File Structure

```
src/
├── ml/
│   ├── model.js              # Isolation Forest implementation
│   ├── training.js            # Model training service
│   ├── inferenceService.js    # ML inference service
│   └── featureExtractor.js   # Feature extraction (v1)
├── services/
│   ├── mlService.js          # ML service (replaces stub)
│   └── riskEngine.js         # Upgraded risk engine
├── models/
│   └── ml_model.json         # Trained model (generated)
└── routes/
    └── ml.js                 # ML API routes

docs/
├── ML_CONTRACT_v1.md         # Frozen ML contract
└── PHASE2_IMPLEMENTATION.md  # This file

scripts/
└── train-model.js            # Model training script
```

---

## ⚠️ Important Notes

### ML Contract Freeze

- **DO NOT** modify feature names, order, or types
- **DO NOT** change API contract
- Model can be retrained, but features must stay the same

### Fallback Behavior

- If ML fails → returns medium risk (0.5)
- System continues to work with rule-based logic only
- ML weight set to 0 if ML unavailable

### Performance

- ML inference: < 500ms (timeout)
- Feature extraction: < 100ms
- Total risk calculation: < 600ms

---

## 🔮 Future Enhancements (Out of Scope)

- Online model retraining
- Real fraud labels
- Deep learning models
- Multi-model ensemble
- A/B testing framework

---

## ✅ Phase 2 Checklist

- [x] ML contract v1 defined and frozen
- [x] Feature extraction implemented
- [x] Isolation Forest model trained
- [x] ML inference API created
- [x] Backend integration complete
- [x] Adaptive thresholds implemented
- [x] Feedback loop working
- [x] Explainability output added
- [x] All Phase 1 APIs unchanged
- [x] Documentation complete

---

**Phase 2 Status: ✅ COMPLETE**
