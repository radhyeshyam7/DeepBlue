# Quick Test & Train Guide

## Your Autoencoder Model is Ready! ✅

Everything is already set up. Here's how to test and train:

---

## 🧪 Test the Model

### Run Validation Tests
```bash
cd backend
npm run test-autoencoder
```

**What it does:**
- Generates 1,000 test samples
- Trains a test model (50 epochs)
- Validates normal vs anomalous detection
- Checks serialization accuracy
- Reports PASS/FAIL for each test

**Expected output:**
```
🎉 All tests PASSED! Autoencoder is working correctly.
```

---

## 🔄 Train the Production Model

### Retrain with Fresh Data
```bash
cd backend
npm run train-autoencoder
```

**What it does:**
- Generates 3,000 synthetic training samples
- Trains Autoencoder (100 epochs)
- Builds calibration percentiles
- Saves model to `backend/src/models/ml_model.json`
- Tests inference on sample data

**Training time:** ~10 seconds

**Expected output:**
```
✅ Training completed successfully!
   Model: Autoencoder (20 → 10 → 5 → 10 → 20)
   Features: 20
   Saved to: backend/src/models/ml_model.json
```

---

## 📊 Check Model Status

### View Current Model
```bash
# Windows (PowerShell)
Get-Content backend/src/models/ml_model.json | Select-String -Pattern "modelType|version"

# Linux/Mac
cat backend/src/models/ml_model.json | grep -E "modelType|version"
```

**Expected output:**
```
"modelType": "autoencoder",
"version": "1.0.0"
```

---

## 🚀 Use in Production

The model is **automatically loaded** by your API. No manual steps needed!

### Test with Real Transaction
```bash
# Start your backend server
cd backend
npm start

# In another terminal, test a transaction
curl -X POST http://localhost:5000/api/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "amount": 2000,
    "payee_id": "payee456",
    "intent_type": "purchase"
  }'
```

The response will include:
```json
{
  "risk_score": 0.35,
  "risk_level": "LOW",
  "ml_score": 0.28,
  "rule_score": 0.37,
  "action": "ALLOW"
}
```

---

## 🔍 Verify Integration

### Check if Autoencoder is Being Used
```bash
# Start backend with logs
cd backend
npm start

# Look for this in logs:
# "📊 Building calibration from 3000 normal samples..."
# "✅ Calibration percentiles computed"
```

### Test Different Transaction Amounts

| Amount | Expected ML Score | Expected Risk Level |
|--------|------------------|---------------------|
| ₹50 | 0.10-0.20 | LOW |
| ₹2,000 | 0.25-0.35 | LOW |
| ₹10,000 | 0.40-0.60 | MEDIUM |
| ₹50,000 | 0.70-0.90 | HIGH |

---

## 🛠️ Troubleshooting

### Model Not Loading?
```bash
# Retrain the model
cd backend
npm run train-autoencoder

# Restart backend
npm start
```

### Tests Failing?
```bash
# Check Node.js version (need 14+)
node --version

# Reinstall dependencies
npm install

# Run tests again
npm run test-autoencoder
```

### Scores Look Wrong?
```bash
# Retrain with fresh data
npm run train-autoencoder

# Check calibration percentiles in output
# Should see P10, P30, P50, P70, P90, P97
```

---

## 📈 Performance Monitoring

### Check Model Accuracy
After running real transactions, check the distribution:

```javascript
// In your backend logs, look for:
// "ML Score: 0.28" (normal transactions should be 0.1-0.4)
// "ML Score: 0.75" (suspicious transactions should be 0.6-1.0)
```

### Retrain with Real Data
Once you have 100+ real transactions:

1. The auto-retraining service will trigger automatically (every 24 hours)
2. Or manually trigger: `POST /api/admin/retrain`
3. Or run script: `node backend/scripts/train-autoencoder.js`

---

## ✅ Quick Checklist

Before deploying to production:

- [ ] Run `npm run test-autoencoder` - All tests pass
- [ ] Run `npm run train-autoencoder` - Model trained successfully
- [ ] Check `backend/src/models/ml_model.json` exists
- [ ] Start backend: `npm start` - No errors
- [ ] Test transaction API - Returns risk scores
- [ ] Verify ML scores are in expected range (0.1-0.4 for normal)

---

## 🎯 Summary

**Your model is ready!** Just run:

```bash
cd backend

# Test it
npm run test-autoencoder

# Train it (if needed)
npm run train-autoencoder

# Use it
npm start
```

That's it! The Autoencoder is integrated and working. 🎉

---

**Need Help?**
- Check `AUTOENCODER_VERIFICATION_COMPLETE.md` for detailed info
- Check `AUTOENCODER_REPLACEMENT_COMPLETE.md` for technical details
- Check logs in backend console for debugging
