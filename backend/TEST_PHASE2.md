# Testing Phase 2 with Sample Transactions

Step-by-step guide to test the Phase 2 ML-assisted fraud prevention system.

---

## 🚀 Prerequisites

### 1. Train the ML Model (First Time Only)

```bash
npm run train-model
```

This creates the Isolation Forest model. You should see:
```
✅ Generated 1000 synthetic training samples
✅ Model training completed
✅ Model saved to src/models/ml_model.json
```

### 2. Start the Server

```bash
npm start
```

Server should start on `http://localhost:3000`

---

## 🧪 Test Scenarios

### Test 1: High Risk Transaction (New User + Large Amount)

**Scenario:** New user making a large transaction to an unknown payee with suspicious behavior.

```bash
# Step 1: Submit transaction intent
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "amount": 75000,
    "payee_id": "unknown_merchant_001",
    "intent_type": "purchase",
    "behavioral_signals": {
      "hesitation_time_ms": 5000,
      "amount_edit_count": 8,
      "confirmation_delay_ms": 7000
    }
  }'
```

**Expected Response:**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "RECEIVED"
}
```

**Save the `transaction_id` for the next step.**

```bash
# Step 2: Get risk decision (replace YOUR_TRANSACTION_ID)
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
  "risk_score": 7.5,
  "ml_anomaly_score": 0.65,
  "ml_weight": 0.3,
  "rule_score": 6,
  "user_vulnerability_adjustment": 1,
  "ml_top_features": ["amount_ratio", "is_new_payee", "hesitation_score"]
}
```

**What to Check:**
- ✅ `risk_level`: HIGH
- ✅ `action`: DELAY
- ✅ `ml_anomaly_score`: > 0.5 (ML detected anomaly)
- ✅ `reason_codes`: Includes `ml_anomaly_detected`
- ✅ `ml_top_features`: Shows top contributing features

---

### Test 2: Low Risk Transaction (Regular User + Known Payee)

**Scenario:** Established user making a normal transaction to a known payee.

```bash
# Step 1: Create baseline (submit 5 small transactions first)
for i in {1..5}; do
  curl -X POST http://localhost:3000/transaction/intent \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"regular_user_001\",
      \"amount\": 1000,
      \"payee_id\": \"known_payee_001\",
      \"intent_type\": \"purchase\"
    }"
  echo ""
done
```

**Step 2: Submit 6th transaction (should be LOW risk)**
```bash
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "regular_user_001",
    "amount": 1200,
    "payee_id": "known_payee_001",
    "intent_type": "purchase"
  }'
```

**Get decision:**
```bash
curl -X POST http://localhost:3000/transaction/decision \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": "YOUR_TRANSACTION_ID"}'
```

**Expected Response:**
```json
{
  "risk_level": "LOW",
  "action": "ALLOW",
  "reason_codes": [],
  "risk_score": 1.2,
  "ml_anomaly_score": 0.15,
  "ml_weight": 0.4,
  "rule_score": 0,
  "user_vulnerability_adjustment": 0,
  "ml_top_features": []
}
```

**What to Check:**
- ✅ `risk_level`: LOW
- ✅ `action`: ALLOW
- ✅ `ml_anomaly_score`: < 0.3 (normal behavior)
- ✅ User is now REGULAR (after 5 transactions)

---

### Test 3: Feedback Loop (Warning Ignored)

**Scenario:** User ignores a warning, system should increase sensitivity.

```bash
# Step 1: Submit transaction that gets WARN
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "feedback_test_user",
    "amount": 5000,
    "payee_id": "new_payee_feedback",
    "intent_type": "purchase"
  }'
```

**Get decision (should be MEDIUM/WARN):**
```bash
curl -X POST http://localhost:3000/transaction/decision \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": "YOUR_TRANSACTION_ID"}'
```

**Step 2: User ignores warning (PROCEEDED)**
```bash
curl -X POST http://localhost:3000/transaction/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "YOUR_TRANSACTION_ID",
    "user_action": "PROCEEDED"
  }'
```

**Step 3: Submit similar transaction (should have HIGHER risk)**
```bash
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "feedback_test_user",
    "amount": 5000,
    "payee_id": "new_payee_feedback",
    "intent_type": "purchase"
  }'
```

**Get decision:**
```bash
curl -X POST http://localhost:3000/transaction/decision \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": "YOUR_TRANSACTION_ID"}'
```

**Expected:**
- Second transaction should have **higher risk_score**
- May escalate from MEDIUM to HIGH
- `reason_codes` may include `warning_ignored`

---

### Test 4: ML Anomaly Detection

**Scenario:** ML detects anomaly even when rules don't flag it.

```bash
# Submit transaction with behavioral anomalies but normal amount/payee
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "ml_test_user",
    "amount": 2000,
    "payee_id": "known_payee_ml",
    "intent_type": "purchase",
    "behavioral_signals": {
      "hesitation_time_ms": 8000,
      "amount_edit_count": 12,
      "confirmation_delay_ms": 10000
    }
  }'
```

**Get decision:**
```bash
curl -X POST http://localhost:3000/transaction/decision \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": "YOUR_TRANSACTION_ID"}'
```

**Expected:**
- ✅ `ml_anomaly_score`: > 0.5 (ML detected behavioral anomaly)
- ✅ `ml_top_features`: Includes `hesitation_score`
- ✅ `reason_codes`: May include `ml_anomaly_detected` or `hesitation_detected`

---

### Test 5: Direct ML Inference Test

**Test the ML endpoint directly:**

```bash
curl -X POST http://localhost:3000/ml/infer \
  -H "Content-Type: application/json" \
  -d '{
    "feature_version": "v1",
    "features": {
      "amount_ratio": 3.5,
      "amount_zscore": 2.0,
      "is_new_payee": 1,
      "payee_trust_score": 0.0,
      "payee_payment_count": 0,
      "txn_frequency_recent": 2.0,
      "velocity_spike": 0,
      "time_deviation_score": 0.2,
      "is_unusual_hour": 0,
      "confirmation_time_ratio": 1.5,
      "hesitation_score": 0.6,
      "amount_edit_count_ratio": 3.0,
      "intent_risk_score": 0.5,
      "intent_direction_mismatch": 0,
      "user_maturity_flag": 0,
      "cooling_off_active": 0,
      "recent_warning_ignored": 0,
      "device_change_flag": 0,
      "account_age_days": 5,
      "transaction_count": 2
    }
  }'
```

**Expected Response:**
```json
{
  "anomaly_score": 0.65,
  "top_contributing_features": ["amount_ratio", "is_new_payee", "hesitation_score"],
  "feature_version": "v1",
  "model_version": "v1.0.0"
}
```

---

## 📊 Using PowerShell (Windows)

If you're on Windows, use PowerShell instead of curl:

### Test 1: High Risk Transaction

```powershell
# Submit intent
$body = @{
    user_id = "test_user_001"
    amount = 75000
    payee_id = "unknown_merchant_001"
    intent_type = "purchase"
    behavioral_signals = @{
        hesitation_time_ms = 5000
        amount_edit_count = 8
        confirmation_delay_ms = 7000
    }
} | ConvertTo-Json -Depth 3

$response = Invoke-RestMethod -Uri "http://localhost:3000/transaction/intent" `
    -Method Post -Body $body -ContentType "application/json"

Write-Host "Transaction ID: $($response.transaction_id)"

# Get decision
$decisionBody = @{
    transaction_id = $response.transaction_id
} | ConvertTo-Json

$decision = Invoke-RestMethod -Uri "http://localhost:3000/transaction/decision" `
    -Method Post -Body $decisionBody -ContentType "application/json"

$decision | ConvertTo-Json -Depth 5
```

---

## 🧪 Automated Test Script

Create a simple test script:

```bash
#!/bin/bash
# test-phase2.sh

BASE_URL="http://localhost:3000"

echo "🧪 Testing Phase 2 System"
echo "=========================="

# Test 1: Health Check
echo -e "\n1️⃣ Health Check..."
curl -s $BASE_URL/health | jq .

# Test 2: ML Health Check
echo -e "\n2️⃣ ML Health Check..."
curl -s $BASE_URL/ml/health | jq .

# Test 3: High Risk Transaction
echo -e "\n3️⃣ High Risk Transaction..."
INTENT_RESPONSE=$(curl -s -X POST $BASE_URL/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "amount": 75000,
    "payee_id": "unknown_merchant",
    "intent_type": "purchase",
    "behavioral_signals": {
      "hesitation_time_ms": 5000,
      "amount_edit_count": 8,
      "confirmation_delay_ms": 7000
    }
  }')

TX_ID=$(echo $INTENT_RESPONSE | jq -r '.transaction_id')
echo "Transaction ID: $TX_ID"

# Get decision
echo -e "\n4️⃣ Risk Decision..."
curl -s -X POST $BASE_URL/transaction/decision \
  -H "Content-Type: application/json" \
  -d "{\"transaction_id\": \"$TX_ID\"}" | jq .

echo -e "\n✅ Test Complete!"
```

Run with:
```bash
chmod +x test-phase2.sh
./test-phase2.sh
```

---

## ✅ Validation Checklist

After running tests, verify:

- [ ] ML model loads successfully
- [ ] Feature extraction works (20 features)
- [ ] ML inference returns scores (0-1)
- [ ] Risk decisions include ML contributions
- [ ] Adaptive thresholds work (new users stricter)
- [ ] Feedback loop works (warnings ignored → higher sensitivity)
- [ ] Explainability output present (reason codes, ML features)
- [ ] System handles errors gracefully (ML fallback)

---

## 🐛 Troubleshooting

### Model Not Found
```bash
npm run train-model
```

### ML Inference Fails
- Check MongoDB connection
- Verify model file exists: `src/models/ml_model.json`
- Check server logs for errors

### High Latency
- ML inference should be < 500ms
- If slow, check MongoDB/Redis connections

---

**Ready to test!** Start with Test 1 (High Risk Transaction) to see the ML system in action.
