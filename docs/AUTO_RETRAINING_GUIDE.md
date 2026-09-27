# Auto-Retraining Implementation Guide

## 🎯 Problem
**Current:** Model trained once on synthetic data, never updates with real transactions.

**Solution:** Automatic retraining using real LOW-risk transactions from your database.

---

## ✅ What I Added

### 1. Auto-Retraining Service (`backend/src/services/autoRetraining.js`)
- Automatically retrains model every 24 hours
- Uses real LOW-risk, CONFIRMED transactions
- Requires minimum 100 transactions before retraining
- Runs in background without blocking server

### 2. ML API Routes (`backend/src/routes/ml.js`)
- `POST /ml/retrain` - Manually trigger retraining
- `GET /ml/status` - Check retraining status
- `GET /ml/health` - Check if model is loaded

### 3. Server Integration
- Auto-retraining starts automatically on server startup
- Checks every hour if retraining is needed
- First check happens 5 minutes after startup

---

## 🚀 How It Works

### Automatic Retraining Flow
```
1. Server starts → Scheduler starts
2. Every hour → Check conditions:
   - Has 24 hours passed since last retrain?
   - Do we have ≥100 LOW-risk transactions?
3. If YES → Retrain:
   - Fetch LOW-risk, CONFIRMED transactions
   - Extract features from real data
   - Train new Isolation Forest model
   - Build calibration
   - Save model to disk
   - Clear cache (forces reload)
4. Model now uses real data!
```

### What Gets Trained On
- **Only LOW-risk transactions** (risk_level: 'LOW')
- **Only CONFIRMED transactions** (payment_status: 'CONFIRMED')
- **Last 2000 transactions** (most recent behavior)
- **Real feature vectors** extracted from actual user behavior

---

## 🔧 Configuration

Edit `backend/src/services/autoRetraining.js`:

```javascript
const RETRAINING_CONFIG = {
  MIN_TRANSACTIONS: 100,        // Minimum before retraining
  RETRAINING_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  AUTO_RETRAIN_ENABLED: true,   // Enable/disable
  USE_REAL_DATA: true           // Use real vs synthetic
};
```

---

## 🧪 Testing

### 1. Check Status
```bash
curl http://localhost:3000/ml/status
```

**Expected Output:**
```json
{
  "enabled": true,
  "lastRetrainingTime": "2025-02-10T12:00:00.000Z",
  "inProgress": false,
  "config": {
    "MIN_TRANSACTIONS": 100,
    "RETRAINING_INTERVAL": 86400000,
    "AUTO_RETRAIN_ENABLED": true,
    "USE_REAL_DATA": true
  }
}
```

### 2. Manual Retrain
```bash
curl -X POST http://localhost:3000/ml/retrain
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Model retrained successfully",
  "retrained": true,
  "duration": 12.45,
  "trainingSize": 523,
  "timestamp": "2025-02-10T12:00:00.000Z"
}
```

### 3. Check Server Logs
```bash
npm start
```

**Expected Logs:**
```
🚀 Server running on port 3000
🔄 Starting auto-retraining scheduler...
   - Minimum transactions: 100
   - Check interval: 24 hours
🔍 Initial retraining check on startup...
📊 Fetching normal transactions from database...
✅ Found 523 normal transactions
🔧 Extracting features from transactions...
✅ Extracted 523 feature vectors
🧠 Training new model...
✅ Model training completed
📊 Building calibration...
✅ Calibration completed
✅ Model saved to src/models/ml_model.json
🎉 Retraining completed in 12.45s
📈 Training data: 523 real transactions
```

---

## 📊 Verification Steps

### Step 1: Generate Test Transactions
```bash
# Submit 10 LOW-risk transactions
for i in {1..10}; do
  curl -X POST http://localhost:3000/transaction/intent \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"user_$i\",
      \"amount\": 1000,
      \"payee_id\": \"payee_$i\",
      \"intent_type\": \"purchase\"
    }"
  sleep 1
done
```

### Step 2: Confirm Transactions
```bash
# Get transaction IDs from MongoDB
# Then submit feedback for each
curl -X POST http://localhost:3000/transaction/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "YOUR_TRANSACTION_ID",
    "user_action": "PROCEEDED",
    "pin": "1234"
  }'
```

### Step 3: Check Transaction Count
```bash
# Check how many LOW-risk transactions exist
curl http://localhost:3000/debug/transactions?limit=100 | grep "LOW"
```

### Step 4: Trigger Manual Retrain
```bash
curl -X POST http://localhost:3000/ml/retrain
```

### Step 5: Verify Model Updated
```bash
# Check model file timestamp
ls -lh backend/src/models/ml_model.json

# Should show recent modification time
```

---

## ⚙️ How to Enable/Disable

### Disable Auto-Retraining
Edit `backend/src/services/autoRetraining.js`:
```javascript
const RETRAINING_CONFIG = {
  AUTO_RETRAIN_ENABLED: false,  // Set to false
  // ... rest of config
};
```

### Change Retraining Frequency
```javascript
const RETRAINING_CONFIG = {
  RETRAINING_INTERVAL: 12 * 60 * 60 * 1000, // 12 hours instead of 24
  // ... rest of config
};
```

### Change Minimum Transactions
```javascript
const RETRAINING_CONFIG = {
  MIN_TRANSACTIONS: 50,  // Lower threshold for testing
  // ... rest of config
};
```

---

## 🎯 Expected Behavior

### Before Retraining
- Model uses synthetic data
- Scores may not match real user behavior
- All users treated similarly

### After Retraining (with 100+ real transactions)
- Model learns from actual user patterns
- Scores reflect real behavior
- Better accuracy for fraud detection
- Personalized risk assessment

---

## 🔍 Monitoring

### Check Retraining Logs
```bash
# In server logs, look for:
🔍 Checking if retraining is needed...
📊 Fetching normal transactions from database...
✅ Found X normal transactions
🎉 Retraining completed in Xs
```

### Check Model Performance
```bash
# Compare anomaly scores before/after retraining
# Submit same transaction twice (before and after retrain)
# Scores should be more accurate after retraining
```

---

## ⚠️ Important Notes

1. **First Retrain:** Needs 100 LOW-risk, CONFIRMED transactions
2. **Frequency:** Retrains every 24 hours (configurable)
3. **Data Source:** Only uses LOW-risk transactions (normal behavior)
4. **No Downtime:** Retraining happens in background
5. **Cache Clear:** Old model cleared automatically after retrain

---

## 🚨 Troubleshooting

### "Insufficient data" Error
```
⏸️  Not enough transactions for retraining (45/100)
```
**Solution:** Generate more LOW-risk transactions or lower `MIN_TRANSACTIONS`

### "Too soon to retrain"
```
⏸️  Too soon to retrain. Wait 12 more hours
```
**Solution:** Wait or use manual retrain: `POST /ml/retrain`

### Retraining Fails
```
❌ Retraining failed: Error message
```
**Solution:** Check server logs for detailed error, verify MongoDB connection

---

## 📈 Performance Impact

- **Retraining Time:** ~10-30 seconds (depends on transaction count)
- **Memory Usage:** Temporary spike during training
- **Server Impact:** Minimal (runs in background)
- **Inference Speed:** No change (same model structure)

---

## ✅ Summary

**What Changed:**
- ✅ Model now retrains automatically every 24 hours
- ✅ Uses real LOW-risk transactions from database
- ✅ Manual retrain available via API
- ✅ Status monitoring endpoint added

**How to Use:**
1. Start server: `npm start`
2. Generate transactions (normal usage)
3. Wait for 100+ LOW-risk transactions
4. Model retrains automatically
5. Or trigger manually: `POST /ml/retrain`

**Result:**
- Model learns from real user behavior
- Better fraud detection accuracy
- Adapts to changing patterns over time
