# Testing Guide for DeepBlue Backend

This guide covers multiple ways to test the DeepBlue UPI Fraud Prevention backend API.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Manual Testing](#manual-testing)
3. [Automated Testing](#automated-testing)
4. [Test Scenarios](#test-scenarios)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js v14+
- MongoDB running (local or remote)
- Redis running (optional, but recommended)
- Backend server running (`npm start` or `npm run dev`)

### Verify Server is Running
```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"OK","timestamp":"...","mongodb":"connected"}
```

---

## 🧪 Manual Testing

### Method 1: Using cURL (Command Line)

#### Test 1: Health Check
```bash
curl http://localhost:3000/health
```

#### Test 2: Submit Transaction Intent (High Risk)
```bash
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "amount": 50000,
    "payee_id": "unknown_payee",
    "intent_type": "purchase",
    "behavioral_signals": {
      "hesitation_time_ms": 4000,
      "amount_edit_count": 5,
      "confirmation_delay_ms": 6000
    }
  }'
```

**Save the `transaction_id` from the response for the next step.**

#### Test 3: Get Risk Decision
```bash
curl -X POST http://localhost:3000/transaction/decision \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": "YOUR_TRANSACTION_ID_HERE"}'
```

#### Test 4: Submit Feedback
```bash
curl -X POST http://localhost:3000/transaction/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "YOUR_TRANSACTION_ID_HERE",
    "user_action": "PROCEEDED"
  }'
```

### Method 2: Using Postman

1. Import the collection from `API_EXAMPLES.md`
2. Set base URL: `http://localhost:3000`
3. Run requests in sequence:
   - Health Check → Transaction Intent → Decision → Feedback

### Method 3: Using PowerShell (Windows)

```powershell
# Health Check
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get

# Submit Intent
$body = @{
    user_id = "test_user_001"
    amount = 50000
    payee_id = "unknown_payee"
    intent_type = "purchase"
    behavioral_signals = @{
        hesitation_time_ms = 4000
        amount_edit_count = 5
        confirmation_delay_ms = 6000
    }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/transaction/intent" `
    -Method Post -Body $body -ContentType "application/json"

# Get Decision (use transaction_id from $response)
$decisionBody = @{
    transaction_id = $response.transaction_id
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/transaction/decision" `
    -Method Post -Body $decisionBody -ContentType "application/json"
```

---

## 🤖 Automated Testing

### Setup

Install test dependencies:
```bash
npm install --save-dev jest supertest mongodb-memory-server
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── integration/
│   ├── transaction.intent.test.js    # Test /transaction/intent endpoint
│   ├── transaction.decision.test.js  # Test /transaction/decision endpoint
│   └── transaction.feedback.test.js  # Test /transaction/feedback endpoint
└── unit/
    ├── riskEngine.test.js            # Test risk calculation logic
    └── redis.test.js                 # Test Redis utilities
```

---

## 📝 Test Scenarios

### Scenario 1: Low Risk Transaction

**Setup:** Regular user with known payee and normal transaction amount.

```bash
# Step 1: Create baseline (repeat 5 times)
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "regular_user",
    "amount": 1000,
    "payee_id": "known_payee",
    "intent_type": "purchase"
  }'

# Step 2: Submit another transaction
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "regular_user",
    "amount": 1200,
    "payee_id": "known_payee",
    "intent_type": "purchase"
  }'

# Step 3: Get decision
# Expected: risk_level: "LOW", action: "ALLOW"
```

### Scenario 2: Medium Risk (Amount Spike)

**Setup:** User with established baseline, then large transaction.

```bash
# Step 1: Establish baseline (repeat 5 times)
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "spike_user",
    "amount": 1000,
    "payee_id": "payee_spike",
    "intent_type": "purchase"
  }'

# Step 2: Submit large transaction (3x baseline)
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "spike_user",
    "amount": 3000,
    "payee_id": "payee_spike",
    "intent_type": "purchase"
  }'

# Expected: risk_level: "MEDIUM", action: "WARN", reason_codes: ["amount_spike"]
```

### Scenario 3: High Risk (New User + New Payee + High Amount)

```bash
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "brand_new_user",
    "amount": 75000,
    "payee_id": "unknown_payee",
    "intent_type": "purchase",
    "behavioral_signals": {
      "hesitation_time_ms": 5000,
      "amount_edit_count": 8,
      "confirmation_delay_ms": 7000
    }
  }'

# Expected: risk_level: "HIGH", action: "DELAY", multiple reason codes
```

### Scenario 4: Velocity Detection

**Test rapid transactions to trigger velocity risk.**

```bash
# Submit 6 transactions within 60 seconds
for i in {1..6}; do
  curl -X POST http://localhost:3000/transaction/intent \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"velocity_user\",
      \"amount\": 1000,
      \"payee_id\": \"payee_velocity\",
      \"intent_type\": \"purchase\"
    }"
  sleep 1
done

# Expected: Later transactions should show velocity risk
```

### Scenario 5: Error Handling

**Test invalid inputs:**

```bash
# Missing required field
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test", "amount": 1000}'
# Expected: 400 Bad Request

# Invalid intent_type
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test",
    "amount": 1000,
    "payee_id": "payee",
    "intent_type": "invalid"
  }'
# Expected: 400 Bad Request

# Invalid transaction_id
curl -X POST http://localhost:3000/transaction/decision \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": "non-existent-id"}'
# Expected: 404 Not Found
```

---

## 🔍 Testing Checklist

### Functional Tests
- [ ] Health check endpoint returns OK
- [ ] Submit transaction intent creates transaction
- [ ] Risk decision returns correct risk level
- [ ] User feedback updates transaction
- [ ] Low risk transactions return ALLOW
- [ ] Medium risk transactions return WARN
- [ ] High risk transactions return DELAY
- [ ] Amount spike detection works
- [ ] Velocity detection works
- [ ] New payee detection works
- [ ] Behavioral signals affect risk score

### Error Handling Tests
- [ ] Missing required fields return 400
- [ ] Invalid intent_type returns 400
- [ ] Invalid user_action returns 400
- [ ] Non-existent transaction_id returns 404
- [ ] Server handles MongoDB disconnection gracefully
- [ ] Server handles Redis disconnection gracefully

### Integration Tests
- [ ] User statistics update correctly
- [ ] Payee relationships update correctly
- [ ] Transaction history persists
- [ ] Redis velocity tracking works
- [ ] Delay state management works

---

## 🐛 Troubleshooting

### Tests Fail to Connect to MongoDB

**Problem:** `MongoDB connection error`

**Solutions:**
1. Ensure MongoDB is running: `mongod --version`
2. Check `MONGODB_URI` in `.env` file
3. For automated tests, MongoDB Memory Server is used automatically

### Tests Fail to Connect to Redis

**Problem:** `Redis connection error`

**Solutions:**
1. Redis is optional - server continues without it
2. For automated tests, Redis is mocked
3. Check `REDIS_HOST` and `REDIS_PORT` in `.env`

### Port Already in Use

**Problem:** `EADDRINUSE: address already in use`

**Solutions:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Or change PORT in .env
```

### Tests Timeout

**Problem:** Tests hang or timeout

**Solutions:**
1. Check MongoDB and Redis connections
2. Increase timeout in test configuration
3. Ensure test database is separate from production

---

## 📊 Expected Risk Scores

### Low Risk (< 3 points)
- Regular user (account_age_days > 30)
- Known payee (payment_count > 3)
- Normal amount (< 1.5x average)
- No behavioral signals
- Low velocity (< 5 txns/min)

### Medium Risk (3-5 points)
- New payee OR
- Amount spike (1.5x - 3x average) OR
- Some behavioral signals OR
- Moderate velocity

### High Risk (≥ 6 points)
- New user + new payee OR
- Amount > 3x average OR
- First transaction > ₹10,000 OR
- High velocity (> 5 txns/min) OR
- Multiple risk factors combined

---

## 🔗 Additional Resources

- See `API_EXAMPLES.md` for Postman collection examples
- See `README.md` for API documentation
- See `tests/` directory for automated test suites
