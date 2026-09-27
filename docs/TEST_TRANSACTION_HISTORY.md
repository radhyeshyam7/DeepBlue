# Test Transaction History - Step by Step

## Prerequisites
- Backend running on http://localhost:3000
- Frontend running on http://localhost:5173
- MongoDB running and connected

---

## Test Scenario 1: Empty History

### Steps:
1. Open browser to http://localhost:5173
2. Login (if not already logged in)
3. Click "Transaction History" from home page
   OR click History icon in bottom navigation

### Expected Result:
```
✅ Shows "Transaction History" header
✅ Shows "0 transactions" count
✅ Shows stats: Total Sent: $0, This Month: 0, Protected: 0%
✅ Shows message: "No transactions yet"
✅ Shows: "Your transaction history will appear here"
```

---

## Test Scenario 2: Create and View Transactions

### Steps:

#### Step 1: Create First Transaction
1. Navigate to Home
2. Click "Send Money"
3. Enter:
   - Payee: `friend@upi`
   - Amount: `100`
   - Intent: `send`
4. Click Continue
5. Review risk analysis
6. Click Proceed
7. Enter PIN: `1234`
8. Transaction completes

#### Step 2: View History
1. Navigate to History (bottom nav or home link)

### Expected Result:
```
✅ Shows "1 transaction" count
✅ Shows stats: Total Sent: $100.00, This Month: 1, Protected: 100%
✅ Shows transaction card with:
   - Payee: friend@upi
   - Amount: -$100.00
   - Date: "Just now" or "Xh ago"
   - Risk level: LOW (green)
```

#### Step 3: Expand Transaction Details
1. Click on the transaction card

### Expected Result:
```
✅ Card expands to show:
   - Transaction ID: (UUID)
   - Intent: send
   - Status: completed (green)
   - Risk Level: LOW
   - Risk Score: X/10
   - Action: ALLOW
   - Risk Explanation: (if any)
   - Risk Factors: (reason codes as chips)
```

#### Step 4: Create More Transactions
1. Go back to Home
2. Create 2 more transactions:
   
   Transaction 2:
   - Payee: `merchant@upi`
   - Amount: `250`
   - Intent: `purchase`
   
   Transaction 3:
   - Payee: `unknown@upi`
   - Amount: `500`
   - Intent: `test`

#### Step 5: View Updated History
1. Navigate to History

### Expected Result:
```
✅ Shows "3 transactions" count
✅ Shows stats: Total Sent: $850.00, This Month: 3, Protected: 100%
✅ Shows 3 transaction cards
✅ Transactions sorted by most recent first
✅ Different risk levels visible (LOW, MEDIUM, HIGH)
```

---

## Test Scenario 3: Refresh Functionality

### Steps:
1. View transaction history
2. Open new browser tab
3. Complete a new transaction in the new tab
4. Go back to history tab
5. Click the refresh icon (top right)

### Expected Result:
```
✅ Refresh icon spins during load
✅ New transaction appears in list
✅ Stats update to reflect new transaction
✅ Transaction count increases
```

---

## Test Scenario 4: Error Handling

### Steps:
1. Stop the backend server (Ctrl+C in backend terminal)
2. Navigate to History page
3. Wait for loading to complete

### Expected Result:
```
✅ Shows error message: "Failed to load transactions"
✅ Shows "Try Again" button
✅ Shows warning icon
```

### Recovery Steps:
1. Start backend server again
2. Click "Try Again" button

### Expected Result:
```
✅ Loading spinner appears
✅ Transactions load successfully
✅ Error message disappears
```

---

## Test Scenario 5: Transaction Details

### Steps:
1. View history with multiple transactions
2. Click on a HIGH risk transaction

### Expected Result:
```
✅ Expands to show detailed information:
   - Transaction ID (truncated with ...)
   - Intent type
   - Status (completed/cancelled)
   - Risk Level with color coding
   - Risk Score (0-10)
   - Action taken (ALLOW/WARN/DELAY)
   - Risk Explanation (human-readable)
   - Risk Factors (up to 3 chips showing reason codes)
```

### Example Risk Factors:
```
- new_payee
- significant_amount_spike
- unusual_hour
```

---

## Test Scenario 6: Different Risk Levels

### Create transactions with different risk profiles:

#### LOW Risk Transaction:
```
Payee: friend@upi (existing)
Amount: 50
Intent: send
Expected: Green indicator, LOW risk
```

#### MEDIUM Risk Transaction:
```
Payee: newperson@upi (new)
Amount: 500
Intent: purchase
Expected: Amber indicator, MEDIUM risk
```

#### HIGH Risk Transaction:
```
Payee: unknown@upi (new)
Amount: 5000
Intent: test
Expected: Red indicator, HIGH risk
```

### View in History:
```
✅ Each transaction shows correct risk color
✅ Risk icons match risk level:
   - LOW: Shield icon (green)
   - MEDIUM: Alert triangle (amber)
   - HIGH: Alert triangle (red)
```

---

## Test Scenario 7: Stats Calculation

### After creating multiple transactions:

#### Total Sent:
```
Transaction 1: $100
Transaction 2: $250
Transaction 3: $500
Expected Total: $850.00
```

#### This Month:
```
All transactions created this month
Expected: 3
```

#### Protected:
```
All transactions analyzed by DeepBlue
Expected: 100%
```

---

## Test Scenario 8: Date Formatting

### Create transactions at different times:

#### Just Now:
```
Create transaction → View immediately
Expected: "Just now"
```

#### Hours Ago:
```
Wait 2 hours (or modify createdAt in DB)
Expected: "2h ago"
```

#### Yesterday:
```
Modify createdAt to yesterday
Expected: "Yesterday"
```

#### Days Ago:
```
Modify createdAt to 3 days ago
Expected: "3 days ago"
```

#### Older:
```
Modify createdAt to 2 weeks ago
Expected: "2/1/2026" (date format)
```

---

## Test Scenario 9: Pagination (Backend Ready)

### Current Behavior:
```
- Loads first 50 transactions
- Backend supports limit and skip parameters
- Frontend shows all loaded transactions
```

### Future Enhancement Test:
```bash
# Test backend pagination
curl "http://localhost:3000/transaction/history/user_001?limit=10&skip=0"
curl "http://localhost:3000/transaction/history/user_001?limit=10&skip=10"
```

---

## Test Scenario 10: Multiple Users

### Steps:
1. Create transactions as user_001
2. Logout
3. Login as different user (user_002)
4. View history

### Expected Result:
```
✅ Shows only transactions for current user
✅ Does not show other users' transactions
✅ Stats calculated only for current user
```

---

## Verification Checklist

### UI/UX:
- [ ] Loading spinner shows while fetching
- [ ] Error message shows on failure
- [ ] Refresh button works
- [ ] Transactions sorted by most recent
- [ ] Click to expand/collapse works
- [ ] Back button returns to home
- [ ] Bottom nav highlights History tab
- [ ] Smooth animations on page transitions

### Data Accuracy:
- [ ] Transaction count matches database
- [ ] Total sent matches sum of amounts
- [ ] This month count is accurate
- [ ] Risk levels display correctly
- [ ] Transaction details are complete
- [ ] Date formatting is correct

### Performance:
- [ ] Loads in < 200ms for 10 transactions
- [ ] No lag when expanding details
- [ ] Smooth scrolling
- [ ] Refresh is responsive

### Error Handling:
- [ ] Graceful failure when backend down
- [ ] Try Again button works
- [ ] No console errors
- [ ] User-friendly error messages

---

## Database Verification

### Check transactions in MongoDB:
```javascript
// MongoDB shell
use upi_fraud_prevention

// Count user transactions
db.transactions.countDocuments({ user_id: "user_001" })

// View recent transactions
db.transactions.find({ user_id: "user_001" })
  .sort({ createdAt: -1 })
  .limit(5)
  .pretty()

// Check specific transaction
db.transactions.findOne({ transaction_id: "YOUR_TRANSACTION_ID" })
```

---

## API Verification

### Test backend endpoint directly:
```bash
# Get all transactions
curl http://localhost:3000/transaction/history/user_001

# Get with pagination
curl "http://localhost:3000/transaction/history/user_001?limit=5&skip=0"

# Check response format
curl -s http://localhost:3000/transaction/history/user_001 | jq .
```

### Expected Response Structure:
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "payee": "friend@upi",
      "amount": 100,
      "date": "2026-02-06T...",
      "status": "completed",
      "riskLevel": "LOW",
      "riskScore": 2,
      "intent": "send",
      "action": "ALLOW",
      "reasonCodes": [],
      "explanation": "...",
      "categoryScores": {...}
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "skip": 0,
    "hasMore": false
  }
}
```

---

## Common Issues & Solutions

### Issue: "No transactions yet" but transactions exist
**Solution:**
- Check user_id matches between frontend and backend
- Verify transactions have correct user_id in database
- Check browser console for API errors

### Issue: Loading spinner never stops
**Solution:**
- Check backend is running
- Check MongoDB is connected
- Check browser console for errors
- Verify API endpoint is correct

### Issue: Stats show $0 but transactions exist
**Solution:**
- Check amount field is number, not string
- Verify transactions array is populated
- Check console for calculation errors

### Issue: Dates show as "Invalid Date"
**Solution:**
- Verify date conversion in API function
- Check createdAt field exists in database
- Ensure date is valid ISO string

---

## Success Criteria

✅ **All tests pass**
✅ **No console errors**
✅ **Data matches database**
✅ **UI is responsive**
✅ **Error handling works**
✅ **Performance is acceptable**

---

## Next Steps After Testing

1. **If all tests pass:**
   - Mark feature as complete
   - Update documentation
   - Deploy to staging

2. **If issues found:**
   - Document issues
   - Fix bugs
   - Re-test
   - Verify fixes

3. **Future enhancements:**
   - Add infinite scroll
   - Add filters
   - Add search
   - Add export functionality

---

## Quick Test Command

```bash
# Run all tests in sequence
# (Manual testing checklist)

1. Empty history ✓
2. Create transaction ✓
3. View in history ✓
4. Expand details ✓
5. Create more transactions ✓
6. Test refresh ✓
7. Test error handling ✓
8. Verify stats ✓
9. Check different risk levels ✓
10. Verify date formatting ✓

All tests passed? ✅ Feature complete!
```
