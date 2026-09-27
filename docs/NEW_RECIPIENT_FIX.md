# Fix: "New Recipient" Showing After Multiple Transactions

## Problem
User reported: After 20+ transactions to the same payee (div@upi), with 5+ successful, the system still shows "new recipient"

## Root Cause
The `is_new_payee` logic was only checking if `days_since_first_transaction < 30`, but the user was making multiple transactions on the same day, so `days_since_first_transaction` was 0, which made the payee appear as "new" even after 7 transactions.

**Database evidence**:
```json
{
  "payee_id": "div@upi",
  "total_transactions": 7,
  "is_new_payee": true,  // ❌ WRONG - should be false
  "trust_score": 0,       // ❌ WRONG - should be ~4
  "days_since_first_transaction": 0,  // All transactions on same day
  "is_recurring": true
}
```

## Solution
Changed the `isNewPayee()` logic to consider BOTH time AND transaction count:

**Before**:
```javascript
isNewPayee() {
  if (this.total_transactions === 0) return true;
  return this.days_since_first_transaction < 30;  // ❌ Only checks days
}
```

**After**:
```javascript
isNewPayee() {
  if (this.total_transactions === 0) return true;
  
  const daysSinceFirst = this.days_since_first_transaction || 0;
  const successfulTxns = this.total_transactions - this.failed_transactions;
  
  // New if less than 30 days AND less than 3 successful transactions
  return daysSinceFirst < 30 && successfulTxns < 3;  // ✅ Checks both
}
```

**Logic**: A payee is considered "new" only if BOTH conditions are true:
- Less than 30 days since first transaction, AND
- Less than 3 successful transactions

This means:
- After 3 successful transactions, payee is no longer "new" (even on same day)
- After 30 days, payee is no longer "new" (even with < 3 transactions)

## Changes Applied

### 1. Updated PayeeRelationship Model
**File**: `backend/src/models/PayeeRelationship.js`

Updated `isNewPayee()` method to check both days AND transaction count.

### 2. Updated Payee Relationship Service
**File**: `backend/src/services/payeeRelationshipService.js`

Changed to use the model method instead of inline logic:
```javascript
// Before
payeeRecord.is_new_payee = daysSinceFirst < 30;

// After
payeeRecord.is_new_payee = payeeRecord.isNewPayee();
```

### 3. Updated Transaction Intent Endpoint
**File**: `backend/src/routes/transaction.js`

Updated the logic when creating/updating payee relationships in `/transaction/intent`:
```javascript
const successfulTxns = payeeRelationship.total_transactions - (payeeRelationship.failed_transactions || 0);
payeeRelationship.is_new_payee = daysSinceFirst < 30 && successfulTxns < 3;
```

Added better logging:
```javascript
console.log(`✅ Updated payee relationship: ${user_id} -> ${payee_id} (${payeeRelationship.total_transactions} transactions, is_new: ${payeeRelationship.is_new_payee})`);
```

### 4. Created Fix Script
**File**: `backend/scripts/fix-payee-relationships.js`

Script to recalculate `is_new_payee` and `trust_score` for all existing payee relationships.

## Results

### Before Fix
```
Payee: div@upi
Total transactions: 7
Is new payee: true  ❌
Trust score: 0      ❌
Is recurring: true
```

### After Fix
```
Payee: div@upi
Total transactions: 7
Is new payee: false ✅
Trust score: 4.0    ✅
Is recurring: true
```

## Testing

### Test Case 1: Multiple Transactions Same Day
1. Send 3 transactions to same payee on same day
2. After 3rd transaction, payee should no longer be "new"

**Expected**:
- Transaction 1: "new recipient" ✅
- Transaction 2: "new recipient" ✅
- Transaction 3: "new recipient" ✅
- Transaction 4: "trusted recipient" ✅ (no longer new)

### Test Case 2: Transactions Over Multiple Days
1. Send 1 transaction to payee
2. Wait 31 days
3. Send another transaction

**Expected**:
- After 31 days, payee is no longer "new" even with only 1 transaction

### Test Case 3: Failed Transactions
1. Send 5 transactions to payee, but 3 fail
2. Only 2 successful transactions

**Expected**:
- Payee should still be "new" (< 3 successful)

## Trust Score Calculation

The trust score is now being calculated correctly:

**Formula**:
```
trust_score = (base_score + success_bonus + duration_bonus) × blocking_penalty
```

**For div@upi (7 transactions, 0 failed, 0 days)**:
- Base score: 2.0 (5-9 transactions)
- Success bonus: 2.0 (100% success rate)
- Duration bonus: 0.0 (0 days)
- Blocking penalty: 1.0 (no blocks)
- **Total: 4.0** ✅

## Files Modified

1. `backend/src/models/PayeeRelationship.js` - Updated `isNewPayee()` method
2. `backend/src/services/payeeRelationshipService.js` - Use model method
3. `backend/src/routes/transaction.js` - Updated intent endpoint logic
4. `backend/scripts/fix-payee-relationships.js` - New fix script

## Running the Fix

To fix existing payee relationships:
```bash
cd backend
node scripts/fix-payee-relationships.js
```

Expected output:
```
✅ Connected to MongoDB

Found 7 payee relationships

📊 Fixing: kalp_1770736205188 -> div@upi
   Before: total_txns=7, is_new=true, trust=0
   After:  total_txns=7, is_new=false, trust=4.0

✅ All payee relationships fixed!
```

## User Experience

**Before**: 
- User sends 7 transactions to div@upi
- System shows "new recipient" every time
- Risk score stays high (new payee penalty)

**After**:
- User sends 3 transactions to div@upi
- 4th transaction shows "trusted recipient"
- Risk score decreases (trust bonus applied)
- Trust score visible: 4.0/10

## Status

✅ **FIXED**: Payee relationships now correctly track "new" status based on both time AND transaction count
✅ **TESTED**: Existing relationship fixed (div@upi: is_new=false, trust=4.0)
✅ **READY**: New transactions will correctly update payee status
