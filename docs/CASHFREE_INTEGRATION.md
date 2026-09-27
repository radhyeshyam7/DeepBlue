# 💳 Cashfree UPI Sandbox Integration Guide

This guide explains how to test the Cashfree UPI payment flow integrated into DeepBlue.

---

## 📋 Overview

The integration adds a complete payment flow:
1. **Pre-Risk Check** - Rule-based risk assessment before payment
2. **Cashfree Popup** - Payment checkout via Cashfree SDK
3. **Status Polling** - Real-time order status updates
4. **Result Display** - Final payment status with risk evaluation

---

## 🔑 Setup Cashfree DevStudio Test Keys

### Step 1: Get Test Credentials

1. Visit [Cashfree DevStudio](https://www.cashfree.com/devstudio)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Copy your **App ID** and **Secret Key** (test/sandbox keys)

### Step 2: Configure Backend

Update `backend/.env`:

```env
CASHFREE_APP_ID=YOUR_APP_ID_HERE
CASHFREE_SECRET=YOUR_SECRET_KEY_HERE
```

**Important:** Remove any quotes or extra spaces around the values.

Example:
```env
CASHFREE_APP_ID=TEST430329ae80e0f32e41a393d78b923034
CASHFREE_SECRET=TESTaf195616268bd6202eeb3bf8dc458956e7192a85
```

### Step 3: Verify Configuration

Restart your backend server and check logs for:
```
[CASHFREE] Creating order: order_...
```

If you see errors about missing credentials, double-check your `.env` file.

---

## 🚀 Testing the Payment Flow

### Flow Overview

1. **Fill Transaction Form**
   - Enter Payee UPI ID (e.g., `test@upi`)
   - Enter Amount (e.g., `1000`)
   - Select Transaction Type

2. **Risk Analysis**
   - Backend analyzes transaction risk
   - Risk level displayed: LOW, MEDIUM, or HIGH

3. **Proceed to Payment**
   - Click "Proceed" button
   - Pre-risk check runs automatically

4. **Pre-Risk Assessment**
   - System checks:
     - New merchant detection
     - Late-night transactions (20:00 - 02:00)
     - High amount (≥ ₹5000)
     - Frequency (multiple recent transactions)
   - Risk score and reasons displayed

5. **Pay Now**
   - Click "Pay Now" button
   - Cashfree popup opens
   - Complete payment in popup

6. **Status Polling**
   - After popup closes, system polls order status
   - Updates displayed in real-time

7. **Final Result**
   - SUCCESS: Payment completed
   - FAILED: Payment failed
   - Shows risk evaluation message

---

## 🧪 Testing Scenarios

### Scenario 1: Low Risk Transaction

**Input:**
- Payee: `trusted@upi` (previously used)
- Amount: `500`
- Time: Daytime (10:00 AM)

**Expected:**
- Pre-risk: LOW (score < 0.4)
- No risk factors shown
- Payment proceeds normally

### Scenario 2: High Risk Transaction

**Input:**
- Payee: `newmerchant@upi` (first time)
- Amount: `6000` (high amount)
- Time: Late night (22:00)

**Expected:**
- Pre-risk: HIGH (score ≥ 0.7)
- Risk factors: "New merchant", "Nighttime", "High amount"
- Warning displayed before payment

### Scenario 3: Medium Risk Transaction

**Input:**
- Payee: `known@upi` (previously used)
- Amount: `3000`
- Time: Late night (23:00)

**Expected:**
- Pre-risk: MEDIUM (score 0.4-0.7)
- Risk factors: "Nighttime"
- Caution displayed

---

## 🔍 API Endpoints

### POST `/cashfree/preRisk`

Pre-risk check before payment.

**Request:**
```json
{
  "userId": "user_001",
  "vpa": "test@upi",
  "amount": 1000,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response:**
```json
{
  "score": 0.55,
  "label": "MEDIUM",
  "reasons": ["Nighttime", "High amount"]
}
```

### POST `/cashfree/createOrder`

Create Cashfree order and get payment session.

**Request:**
```json
{
  "amount": 1000,
  "vpa": "test@upi",
  "customerName": "Test Customer",
  "customerEmail": "test@example.com",
  "customerPhone": "9999999999"
}
```

**Response:**
```json
{
  "orderId": "order_1234567890_abc123",
  "paymentSessionId": "session_xyz789"
}
```

### GET `/cashfree/orderStatus?orderId=...`

Get order status from Cashfree.

**Response:**
```json
{
  "status": "SUCCESS",
  "orderId": "order_1234567890_abc123",
  "amount": 1000,
  "vpa": "test@upi",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

**Status Values:**
- `PAYMENT_PENDING` - Payment initiated, waiting
- `PAYMENT_SUCCESS` - Payment successful
- `PAYMENT_FAILED` - Payment failed
- `SUCCESS` - Order completed successfully
- `FAILED` - Order failed

---

## 🛠️ Risk Engine Rules

The pre-risk engine uses four rule-based checks:

### 1. New Merchant Detection
- **Rule:** First transaction with this VPA
- **Score Impact:** +0.3
- **Reason:** "New merchant"

### 2. Late-Night Detection
- **Rule:** Transaction time between 20:00 and 02:00
- **Score Impact:** +0.25
- **Reason:** "Nighttime"

### 3. High Amount Detection
- **Rule:** Amount ≥ ₹5000
- **Score Impact:** +0.3
- **Reason:** "High amount"

### 4. Frequency Detection
- **Rule:** ≥3 transactions in last hour
- **Score Impact:** +0.2
- **Reason:** "Multiple recent transactions"

### Risk Label Calculation

- **LOW:** score < 0.4
- **MEDIUM:** 0.4 ≤ score < 0.7
- **HIGH:** score ≥ 0.7

---

## 📊 Transaction History Storage

The system uses **in-memory storage** for transaction history:

- **Merchant History:** Tracks which VPAs each user has transacted with
- **Transaction History:** Stores last 1000 transactions
- **Recent Count:** Tracks transactions in time windows

**Note:** For production, replace with SQLite or MongoDB.

---

## 🐛 Troubleshooting

### Issue: Cashfree SDK Not Loading

**Symptoms:**
- Error: "Cashfree SDK not loaded"
- Popup doesn't open

**Solution:**
1. Check `index.html` includes Cashfree script:
   ```html
   <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
   ```
2. Check browser console for script loading errors
3. Verify network connectivity

### Issue: Order Creation Fails

**Symptoms:**
- Error: "Cashfree API error: 401"
- Backend logs show authentication errors

**Solution:**
1. Verify `CASHFREE_APP_ID` and `CASHFREE_SECRET` in `.env`
2. Remove quotes/spaces around values
3. Restart backend server
4. Check backend logs for detailed error

### Issue: Polling Timeout

**Symptoms:**
- "Polling timeout" error
- Status stuck on "PAYMENT_PENDING"

**Solution:**
1. Check backend `/cashfree/orderStatus` endpoint manually
2. Verify Cashfree order exists in DevStudio dashboard
3. Increase polling attempts/timeout in `cashfreeApi.ts`

### Issue: Pre-Risk Always Returns LOW

**Symptoms:**
- All transactions show LOW risk
- No risk factors detected

**Solution:**
1. Test with new VPA (should trigger "New merchant")
2. Test with amount ≥ ₹5000 (should trigger "High amount")
3. Test at night (20:00-02:00) for "Nighttime"
4. Make multiple rapid transactions for "Frequency"

---

## 📝 Testing Checklist

- [ ] Cashfree credentials configured in `.env`
- [ ] Backend server restarted after `.env` update
- [ ] Frontend loads Cashfree SDK (check browser console)
- [ ] Pre-risk check displays correctly
- [ ] Risk factors show for high-risk scenarios
- [ ] "Pay Now" button opens Cashfree popup
- [ ] Payment completes in popup
- [ ] Status polling updates correctly
- [ ] Final status displays (SUCCESS/FAILED)
- [ ] Risk evaluation message shows correctly

---

## 🎯 DevStudio Test Mode Features

**Available:**
- ✅ Order creation
- ✅ Payment popup
- ✅ Status polling
- ✅ Test payments

**Not Available:**
- ❌ Webhooks (not needed for demo)
- ❌ KYC verification
- ❌ Production onboarding
- ❌ Real bank integration

---

## 📚 Additional Resources

- [Cashfree DevStudio](https://www.cashfree.com/devstudio)
- [Cashfree API Docs](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create)
- [Cashfree SDK Docs](https://www.cashfree.com/docs/api-reference/payments/latest/integrations/web-integration/popup-checkout)

---

## ✅ Success Indicators

When everything works correctly:

1. **Pre-Risk Check:**
   - ✅ Risk score calculated (0-1)
   - ✅ Risk label displayed (LOW/MEDIUM/HIGH)
   - ✅ Risk factors listed

2. **Payment Flow:**
   - ✅ Order created successfully
   - ✅ Cashfree popup opens
   - ✅ Payment can be completed
   - ✅ Status polling works

3. **Final Result:**
   - ✅ Payment status displayed
   - ✅ Risk evaluation message shown
   - ✅ User can complete flow

---

**Ready to test!** 🎉 Start with a low-risk transaction, then try high-risk scenarios to see the risk engine in action.
