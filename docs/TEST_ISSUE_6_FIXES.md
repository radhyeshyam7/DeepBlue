# Testing Guide: Issue 6 Fixes

## Quick Test Steps

### 1. Verify User Profile is Fixed
```bash
cd backend
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/upi_fraud_prevention').then(async () => { const User = require('./src/models/User'); const user = await User.findOne({ user_id: 'kalp_1770736205188' }).lean(); console.log('Total transactions:', user.total_transactions); console.log('User type:', user.user_type); console.log('Avg amount:', user.transaction_stats.avg_transaction_amount); process.exit(0); });"
```

**Expected Output**:
```
Total transactions: 8
User type: REGULAR
Avg amount: 2152.5
```

### 2. Test New ₹10,000 Transaction

**Steps**:
1. Open the app in browser
2. Login as user `kalp_1770736205188`
3. Create new transaction:
   - Amount: ₹10,000
   - Payee: `newpayee@upi` (use a NEW payee, not `div@upi`)
   - Intent: `purchase`
4. Submit transaction

**Expected Results**:
- Risk level: **HIGH** (not MEDIUM)
- Risk score: **60%+** (not 50%)
- SMS alert: Should be sent (check console logs)
- Console log should show:
  ```
  📱 Sending trusted contact alert for HIGH-risk transaction <id> (₹10000)
  ✅ Trusted contact alert sent for HIGH-risk transaction <id>
  📱 [SMS] To: +919156511790
  📱 [SMS] Message: 🚨 ALERT: kalp making risky payment of ₹10,000 to newpayee@upi. Call them NOW!
  ```

### 3. Test SMS Cooldown

**Steps**:
1. Make first ₹10,000 transaction (as above)
2. Immediately make second ₹10,000 transaction (within 10 minutes)

**Expected Results**:

**First transaction**:
```
📱 Sending trusted contact alert for HIGH-risk transaction <id1> (₹10000)
✅ Trusted contact alert sent for HIGH-risk transaction <id1>
```

**Second transaction** (within 10 minutes):
```
⏳ Trusted contact alert skipped - cooldown active for user kalp_1770736205188 (last alert: 30s ago, cooldown: 600s)
```

### 4. Test User Profile Updates After New Transaction

**Steps**:
1. Make a new transaction and CONFIRM it (click Proceed)
2. Check user profile again:
```bash
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/upi_fraud_prevention').then(async () => { const User = require('./src/models/User'); const user = await User.findOne({ user_id: 'kalp_1770736205188' }).lean(); console.log('Total transactions:', user.total_transactions); console.log('User type:', user.user_type); process.exit(0); });"
```

**Expected Output**:
```
Total transactions: 9  ← Should increment
User type: REGULAR
```

**Console should show**:
```
✅ User profile updated: kalp_1770736205188 - Total transactions: 9, User type: REGULAR
```

## What Changed

### Risk Scoring for Large Amounts
- **Before**: ₹10,000 to new payee = 50% risk (MEDIUM)
- **After**: ₹10,000 to new payee = 60%+ risk (HIGH)

### User Profile Updates
- **Before**: `total_transactions` stuck at 0, user type stuck at "NEW"
- **After**: `total_transactions` increments correctly, user type updates to REGULAR/HEAVY

### SMS Alert Logging
- **Before**: Silent failures, unclear when alerts skipped
- **After**: Clear console logs showing:
  - When SMS is sent
  - When SMS is skipped (with reason)
  - Cooldown status with elapsed time

## Troubleshooting

### If risk score is still 50% for ₹10,000:
1. Check user profile is updated: `total_transactions` should be 8+
2. Check payee is NEW (not `div@upi` which has history)
3. Check server logs for risk calculation details

### If SMS not sending:
1. Check console logs for SMS alert messages
2. Verify cooldown hasn't blocked it (10 minutes between alerts)
3. Check nominee is configured and verified:
```bash
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/upi_fraud_prevention').then(async () => { const User = require('./src/models/User'); const user = await User.findOne({ user_id: 'kalp_1770736205188' }).lean(); console.log('Nominee:', user.nominee); process.exit(0); });"
```

### If user profile not updating:
1. Check server logs for error messages
2. Verify transaction was CONFIRMED (not just INITIATED)
3. Run fix script: `node scripts/fix-user-stats.js kalp_1770736205188`

## Server Logs to Watch

When testing, watch the backend console for these key messages:

**Risk Calculation**:
```
[HYBRID] Rule score: 0.550, ML score: 0.650, ML weight: 0.25, Amount: ₹10000
```

**SMS Alerts**:
```
📱 Sending trusted contact alert for HIGH-risk transaction abc123 (₹10000)
📱 [SMS] To: +919156511790
📱 [SMS] Message: 🚨 ALERT: kalp making risky payment of ₹10,000 to newpayee@upi. Call them NOW!
✅ Trusted contact alert sent for HIGH-risk transaction abc123
```

**User Profile Updates**:
```
✅ User profile updated: kalp_1770736205188 - Total transactions: 9, User type: REGULAR
```

**Payee Relationship Updates**:
```
✅ Created new payee relationship: kalp_1770736205188 -> newpayee@upi
```
