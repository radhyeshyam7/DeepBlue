# DeepBlue Testing Guide

## Quick Start Testing

### 1. Start the System

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend  
cd frontend
npm run dev
```

### 2. Test Behavioral Signal Flow

**Steps:**
1. Open browser to `http://localhost:5173`
2. Create a transaction:
   - Payee: `test@upi`
   - Amount: `100`
   - Intent: `pay`
3. Click "Continue"
4. Observe console logs for signal transmission
5. Enter PIN: `1234`
6. Confirm transaction

**Expected Results:**
- Signals sent to `/signals/behavioral-signals`
- Risk analysis displayed
- PIN verification succeeds
- Transaction confirmed

**Verify in Database:**
```javascript
// MongoDB shell
db.users.findOne(
  { user_id: "test_user" },
  { behavioral_profile: 1 }
)

// Should show:
// - confirmation_time_avg_ms: updated
// - sample_count: incremented
// - hesitation_score_baseline: updated
```

---

### 3. Test PIN Verification

**Test Case 1: Correct PIN**
1. Create transaction
2. Enter PIN: `1234`
3. Submit

**Expected:** Transaction succeeds

**Test Case 2: Wrong PIN (3 attempts)**
1. Create transaction
2. Enter PIN: `9999` (wrong)
3. Enter PIN: `8888` (wrong)
4. Enter PIN: `7777` (wrong)

**Expected:** 
- First attempt: "Incorrect PIN. 2 attempts remaining"
- Second attempt: "Incorrect PIN. 1 attempt remaining"
- Third attempt: "Maximum attempts exceeded. Transaction locked for 5 minutes"

**Test Case 3: Check Lock Status**
```bash
curl http://localhost:3000/transaction/pin-status/YOUR_TRANSACTION_ID
```

**Expected Response:**
```json
{
  "transaction_id": "...",
  "locked": true,
  "lockedUntil": 1234567890,
  "attemptsRemaining": 0
}
```

---

### 4. Test Amount Deviation Detection

**Setup:**
Create a user with transaction history:

```bash
# Transaction 1: $100
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "amount": 100,
    "payee_id": "merchant@upi",
    "intent_type": "purchase"
  }'

# Confirm it
curl -X POST http://localhost:3000/transaction/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TRANSACTION_ID_FROM_ABOVE",
    "user_action": "PROCEEDED",
    "pin": "1234"
  }'

# Repeat 2-3 times with similar amounts ($90, $110, $95)
```

**Test Case 1: 3x Deviation**
```bash
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "amount": 300,
    "payee_id": "merchant@upi",
    "intent_type": "purchase"
  }'
```

**Expected:**
- `reason_codes` includes `"significant_amount_spike"`
- `risk_level`: `"MEDIUM"` or `"HIGH"`

**Test Case 2: 10x Deviation**
```bash
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "amount": 1000,
    "payee_id": "merchant@upi",
    "intent_type": "purchase"
  }'
```

**Expected:**
- `reason_codes` includes `"extreme_amount_deviation"`
- `risk_level`: `"HIGH"`
- `action`: `"DELAY"`

---

### 5. Test Payee Trust Evolution

**Transaction 1: New Payee**
```bash
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "amount": 100,
    "payee_id": "newperson@upi",
    "intent_type": "purchase"
  }'
```

**Expected:**
- `reason_codes` includes `"new_payee"`
- `category_scores.payee`: High (0.4+)

**Transaction 2-3: Same Payee**
Repeat the same transaction 2 more times, confirming each.

**Transaction 4: Check Trust**
```bash
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "amount": 100,
    "payee_id": "newperson@upi",
    "intent_type": "purchase"
  }'
```

**Expected:**
- `reason_codes` does NOT include `"new_payee"`
- `category_scores.payee`: Lower (0.1-0.2)
- Payee is now "recurring"

**Verify in Database:**
```javascript
db.payeerelationships.findOne({
  user_id: "test_user",
  payee_id: "newperson@upi"
})

// Should show:
// - total_transactions: 4
// - is_recurring: true
// - trust_score: 2-4 (increasing)
```

---

### 6. Test Behavioral Baseline Evolution

**Setup:**
Create 5 transactions with varying confirmation times:

```javascript
// Transaction 1: Fast confirmation (2 seconds)
// Transaction 2: Normal (3 seconds)
// Transaction 3: Slow (10 seconds) ← Outlier
// Transaction 4: Normal (3 seconds)
// Transaction 5: Normal (2.5 seconds)
```

**Check Baseline After Each:**
```javascript
db.users.findOne(
  { user_id: "test_user" },
  { "behavioral_profile.confirmation_time_avg_ms": 1 }
)
```

**Expected Evolution:**
```
After Txn 1: 2000ms
After Txn 2: 2300ms (EMA: 0.3×3000 + 0.7×2000)
After Txn 3: 4610ms (spike absorbed)
After Txn 4: 4027ms (recovering)
After Txn 5: 3569ms (back to normal)
```

**Test Deviation Detection:**
After baseline stabilizes around 3000ms, create a transaction with 8000ms confirmation:

**Expected:**
- `reason_codes` includes `"unusual_confirmation_delay"`
- `category_scores.hesitation`: Elevated

---

### 7. Test Risk Weight Balance

**Scenario: New Payee + Large Amount**

```bash
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "amount": 5000,
    "payee_id": "unknown@upi",
    "intent_type": "purchase"
  }'
```

**Expected Risk Breakdown:**
```json
{
  "category_scores": {
    "payee": 0.4,      // 30% weight → 0.12 contribution
    "amount": 0.5,     // 25% weight → 0.125 contribution
    "urgency": 0.2,    // 15% weight → 0.03 contribution
    "intent": 0.1,     // 10% weight → 0.01 contribution
    "hesitation": 0.1, // 10% weight → 0.01 contribution
    "vulnerability": 0.3 // 10% weight → 0.03 contribution
  },
  "composite_score": 0.325,  // Sum of weighted scores
  "risk_level": "MEDIUM",
  "action": "WARN"
}
```

**Verify:**
- Payee and Amount are primary drivers
- No single category dominates
- Composite score is balanced

---

### 8. Test Escalation Pattern Detection

**Setup:**
Create 3 transactions in quick succession with increasing amounts:

```bash
# Transaction 1: $50
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "amount": 50,
    "payee_id": "scammer@upi",
    "intent_type": "purchase"
  }'

# Confirm it
curl -X POST http://localhost:3000/transaction/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TXN_1_ID",
    "user_action": "PROCEEDED",
    "pin": "1234"
  }'

# Transaction 2: $100 (2x)
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "amount": 100,
    "payee_id": "scammer@upi",
    "intent_type": "purchase"
  }'

# Confirm it
curl -X POST http://localhost:3000/transaction/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TXN_2_ID",
    "user_action": "PROCEEDED",
    "pin": "1234"
  }'

# Transaction 3: $300 (6x first, 3x second)
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "amount": 300,
    "payee_id": "scammer@upi",
    "intent_type": "purchase"
  }'
```

**Expected:**
- `reason_codes` includes `"amount_escalation_pattern"`
- `risk_level`: `"HIGH"`
- `action`: `"DELAY"`

---

## Database Inspection Commands

### Check User Profile
```javascript
db.users.findOne(
  { user_id: "test_user" },
  {
    behavioral_profile: 1,
    transaction_stats: 1,
    pin_hash: 1,
    total_transactions: 1
  }
)
```

### Check Recent Transactions
```javascript
db.transactions.find(
  { user_id: "test_user" },
  {
    transaction_id: 1,
    amount: 1,
    risk_level: 1,
    reason_codes: 1,
    category_scores: 1,
    behavioral_signals: 1
  }
).sort({ createdAt: -1 }).limit(5)
```

### Check Payee Relationships
```javascript
db.payeerelationships.find(
  { user_id: "test_user" },
  {
    payee_id: 1,
    trust_score: 1,
    total_transactions: 1,
    is_recurring: 1,
    avg_amount: 1
  }
)
```

---

## Common Issues & Solutions

### Issue: Signals Not Updating Baseline
**Symptom:** `behavioral_profile.sample_count` not incrementing

**Solution:**
1. Check transaction status is `CONFIRMED`
2. Verify `/transaction/feedback` was called with `user_action: "PROCEEDED"`
3. Check backend logs for `updateBehavioralProfile` errors

### Issue: PIN Always Fails
**Symptom:** Correct PIN (1234) returns "Incorrect PIN"

**Solution:**
1. Check `DEMO_MODE` is `true` in `pinVerification.js`
2. Verify PIN is sent as string, not number
3. Check backend logs for PIN verification errors

### Issue: Risk Score Always Low
**Symptom:** All transactions show `risk_level: "LOW"`

**Solution:**
1. Verify user has transaction history (not first transaction)
2. Check `transaction_stats.avg_transaction_amount` is set
3. Ensure payee relationships are being created
4. Review `category_scores` to see which categories are scoring

### Issue: Behavioral Signals Not Sent
**Symptom:** No POST to `/signals/behavioral-signals`

**Solution:**
1. Check `signalCapture.onTransactionStart()` is called
2. Verify `signalCapture.onSubmission()` is called
3. Check browser console for fetch errors
4. Ensure backend route is registered at `/signals`

---

## Performance Benchmarks

### Expected Response Times
- `/transaction/intent`: < 200ms
- `/signals/behavioral-signals`: < 50ms
- `/transaction/feedback`: < 150ms (with PIN verification)

### Database Operations
- User profile update: < 50ms
- Payee relationship update: < 30ms
- Behavioral baseline update: < 40ms

### Memory Usage
- Frontend signal buffer: < 1MB per session
- Backend retry tracking: < 100KB per 1000 transactions

---

## Production Readiness Checklist

- [x] Behavioral signal capture working
- [x] User baselines updating correctly
- [x] Payee relationships tracking
- [x] Amount deviation detection
- [x] PIN verification with retry limits
- [x] Risk weight balance
- [ ] Frontend PIN integration (1 line fix needed)
- [ ] UI navigation and app shell
- [ ] End-to-end testing complete
- [ ] Load testing performed
- [ ] Security audit completed
- [ ] Documentation finalized

---

## Next Steps

1. **Fix Frontend PIN Integration**
   - Update `App.tsx` handlePinSubmit to pass PIN parameter
   - Test PIN verification flow end-to-end

2. **Add UI Navigation**
   - Implement app shell with bottom navigation
   - Add transaction history view
   - Add profile/settings view

3. **Comprehensive Testing**
   - Run all test scenarios above
   - Verify database updates
   - Check error handling

4. **Performance Testing**
   - Load test with 100+ concurrent users
   - Verify response times under load
   - Check memory usage over time

5. **Security Audit**
   - Review PIN hashing (upgrade to bcrypt)
   - Audit API endpoints for vulnerabilities
   - Test rate limiting and brute force protection
