# DeepBlue UPI Fraud Prevention System - Complete Analysis

## 📋 Project Overview

**DeepBlue** is a real-time fraud prevention system for UPI (Unified Payments Interface) transactions. The key innovation is that it analyzes transaction risk **BEFORE** the user enters their PIN, enabling proactive fraud prevention.

### Core Purpose
- Evaluate transaction risk in real-time
- Analyze user behavioral patterns
- Assess payee relationships and trust scores
- Detect anomalies using Machine Learning (Isolation Forest)
- Provide risk-based recommendations (ALLOW, WARN, DELAY)

### Current Status
- **Phase 1:** ✅ Complete - Rule-based risk engine
- **Phase 2:** ✅ Complete - Real ML with Isolation Forest + Adaptive thresholds
- **Gap 1:** ✅ Complete - User Behavioral Baselines with EMA (Exponential Moving Average)

---

## 🏗️ Architecture

### Tech Stack
- **Backend:** Node.js + Express
- **Database:** MongoDB (persistent storage for users, transactions, payee relationships)
- **Cache:** Redis (real-time velocity tracking, cooling-off flags, delay states)
- **ML Model:** Isolation Forest (unsupervised anomaly detection)
- **Testing:** Jest + MongoDB Memory Server

### Key Components

1. **Risk Engine** (`src/services/riskEngine.js`)
   - Rule-based risk scoring
   - Combines ML anomaly scores with business rules
   - Adaptive thresholds based on user feedback

2. **ML Service** (`src/ml/`)
   - **model.js:** Isolation Forest implementation
   - **training.js:** Model training with synthetic data
   - **inferenceService.js:** Real-time anomaly detection
   - **featureExtractor.js:** Extracts 20 features from transaction data

3. **Behavioral Profiling** (`src/services/behavioralProfile.js`)
   - Tracks user behavioral baselines using EMA
   - Monitors: confirmation time, amount edits, hesitation, interaction time
   - Confidence levels: LOW (<5 samples), MEDIUM (5-20), HIGH (≥20)

4. **Redis Cache** (`src/utils/redis.js`)
   - Velocity tracking (transactions per minute)
   - Cooling-off flags (protection for new users)
   - Delay states (high-risk transaction holds)

---

## 🎯 Key Features

### 1. Risk Assessment
Analyzes multiple dimensions:
- **User Behavior:** Amount spikes, velocity, transaction patterns
- **Payee Trust:** New vs known recipients, payment history
- **Context:** Time of day, intent type, hesitation signals
- **Account Maturity:** New users flagged as higher risk
- **ML Anomaly Score:** Isolation Forest detects unusual patterns

### 2. Behavioral Baselines (Gap 1)
- Uses Exponential Moving Average (EMA) to track user norms
- Formula: `new_baseline = 0.4 × current + 0.6 × old_baseline`
- Tracks 4 metrics: confirmation time, amount edits, hesitation, interaction time
- Confidence progression: LOW → MEDIUM → HIGH (based on sample count)

### 3. ML Anomaly Detection (Phase 2)
- **Algorithm:** Isolation Forest (unsupervised learning)
- **Features:** 20-dimensional feature vector (frozen v1 contract)
- **Calibration:** Two-stage calibration for accurate scoring
  - Stage 1: Isolation Forest normalization (c(n) constant)
  - Stage 2: Percentile-based calibration (P10, P30, P50, P70, P90, P97)
- **Score Range:** 0.05-0.20 (normal) to 0.85-1.00 (extreme anomaly)

### 4. Adaptive Thresholds
- Adjusts sensitivity based on user feedback
- If warnings ignored → increase sensitivity
- Prevents false positives while maintaining security

### 5. Real-time Velocity Tracking
- Redis-based transaction counting
- Detects burst patterns (>5 txns/minute)
- Cooling-off periods for vulnerable users

---

## 📊 20 ML Features (v1 Contract - FROZEN)

| # | Feature | Type | Description |
|---|---------|------|-------------|
| 1 | amount_ratio | float | Amount vs user average |
| 2 | amount_zscore | float | Standard deviation from mean |
| 3 | is_new_payee | bool | Never seen payee before |
| 4 | payee_trust_score | float | Trust score (0-1) |
| 5 | payee_payment_count | int | Previous payments to payee |
| 6 | txn_frequency_recent | float | Recent frequency vs baseline |
| 7 | velocity_spike | bool | >5 txns/minute |
| 8 | time_deviation_score | float | Unusual transaction time |
| 9 | is_unusual_hour | bool | Night/off-hours |
| 10 | confirmation_time_ratio | float | Delay vs baseline |
| 11 | hesitation_score | float | Composite hesitation (0-1) |
| 12 | amount_edit_count_ratio | float | Edits vs normal |
| 13 | intent_risk_score | float | Intent type risk |
| 14 | intent_direction_mismatch | bool | Intent doesn't match pattern |
| 15 | user_maturity_flag | int | 0=NEW, 1=REGULAR, 2=HEAVY |
| 16 | cooling_off_active | bool | In cooling-off period |
| 17 | recent_warning_ignored | bool | Ignored recent warnings |
| 18 | device_change_flag | bool | Device changed (stubbed) |
| 19 | account_age_days | int | Account age |
| 20 | transaction_count | int | Total transactions |

---

## 🧪 Testing

### Test Structure
```
tests/
├── setup.js                          # Jest configuration
├── manual-test.js                    # Manual testing script
├── baseline-evolution.test.js        # Behavioral baseline tests
├── ml-anomaly-vector.test.js         # ML model tests
└── integration/                      # API integration tests
    ├── health.test.js
    ├── transaction.intent.test.js
    ├── transaction.decision.test.js
    └── transaction.feedback.test.js
```

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Manual testing (server must be running)
node tests/manual-test.js
```

### Test Database
- Uses **MongoDB Memory Server** (in-memory database)
- No manual database setup required
- Automatically cleaned after each test

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js v14+
- MongoDB (local or remote)
- Redis (local or remote)

### Setup Steps

1. **Install Dependencies**
```bash
cd backend
npm install
```

2. **Configure Environment**
Create `.env` file (copy from `.env.example`):
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/upi_fraud_prevention
REDIS_HOST=localhost
REDIS_PORT=6379
```

3. **Start MongoDB**
```bash
# Windows: Usually auto-starts as service
# Linux/Mac:
mongod
```

4. **Start Redis**
```bash
redis-server
```

5. **Train ML Model**
```bash
npm run train-model
```
This creates `src/models/ml_model.json` with trained Isolation Forest model.

6. **Start Backend Server**
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server runs at `http://localhost:3000`

---

## 🔍 Redis Integration & Verification

### How Redis is Used

Redis provides **real-time caching** for:

1. **Velocity Tracking**
   - Key: `velocity:{user_id}:{window}`
   - TTL: 120 seconds
   - Tracks transactions per 60-second window

2. **Cooling-off Flags**
   - Key: `cooling_off:{user_id}`
   - TTL: 300 seconds (5 minutes)
   - Protection period for new/vulnerable users

3. **Delay States**
   - Key: `delay:{transaction_id}`
   - TTL: 600 seconds (10 minutes)
   - Flags high-risk transactions requiring delay

### Checking if Redis is Active

```bash
# Test Redis connection
redis-cli ping
# Expected output: PONG

# Check Redis is running
redis-cli info server
```

### Verifying Data in Redis

```bash
# Connect to Redis CLI
redis-cli

# List all keys
KEYS *

# Check velocity for a user
GET velocity:user123:*

# Check cooling-off flag
GET cooling_off:user123

# Check delay state
GET delay:550e8400-e29b-41d4-a716-446655440000

# Monitor real-time commands
MONITOR

# Check key TTL (time to live)
TTL velocity:user123:12345
```

### Programmatic Verification

You can also check Redis data through the backend:

```javascript
// In Node.js REPL or test script
const { getRedisClient } = require('./src/utils/redis');

const client = getRedisClient();

// Get all keys
const keys = await client.keys('*');
console.log('Redis keys:', keys);

// Get specific value
const value = await client.get('velocity:user123:12345');
console.log('Velocity count:', value);
```

### Redis Graceful Degradation

**Important:** The system is designed to work even if Redis is unavailable:
- Redis connection failures are logged but don't crash the server
- Velocity tracking returns 0 if Redis is down
- Cooling-off flags return false if Redis is down
- System continues with degraded functionality (rule-based only)

---

## 🧠 ML Model Analysis

### Current Model Status

✅ **Model is Trained and Calibrated**

The model file (`src/models/ml_model.json`) contains:
- 100 isolation trees
- Training sample size: 256
- Calibration constant (c_n): 10.24
- **Calibration percentiles:** P10, P30, P50, P70, P90, P97

### Model Persistence

**Does the model remember past records?**

**Answer:** The model has **two types of memory:**

1. **Training Memory (Static):**
   - The model is trained once using `npm run train-model`
   - Training data: 1000+ synthetic normal transactions
   - Model structure is saved to `ml_model.json`
   - **This does NOT update automatically** - model is static after training

2. **Feature Extraction (Dynamic):**
   - Each transaction uses **current user history** from MongoDB
   - Features like `amount_ratio`, `payee_trust_score`, `transaction_count` are computed from database
   - So the model "sees" user's past behavior through features, not through retraining

### Model Behavior on Restart

**When backend restarts:**
- ✅ Model structure is loaded from `ml_model.json` (persisted)
- ✅ User history is loaded from MongoDB (persisted)
- ✅ Behavioral baselines are loaded from MongoDB (persisted)
- ❌ Redis cache is cleared (velocity counters, cooling-off flags reset)

**Conclusion:** The ML model itself doesn't reset, but Redis-based real-time tracking does.

### Model Training Data

Currently uses **synthetic data** (1000 samples):
- Normal transaction patterns
- Amount ratios: 0.5-2.5
- Trust scores: 0.5-1.0
- Various behavioral signals

**For production:** Should retrain with real transaction data periodically.

---

## 🔧 ML Model Fine-Tuning Recommendations

### Current Issues & Improvements

#### 1. **Training Data Quality**
**Issue:** Model trained on synthetic data only
**Impact:** May not capture real-world fraud patterns accurately

**Recommendation:**
- Collect real transaction data (at least 2000-5000 samples)
- Use only "normal" transactions (low-risk, completed successfully)
- Retrain model monthly or quarterly
- Monitor model drift (score distribution changes)

**How to implement:**
```bash
# Modify scripts/train-model.js to use real data
# Then retrain:
npm run train-model
```

#### 2. **Calibration Accuracy**
**Issue:** Calibration based on 2500 synthetic samples
**Impact:** Score ranges may not match real-world distribution

**Recommendation:**
- Build calibration set from ≥5000 real normal transactions
- Validate calibration percentiles against production data
- Adjust percentile mappings if needed

**Current calibration:**
```
P10: 0.521
P30: 0.534
P50: 0.545
P70: 0.556
P90: 0.571
P97: 0.582
```

**Check if these match your production score distribution.**

#### 3. **Feature Engineering**
**Issue:** Some features are simplified or stubbed
**Impact:** Reduced model accuracy

**Recommendations:**

a. **Improve time_deviation_score:**
   - Currently uses fixed "normal hours" (8-20)
   - Should track each user's typical transaction times
   - Use historical hour distribution per user

b. **Implement device_change_flag:**
   - Currently stubbed (always 0)
   - Track device fingerprints (IP, user agent, device ID)
   - Flag when device changes

c. **Enhance amount_zscore:**
   - Currently uses simplified standard deviation
   - Should calculate true std dev from user history
   - Requires storing transaction amounts in User model

d. **Add transaction_success_rate:**
   - Track % of successful vs failed transactions
   - Users with many failed attempts = higher risk

#### 4. **Model Hyperparameters**
**Current settings:**
- nEstimators: 100 (number of trees)
- maxSamples: 256 (samples per tree)
- contamination: 0.1 (expected anomaly rate)

**Recommendation:**
- Test with more trees (150-200) for better accuracy
- Increase maxSamples if you have more training data
- Adjust contamination based on actual fraud rate

**How to tune:**
```javascript
// In src/ml/training.js
const model = new IsolationForest(
  150,    // nEstimators (more trees = better accuracy, slower)
  512,    // maxSamples (more samples = better generalization)
  0.05    // contamination (expected fraud rate)
);
```

#### 5. **Online Learning**
**Issue:** Model is static, doesn't learn from new transactions
**Impact:** Model becomes stale over time

**Recommendation:**
- Implement periodic retraining (weekly/monthly)
- Collect feedback on false positives/negatives
- Use feedback to improve training data quality

**Implementation approach:**
```javascript
// Pseudo-code for online learning
async function retrainModel() {
  // 1. Fetch recent low-risk transactions
  const normalTxns = await Transaction.find({
    risk_level: 'LOW',
    createdAt: { $gte: lastTrainingDate }
  }).limit(5000);
  
  // 2. Extract features
  const features = await extractFeaturesForTraining(normalTxns);
  
  // 3. Retrain model
  const model = new IsolationForest(100, 256, 0.1);
  model.fit(features);
  
  // 4. Rebuild calibration
  model.buildCalibration(calibrationSamples);
  
  // 5. Save model
  await saveModel(model);
}
```

#### 6. **Model Validation**
**Issue:** No validation metrics tracked
**Impact:** Can't measure model performance

**Recommendation:**
- Track precision, recall, F1-score
- Monitor false positive rate (FPR)
- A/B test model versions
- Log anomaly score distribution

**Metrics to track:**
```javascript
{
  "model_version": "v1.0.0",
  "training_date": "2025-01-15",
  "validation_metrics": {
    "precision": 0.85,
    "recall": 0.78,
    "f1_score": 0.81,
    "false_positive_rate": 0.05,
    "avg_anomaly_score_normal": 0.15,
    "avg_anomaly_score_fraud": 0.72
  }
}
```

#### 7. **Feature Importance**
**Issue:** No visibility into which features matter most
**Impact:** Can't optimize feature engineering

**Recommendation:**
- Implement feature importance calculation
- Use SHAP values or permutation importance
- Focus engineering efforts on high-impact features

---

## 📈 Suggested Implementation Priority

### High Priority (Do First)
1. ✅ **Collect real transaction data** - Replace synthetic training data
2. ✅ **Retrain model monthly** - Keep model fresh
3. ✅ **Implement device_change_flag** - Important fraud signal
4. ✅ **Track model metrics** - Measure performance

### Medium Priority (Do Next)
5. ⚠️ **Improve time_deviation_score** - User-specific patterns
6. ⚠️ **Enhance amount_zscore** - True statistical calculation
7. ⚠️ **Tune hyperparameters** - Test different settings
8. ⚠️ **Rebuild calibration** - Use real data

### Low Priority (Nice to Have)
9. 🔵 **Feature importance analysis** - Optimize features
10. 🔵 **A/B testing framework** - Compare model versions
11. 🔵 **Online learning** - Continuous improvement

---

## 🎯 API Endpoints

### 1. Health Check
```bash
GET /health
```

### 2. Submit Transaction Intent
```bash
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

### 3. Get Risk Decision
```bash
POST /transaction/decision
Content-Type: application/json

{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 4. Submit User Feedback
```bash
POST /transaction/feedback
Content-Type: application/json

{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_action": "PROCEEDED"
}
```

### 5. ML Health Check
```bash
GET /ml/health
```

---

## 📚 Documentation Files

### Core Documentation
- `README.md` - Main project overview
- `00_START_HERE.md` - Gap 1 delivery summary
- `PHASE2_QUICKSTART.md` - Phase 2 setup guide
- `PHASE2_SUMMARY.md` - Phase 2 implementation summary

### Technical Documentation
- `docs/ML_CONTRACT_v1.md` - ML feature contract (FROZEN)
- `docs/PHASE2_IMPLEMENTATION.md` - Phase 2 technical details
- `docs/PHASE2_TEST_SCENARIOS.md` - Test cases
- `docs/GAP1_USER_BEHAVIORAL_BASELINES.md` - Behavioral profiling
- `docs/CALIBRATION_METHOD.md` - ML calibration approach

### Integration Guides
- `BASELINE_INTEGRATION_GUIDE.js` - Code examples
- `GAP1_QUICK_REFERENCE.md` - Quick reference card
- `GAP1_IMPLEMENTATION_SUMMARY.md` - Implementation guide
- `GAP1_VISUAL_GUIDE.md` - Visual diagrams

---

## 🔒 Security Considerations

1. **PIN Entry Timing:** Risk assessment happens BEFORE PIN entry
2. **Data Privacy:** User behavioral data stored securely in MongoDB
3. **Redis Security:** Use Redis AUTH in production
4. **API Security:** Add authentication/authorization (not implemented in Phase 1/2)
5. **Rate Limiting:** Implement API rate limiting for production

---

## 🚫 Out of Scope (Current Phase)

- ❌ Real UPI/NPCI integration
- ❌ Frontend UI (backend only)
- ❌ Authentication/authorization
- ❌ Real fraud labels (unsupervised learning only)
- ❌ Transaction blocking (only warns/delays)
- ❌ Deep learning models
- ❌ Online model retraining

---

## 📊 Summary

### What Works Well ✅
- Comprehensive risk assessment framework
- Real ML with Isolation Forest
- Behavioral baseline tracking with EMA
- Redis-based real-time velocity tracking
- Graceful degradation (works without Redis)
- Well-documented codebase
- Comprehensive test suite

### What Needs Improvement ⚠️
- Model trained on synthetic data (needs real data)
- Some features simplified or stubbed
- No online learning (static model)
- No model performance metrics
- Redis cache resets on restart
- No authentication/authorization

### Recommended Next Steps 🎯
1. Collect real transaction data and retrain model
2. Implement device_change_flag feature
3. Add model performance tracking
4. Set up periodic model retraining
5. Improve feature engineering (time_deviation, amount_zscore)
6. Add authentication layer
7. Implement API rate limiting

---

**Project Status:** Production-ready for Phase 2 requirements, but needs real data and ongoing maintenance for optimal performance.
