# Phase 2 Quick Start Guide

Get Phase 2 up and running in 5 minutes.

---

## 🚀 Quick Setup

### 1. Install Dependencies (if not done)
```bash
npm install
```

### 2. Train the ML Model
```bash
npm run train-model
```

This creates `src/models/ml_model.json` with the trained Isolation Forest model.

### 3. Start the Server
```bash
npm start
```

Server runs on `http://localhost:3000`

---

## 🧪 Quick Test

### Test ML Inference

```bash
# Health check
curl http://localhost:3000/health

# ML health check
curl http://localhost:3000/ml/health
```

### Test Transaction with ML

```bash
# Submit transaction
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_phase2",
    "amount": 50000,
    "payee_id": "unknown_payee",
    "intent_type": "purchase",
    "behavioral_signals": {
      "hesitation_time_ms": 4000,
      "amount_edit_count": 5,
      "confirmation_delay_ms": 6000
    }
  }'

# Get decision (use transaction_id from response)
curl -X POST http://localhost:3000/transaction/decision \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": "YOUR_TRANSACTION_ID"}'
```

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
  "ml_top_features": ["amount_ratio", "is_new_payee"]
}
```

---

## 📚 What's New in Phase 2

1. **Real ML** - Isolation Forest anomaly detection
2. **20 Features** - Comprehensive feature extraction
3. **Adaptive Thresholds** - Adjust based on user behavior
4. **Feedback Loop** - Warnings ignored → increased sensitivity
5. **Explainability** - ML contributions visible in responses

---

## 🔍 Key Differences from Phase 1

| Feature | Phase 1 | Phase 2 |
|---------|---------|---------|
| ML Score | Fake (random 0-0.3) | Real (Isolation Forest) |
| Features | None | 20 features (v1) |
| Thresholds | Static | Adaptive |
| Feedback | No effect | Adjusts sensitivity |
| Explainability | Basic | ML + Rules breakdown |

---

## 📖 Documentation

- **ML Contract:** `docs/ML_CONTRACT_v1.md` (FROZEN)
- **Implementation:** `docs/PHASE2_IMPLEMENTATION.md`
- **Test Scenarios:** `docs/PHASE2_TEST_SCENARIOS.md`

---

## ⚠️ Important Notes

1. **Train model first** - Run `npm run train-model` before using
2. **ML contract is frozen** - Don't modify feature schema
3. **Backward compatible** - All Phase 1 APIs unchanged
4. **Fallback works** - System continues if ML fails

---

## 🐛 Troubleshooting

### Model Not Found
```bash
# Train the model
npm run train-model
```

### ML Inference Fails
- Check MongoDB connection (for feature extraction)
- Model loads automatically on first call
- System falls back to rule-based if ML unavailable

### High Latency
- ML inference: < 500ms
- Feature extraction: < 100ms
- Total: < 600ms

---

**Ready to test!** See `docs/PHASE2_TEST_SCENARIOS.md` for comprehensive test cases.
