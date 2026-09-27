# DeepBlue - UPI Fraud Prevention System

A real-time fraud prevention system that analyzes UPI transaction risk **before PIN entry**. The project contains two complementary implementations: a full-stack backend API and a standalone pure logic engine.

## 🎯 Phase Status

- **Phase 1:** ✅ Complete - Rule-based risk engine with stubbed ML
- **Phase 2:** ✅ Complete - Real ML (Isolation Forest) with adaptive thresholds

> **📖 Phase 2 Quick Start:** See [PHASE2_QUICKSTART.md](./PHASE2_QUICKSTART.md)

---

## 🎯 What This System Does

Evaluates transaction risk by analyzing:
- User behavioral patterns (amount spikes, velocity)
- Payee relationships (new vs known recipients)
- Transaction context (timing, intent, hesitation signals)
- Account maturity (new users are higher risk)

**Key Innovation:** Risk assessment happens **before** the user enters their PIN, preventing fraud proactively.

---

## 🏗️ Project Structure

```
.
├── src/                          # Full-Stack Backend (Divesh's Implementation)
│   ├── models/                   # MongoDB schemas
│   │   ├── User.js              # User profile & transaction history
│   │   ├── PayeeRelationship.js # Payee trust scoring
│   │   └── Transaction.js       # Transaction records
│   ├── routes/
│   │   └── transaction.js       # API endpoints
│   ├── services/
│   │   ├── riskEngine.js        # Risk calculation logic
│   │   └── mlService.js         # ML stub (returns fake scores)
│   ├── utils/
│   │   └── redis.js             # Velocity tracking & state
│   └── server.js                # Express server
│
├── fraud-risk-engine.js         # Pure Logic Engine (Kalpesh's Implementation)
├── test-examples.js             # Standalone engine test cases
├── .env                         # Environment configuration
└── package.json
```

---

## 🧱 Tech Stack

**Backend API:**
- Node.js + Express
- MongoDB (persistent storage)
- Redis (real-time velocity tracking)
- UUID (transaction IDs)

**Standalone Engine:**
- Pure JavaScript (zero dependencies)
- Synchronous, deterministic functions
- No database, no HTTP, no side effects

---

## 🚀 Quick Start

### Prerequisites
- Node.js v14+
- MongoDB (local or remote)
- Redis (local or remote, optional)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/upi_fraud_prevention
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Train ML Model (Phase 2)
```bash
npm run train-model
```
This creates the Isolation Forest model for anomaly detection.

### 4. Start Services

**MongoDB:**
```bash
# Windows: Usually auto-starts as service
# Linux/Mac:
mongod
```

**Redis:**
```bash
redis-server
```

### 5. Start Backend Server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server runs at `http://localhost:3000`

---

## 📡 API Endpoints

### Health Check
```bash
GET /health
```
Returns server status and MongoDB connection state.

### 1. Submit Transaction Intent
```http
POST /transaction/intent
Content-Type: application/json

{
  "user_id": "user123",
  "amount": 5000,
  "payee_id": "merchant456",
  "intent_type": "purchase",
  "behavioral_signals": {
    "hesitation_time_ms": 1800,
    "amount_edit_count": 2,
    "confirmation_delay_ms": 3200
  }
}
```

**Response:**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "RECEIVED"
}
```

**Valid intent_type values:** `refund`, `receive`, `purchase`, `support`

### 2. Get Risk Decision
```http
POST /transaction/decision
Content-Type: application/json

{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "risk_level": "MEDIUM",
  "action": "WARN",
  "reason_codes": ["amount_spike", "hesitation_detected"]
}
```

### 3. Submit User Feedback
```http
POST /transaction/feedback
Content-Type: application/json

{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_action": "PROCEEDED"
}
```

**Valid user_action values:** `PROCEEDED`, `CANCELLED`

**Response:**
```json
{
  "status": "ACKNOWLEDGED"
}
```

---

## 🧪 Testing the Backend API

> **📖 For comprehensive testing instructions, see [TESTING.md](./TESTING.md)**

### Quick Test Methods

**Automated Tests:**
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

**Manual Test Script:**
```bash
# Make sure server is running first: npm start
node tests/manual-test.js
```

### Test Case 1: High Risk (New User + Large Amount)
```bash
# 1. Submit intent
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "new_user_001",
    "amount": 50000,
    "payee_id": "unknown_payee",
    "intent_type": "purchase",
    "behavioral_signals": {
      "hesitation_time_ms": 4000,
      "amount_edit_count": 5,
      "confirmation_delay_ms": 6000
    }
  }'

# 2. Get decision (use transaction_id from response)
curl -X POST http://localhost:3000/transaction/decision \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": "<YOUR_TRANSACTION_ID>"}'

# Expected: risk_level: "HIGH", action: "DELAY"
```

### Test Case 2: Low Risk (Regular User + Known Payee)
```bash
# Submit same user_id and payee_id multiple times to build trust
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "regular_user_001",
    "amount": 1000,
    "payee_id": "known_payee_001",
    "intent_type": "purchase"
  }'

# After 3-4 transactions, risk should be LOW
```

### Test Case 3: Amount Spike Detection
```bash
# 1. Establish baseline (repeat 5 times)
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "spike_test_user",
    "amount": 1000,
    "payee_id": "payee_spike",
    "intent_type": "purchase"
  }'

# 2. Submit large amount (5x baseline)
curl -X POST http://localhost:3000/transaction/intent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "spike_test_user",
    "amount": 5000,
    "payee_id": "payee_spike",
    "intent_type": "purchase"
  }'

# Expected: reason_codes includes "amount_spike"
```

---

## 🔧 Testing the Standalone Engine

The pure logic engine (`fraud-risk-engine.js`) can be tested independently:

```bash
node test-examples.js
```

**Example usage in code:**
```javascript
const { computeRisk } = require('./fraud-risk-engine');

const result = computeRisk(
  {
    amount: 2000,
    payee: 'suspicious_account',
    intent: 'refund',
    timestamp: '2025-01-15T03:00:00Z',
    payee_type: 'individual'
  },
  {
    maturity_days: 3,
    avg_amount: 50,
    known_payees: [],
    recent_txns_count_30m: 8,
    payee_relationship_type: 'new'
  }
);

console.log(result);
// Output: { features, rules, risk }
```

**Output structure:**
```javascript
{
  features: {
    is_new_payee: true,
    amount_spike_factor: 40,
    intent_mismatch: true,
    time_bucket: "night",
    velocity_30m: 8,
    user_maturity_days: 3,
    payee_relationship_score: 20,
    txn_type: "p2p"
  },
  rules: [
    { flag: true, score: 10, reason: "new_payee_detected" },
    { flag: true, score: 15, reason: "amount_spike_detected" },
    // ... more rules
  ],
  risk: {
    risk_level: "HIGH",
    reasons: ["new_payee_detected", "amount_spike_detected", ...],
    aggregate_score: 83
  }
}
```

---

## 🧠 Risk Detection Logic

### Backend API Risk Scoring
```
Risk Score = Sum of:
- New user + new payee: +3
- Amount > 3x average: +4
- Amount > 1.5x average: +2
- First transaction > ₹10,000: +3
- Hesitation > 3 seconds: +2
- Amount edits > 3: +1
- Confirmation delay > 5 seconds: +1
- Velocity > 5 txns/minute: +2
- Cooling-off period active: +1

Risk Level:
- Score ≥ 6 → HIGH (action: DELAY)
- Score 3-5 → MEDIUM (action: WARN)
- Score < 3 → LOW (action: ALLOW)
```

### Standalone Engine Risk Scoring
```
7 Rule Checks:
1. isNewPayee: +10 if payee not in known_payees
2. isAmountSpike: +15 if amount ≥ 3x average
3. isIntentMismatch: +12 if intent doesn't match payee_type
4. isUnusualHour: +8 if night/off-hours
5. isHighVelocity: +18 if ≥5 txns in 30 minutes
6. isNewUser: +10 if account < 7 days old
7. isRiskyRelationship: +15-20 if unknown/new payee

Risk Level:
- Score ≥ 40 → HIGH
- Score 20-39 → MEDIUM
- Score < 20 → LOW
```

---

## 🗄️ Database Schema

### User Collection
```javascript
{
  user_id: String (unique),
  account_age_days: Number,
  avg_transaction_amount: Number,
  transaction_count: Number,
  user_maturity_flag: "NEW" | "REGULAR" | "HEAVY"
}
```

### PayeeRelationship Collection
```javascript
{
  user_id: String,
  payee_id: String,
  payment_count: Number,
  trust_score: Number (0-1),
  last_transaction_time: Date
}
```

### Transaction Collection
```javascript
{
  transaction_id: String (unique),
  user_id: String,
  amount: Number,
  payee_id: String,
  intent_type: "refund" | "receive" | "purchase" | "support",
  risk_level: "LOW" | "MEDIUM" | "HIGH",
  action: "ALLOW" | "WARN" | "DELAY",
  reason_codes: [String],
  behavioral_signals: Object,
  user_feedback: Object
}
```

---

## ⚡ Redis Usage

**Velocity Tracking:**
- Key: `velocity:{user_id}:{window}`
- TTL: 120 seconds
- Tracks transactions per 60-second window

**Delay State:**
- Key: `delay:{transaction_id}`
- TTL: 600 seconds (10 minutes)
- Flags high-risk transactions requiring delay

**Cooling-off Flags:**
- Key: `cooling_off:{user_id}`
- TTL: 300 seconds (5 minutes)
- Protection period for new/vulnerable users

---

## 🔍 Configuration

### Backend API
Edit `.env` file:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/upi_fraud_prevention
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Standalone Engine
Edit `CONFIG` object in `fraud-risk-engine.js`:
```javascript
const CONFIG = {
  MEDIUM_THRESHOLD: 20,
  HIGH_THRESHOLD: 40,
  AMOUNT_SPIKE_MULTIPLIER: 3,
  VELOCITY_HIGH_THRESHOLD: 5,
  NIGHT_HOURS: { start: 0, end: 6 },
  OFF_HOURS: { start: 22, end: 24 }
};
```

---

## 🚫 Out of Scope (Phase 1 & 2)

- ❌ Real UPI/NPCI integration
- ❌ Frontend UI
- ❌ Authentication/authorization
- ❌ Real fraud labels (Phase 2 uses unsupervised learning)
- ❌ Transaction blocking (only warns/delays)
- ❌ Deep learning models (Phase 2 uses Isolation Forest only)
- ❌ Online model retraining (Phase 2 model is static)

---

## 🐛 Troubleshooting

**MongoDB Connection Error:**
- Verify MongoDB is running: `mongod --version`
- Check `MONGODB_URI` in `.env`
- Test connection: `mongosh mongodb://localhost:27017`

**Redis Connection Error:**
- Verify Redis is running: `redis-cli ping` (should return PONG)
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`
- Server continues without Redis (degraded functionality)

**Port Already in Use:**
- Change `PORT` in `.env`
- Or kill existing process: `npx kill-port 3000`

**Module Not Found:**
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then reinstall

---

## 📝 Notes

- Backend API automatically creates users and payee relationships on first transaction
- Redis failures are handled gracefully (server continues)
- **Phase 1:** ML service returned fake anomaly scores (0.0-1.0)
- **Phase 2:** Real ML (Isolation Forest) with adaptive thresholds and feedback loop
- Both implementations are production-ready for their respective phase requirements
- Standalone engine can be integrated into backend to replace `src/services/riskEngine.js`

## 🆕 Phase 2 Features

- **Real ML:** Isolation Forest anomaly detection
- **20 Features:** Comprehensive feature extraction (v1 contract - FROZEN)
- **Adaptive Thresholds:** Adjust based on user behavior and feedback
- **Feedback Loop:** Warnings ignored → increased sensitivity
- **Explainability:** ML contributions visible in responses

> **📖 Quick Start:** See [PHASE2_QUICKSTART.md](./PHASE2_QUICKSTART.md)  
> **📚 Full Docs:** See [docs/PHASE2_IMPLEMENTATION.md](./docs/PHASE2_IMPLEMENTATION.md)

---

## 📄 License

ISC
