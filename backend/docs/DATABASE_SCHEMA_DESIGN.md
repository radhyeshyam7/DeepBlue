# Database Schema Design - User Profile & History Store

**Purpose**: Document the complete MongoDB schema for behavioral memory and risk evaluation  
**Optimization**: Per-user aggregated stats (no raw logs), indexed for fast queries  
**Last Updated**: February 6, 2026

---

## Collection 1: Users

**Purpose**: Central store for all user behavioral memory, organized into 7 feature categories

### Schema Structure

```javascript
{
  _id: ObjectId,
  user_id: String,                              // Unique user identifier
  
  // ==========================================
  // CATEGORY 1: IDENTITY
  // ==========================================
  account_created_at: Date,                     // Account creation timestamp
  total_transactions: Number,                   // Lifetime transaction count
  user_type: String,                            // Classification: NEW | REGULAR | HEAVY
  cooling_off_enabled: Boolean,                 // High-alert mode flag
  risk_sensitivity_level: Number,               // User's risk tolerance (1-5 scale)
  
  // ==========================================
  // CATEGORY 2: TRANSACTION STATISTICS
  // ==========================================
  avg_transaction_amount: Number,               // Mean transaction value (INR)
  median_transaction_amount: Number,            // Median transaction value (INR)
  max_transaction_amount: Number,               // Largest transaction ever (INR)
  min_transaction_amount: Number,               // Smallest transaction ever (INR)
  transactions_per_day_avg: Number,             // Daily transaction velocity
  
  // ==========================================
  // CATEGORY 3: TRANSACTION TIMING
  // ==========================================
  preferred_transaction_hours: [Number],        // Hours user typically transacts (0-23)
  preferred_transaction_days: [Number],         // Days user typically transacts (0-6)
  
  // ==========================================
  // CATEGORY 4: BEHAVIORAL SIGNALS
  // ==========================================
  avg_confirmation_time_ms: Number,             // Median time to confirm (ms)
  amount_edit_count_avg: Number,                // Avg edits before confirming
  hesitation_score_recent: Number,              // Recent hesitation metric (0-1)
  usual_confirmation_confidence: Number,        // Baseline confirmation speed (0-1)
  
  // ==========================================
  // CATEGORY 5: INTENT HISTORY
  // ==========================================
  intent_mismatch_count: Number,                // Historical intent deviations
  flagged_transaction_count: Number,            // Total flagged by system
  ignored_warnings_count: Number,               // Times user proceeded despite warnings
  accepted_high_risk_count: Number,             // High-risk transactions user approved
  
  // ==========================================
  // CATEGORY 6: DEVICE CONTEXT
  // ==========================================
  known_devices: [
    {
      device_id: String,                        // Device fingerprint
      device_name: String,                      // Device identifier
      first_seen: Date,                         // When device first used
      last_seen: Date,                          // When device last used
      transaction_count: Number,                // Txns from this device
      is_trusted: Boolean                       // Marked as trusted by user
    }
  ],
  
  // ==========================================
  // CATEGORY 7: GEOGRAPHICAL CONTEXT
  // ==========================================
  usual_region: String,                         // Primary region (state/city code)
  usual_timezone: String,                       // Typical timezone
  region_transaction_counts: {                  // Txns per region
    [region_code]: Number                       // e.g., "IN-MH": 45, "IN-KA": 12
  },
  
  // ==========================================
  // METADATA
  // ==========================================
  last_transaction_at: Date,                    // Most recent transaction
  last_updated_at: Date,                        // Last profile update
  createdAt: Date,                              // MongoDB timestamp
  updatedAt: Date                               // MongoDB timestamp
}
```

### Field Details & Risk Mapping

| Field | Type | Risk Category | Usage |
|-------|------|---------------|-------|
| **account_created_at** | Date | Vulnerability | Identify NEW users (< 30 days) |
| **total_transactions** | Number | Vulnerability | Account maturity; threshold for HEAVY user |
| **user_type** | String | Vulnerability | Adjust risk thresholds (NEW stricter, HEAVY lenient) |
| **cooling_off_enabled** | Boolean | Vulnerability | User already in high-alert mode; increase risk +0.1 |
| **risk_sensitivity_level** | Number | Vulnerability | Personalized alert thresholds (1=strict, 5=lenient) |
| **avg_transaction_amount** | Number | Amount | Baseline for amount deviation calculation |
| **median_transaction_amount** | Number | Amount | Alternative baseline (less affected by outliers) |
| **max_transaction_amount** | Number | Amount | Detect "largest ever" flag |
| **min_transaction_amount** | Number | Amount | Validate reasonable transaction range |
| **transactions_per_day_avg** | Number | Time & Urgency | Detect velocity spikes (> 2x avg) |
| **preferred_transaction_hours** | [Number] | Time & Urgency | Detect unusual hour (outside user pattern) |
| **preferred_transaction_days** | [Number] | Time & Urgency | Detect weekend/weekday anomalies |
| **avg_confirmation_time_ms** | Number | Hesitation | Baseline for confirmation speed comparison |
| **amount_edit_count_avg** | Number | Hesitation | Detect excessive edits (> 3x user baseline) |
| **hesitation_score_recent** | Number | Hesitation | Recent behavioral confusion flag |
| **usual_confirmation_confidence** | Number | Hesitation | Measure of user decisiveness (higher = faster) |
| **intent_mismatch_count** | Number | Intent | Detect intent pattern deviations |
| **flagged_transaction_count** | Number | Vulnerability | Account's risk history |
| **ignored_warnings_count** | Number | Vulnerability | User susceptibility to scams (+0.15 risk) |
| **accepted_high_risk_count** | Number | Vulnerability | User tolerance for risk |
| **known_devices** | [Object] | Device Context | Detect new/unknown devices (risk increase) |
| **usual_region** | String | Device Context | Detect region anomalies |
| **region_transaction_counts** | Object | Device Context | Validate region-based patterns |
| **last_transaction_at** | Date | Metadata | Recency of activity |
| **last_updated_at** | Date | Metadata | Track profile freshness |

---

## Collection 2: PayeeRelationships

**Purpose**: Per-user-per-payee trust tracking and relationship history

### Schema Structure

```javascript
{
  _id: ObjectId,
  user_id: String,                              // Reference to user
  payee_id: String,                             // Unique payee identifier
  payee_name: String,                           // Payee name (optional)
  payee_type: String,                           // Individual | Business | Merchant
  
  // ==========================================
  // TRUST SCORING
  // ==========================================
  payment_count: Number,                        // Total transactions with this payee
  trust_score: Number,                          // Computed score (0-1)
  
  // Trust Formula:
  // 0 payments     → 0.0 (UNKNOWN)
  // 1 payment      → 0.1 (NEW)
  // 3-5 payments   → 0.4-0.6 (MEDIUM_TRUST)
  // 10+ payments   → 0.8-0.95 (HIGH_TRUST)
  
  risk_level: String,                           // UNKNOWN | NEW | LOW_TRUST | MEDIUM_TRUST | HIGH_TRUST
  
  // ==========================================
  // RELATIONSHIP HISTORY
  // ==========================================
  first_payment_time: Date,                     // When first paid to this payee
  last_payment_time: Date,                      // Most recent payment
  days_since_first_payment: Number,             // Relationship duration (days)
  is_one_time: Boolean,                         // One-time payee indicator (scam signal)
  
  // ==========================================
  // TRANSACTION PATTERNS
  // ==========================================
  avg_amount_per_transaction: Number,           // Typical transaction value with this payee
  max_amount_to_payee: Number,                  // Largest amount sent to this payee
  min_amount_to_payee: Number,                  // Smallest amount sent to this payee
  transactions_per_month: Number,               // Monthly velocity with this payee
  
  // ==========================================
  // RECENCY SIGNALS
  // ==========================================
  last_transaction_days_ago: Number,            // Freshness of relationship
  consecutive_months_active: Number,            // How many months this payee has been active
  
  // ==========================================
  // METADATA
  // ==========================================
  createdAt: Date,                              // When relationship first recorded
  updatedAt: Date                               // Last relationship update
}
```

### Field Details & Risk Mapping

| Field | Type | Risk Category | Usage |
|-------|------|---------------|-------|
| **user_id** | String | N/A | Partition key for per-user relationships |
| **payee_id** | String | Payee | Unique identifier for recipient |
| **payee_type** | String | Payee | Individual = higher risk than business |
| **payment_count** | Number | Payee | Primary trust signal; 0 = is_new_payee flag |
| **trust_score** | Number | Payee | Used directly in payee risk scoring |
| **risk_level** | String | Payee | Enum representation (NEW / LOW_TRUST / HIGH_TRUST) |
| **first_payment_time** | Date | Payee | Calculate relationship duration |
| **last_payment_time** | Date | Payee | Detect dormant payees (stale > 90 days) |
| **days_since_first_payment** | Number | Payee | Trust maturity metric |
| **is_one_time** | Boolean | Payee | One-time transaction = high scam risk |
| **transactions_per_month** | Number | Time & Urgency | Detect unusual velocity with this payee |
| **avg_amount_per_transaction** | Number | Amount | Detect amount deviation with this specific payee |
| **last_transaction_days_ago** | Number | Time & Urgency | Recency of relationship |

---

## Collection 3: Transactions

**Purpose**: Complete transaction records with risk evaluation and feature vectors for ML training

### Schema Structure

```javascript
{
  _id: ObjectId,
  transaction_id: String,                       // Unique transaction ID
  
  // ==========================================
  // TRANSACTION DETAILS
  // ==========================================
  user_id: String,                              // User performing transaction
  payee_id: String,                             // Recipient
  amount: Number,                               // Transaction amount (INR)
  intent_type: String,                          // transfer | payment | refund | purchase | bill_pay | etc.
  
  // ==========================================
  // RISK EVALUATION (PRE-PIN)
  // ==========================================
  risk_level: String,                           // LOW | MEDIUM | HIGH
  risk_score: Number,                           // 0-10 display score
  action: String,                               // ALLOW | WARN | DELAY
  reason_codes: [String],                       // [new_payee, amount_spike, ...]
  explanation: String,                          // Human-readable risk summary
  
  // ==========================================
  // CATEGORY-WISE SCORES
  // ==========================================
  category_scores: {
    payee: Number,                              // 0-1 payee risk
    amount: Number,                             // 0-1 amount risk
    urgency: Number,                            // 0-1 time/urgency risk
    intent: Number,                             // 0-1 intent risk
    hesitation: Number,                         // 0-1 hesitation risk
    vulnerability: Number                       // 0-1 vulnerability risk
  },
  
  // ==========================================
  // BEHAVIORAL SIGNALS (INPUT)
  // ==========================================
  behavioral_signals: {
    confirmation_time_ms: Number,               // Time user took to confirm
    amount_edit_count: Number,                  // Edits before confirming
    hesitation_score: Number,                   // User hesitation metric (0-1)
    device_id: String,                          // Device used
    ip_region: String                           // Region from IP address
  },
  
  // ==========================================
  // EXTRACTED FEATURES (ML TRAINING DATA)
  // ==========================================
  features_vector: {
    // Payee features
    payee_is_new: Boolean,
    payee_trust_score: Number,
    payee_is_individual: Boolean,
    payee_one_time: Boolean,
    
    // Amount features
    amount_vs_avg_ratio: Number,
    amount_vs_max_ratio: Number,
    is_largest_ever: Boolean,
    is_multiple_of_avg: Boolean,
    near_max: Boolean,
    
    // Time features
    is_unusual_hour: Boolean,
    recent_tx_count_24h: Number,
    rapid_succession: Boolean,
    confirmation_faster_than_baseline: Boolean,
    
    // Intent features
    intent_mismatch: Boolean,
    is_risky_intent: Boolean,
    intent_mismatch_count: Number,
    is_refund: Boolean,
    
    // Hesitation features
    amount_edit_count: Number,
    excessive_edits: Boolean,
    unusual_hesitation: Boolean,
    
    // Vulnerability features
    is_new_user: Boolean,
    is_low_experience: Boolean,
    cooling_off_enabled: Boolean,
    vulnerability_score: Number
  },
  
  // ==========================================
  // PAYMENT DETAILS
  // ==========================================
  payment_status: String,                       // INITIATED | CONFIRMED | PROCESSING | SUCCESS | FAILED | CANCELLED
  cashfree_order_id: String,                    // Cashfree payment reference
  nominee_alerted: Boolean,                     // Was nominee notified (HIGH risk)
  nominee_approval: String,                     // null | APPROVED | BLOCKED (if HIGH risk)
  
  // ==========================================
  // USER FEEDBACK (POST-TRANSACTION)
  // ==========================================
  user_feedback: {
    feedback_type: String,                      // CONFIRMED | WARNED_CONFIRMED | DELAYED_CONFIRMED
    time_to_confirm_after_warning_ms: Number,   // How long user took to confirm after warning
    user_notes: String                          // Optional user comment
  },
  
  // ==========================================
  // OUTCOME (FOR ML FEEDBACK LOOP)
  // ==========================================
  outcome: String,                              // LEGITIMATE | SCAM | SUSPICIOUS | UNKNOWN
  outcome_confirmed_at: Date,                   // When outcome was confirmed
  outcome_reason: String,                       // Why transaction was flagged as scam/suspicious
  
  // ==========================================
  // METADATA
  // ==========================================
  createdAt: Date,                              // Transaction initiated
  confirmedAt: Date,                            // User confirmed on Review screen
  completedAt: Date,                            // Payment completed
  updatedAt: Date
}
```

### Field Details & Risk Mapping

| Field | Type | Risk Category | Usage |
|-------|------|---------------|-------|
| **risk_level** | String | All | Final risk determination (LOW/MEDIUM/HIGH) |
| **risk_score** | Number | All | Display score for UI (0-10) |
| **action** | String | All | Determine user experience (ALLOW/WARN/DELAY) |
| **reason_codes** | [String] | All | Specific risk factors detected |
| **category_scores** | Object | All | Breakdown by 6 risk categories |
| **behavioral_signals** | Object | Hesitation | Input signals for risk calculation |
| **features_vector** | Object | All | Complete feature set for ML training |
| **outcome** | String | ML Feedback | Ground truth for model retraining |

---

## Collection 4: Nominees

**Purpose**: Trusted contacts for HIGH-RISK transaction alerts

### Schema Structure

```javascript
{
  _id: ObjectId,
  user_id: String,                              // User who added nominee
  nominee_name: String,                         // Nominee's name
  nominee_phone: String,                        // Phone for SMS alerts
  nominee_email: String,                        // Email for alerts
  relationship_type: String,                    // family | friend | colleague | other
  is_active: Boolean,                           // Alert enabled/disabled
  
  // Alert preferences
  alert_on_high_risk: Boolean,                  // Send alert only for HIGH
  alert_on_medium_high: Boolean,                // Send alert for MEDIUM+ (optional)
  
  // Approval capability
  can_approve: Boolean,                         // Nominee can approve via link
  can_block: Boolean,                           // Nominee can block transaction
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## Indexes & Query Optimization

### Users Collection

```javascript
// Primary lookup
db.users.createIndex({ user_id: 1 }, { unique: true })

// Profile queries
db.users.createIndex({ user_type: 1, last_updated_at: -1 })

// Vulnerability assessment
db.users.createIndex({ account_created_at: 1 })
db.users.createIndex({ total_transactions: 1 })
```

### PayeeRelationships Collection

```javascript
// Per-user payee lookup (most critical)
db.payee_relationships.createIndex({ user_id: 1, payee_id: 1 }, { unique: true })

// Trust-based queries
db.payee_relationships.createIndex({ user_id: 1, trust_score: -1 })

// New payee detection
db.payee_relationships.createIndex({ user_id: 1, payment_count: 1 })

// Recency queries
db.payee_relationships.createIndex({ user_id: 1, last_transaction_days_ago: 1 })
```

### Transactions Collection

```javascript
// User transaction history
db.transactions.createIndex({ user_id: 1, createdAt: -1 })

// Risk analysis
db.transactions.createIndex({ user_id: 1, risk_level: 1, createdAt: -1 })

// Outcome feedback (ML training)
db.transactions.createIndex({ user_id: 1, outcome: 1, createdAt: -1 })

// Feedback loop queries
db.transactions.createIndex({ outcome: 1, outcome_confirmed_at: 1 })
```

### Nominees Collection

```javascript
// User's nominees
db.nominees.createIndex({ user_id: 1, is_active: 1 })
```

---

## Data Type Reference

| Type | Format | Example |
|------|--------|---------|
| **String** | Text | "user_123", "transfer" |
| **Number** | Integer/Float | 5000, 0.45, 3.14 |
| **Boolean** | true/false | true, false |
| **Date** | ISO 8601 | 2026-02-06T10:30:00Z |
| **[Array]** | List | [0, 5, 10, 15] |
| **Object** | Nested document | { device_id: "...", trust_score: 0.8 } |

---

## Aggregation & Update Patterns

### Pattern 1: Compute User Profile for Feature Extraction

```javascript
// Query user profile + payee relationship + recent transactions
db.users.aggregate([
  { $match: { user_id: "user123" } },
  {
    $lookup: {
      from: "payee_relationships",
      localField: "user_id",
      foreignField: "user_id",
      as: "all_payees"
    }
  }
])

// Use result to extract 6-category features
```

### Pattern 2: Update User Stats After Transaction

```javascript
// Called post-transaction
db.users.updateOne(
  { user_id: "user123" },
  {
    $inc: { total_transactions: 1 },
    $set: {
      avg_transaction_amount: newAvg,
      median_transaction_amount: newMedian,
      max_transaction_amount: Math.max(currentMax, amount),
      last_transaction_at: new Date()
    }
  }
)
```

### Pattern 3: Update Payee Trust After Transaction

```javascript
// Called post-transaction
db.payee_relationships.updateOne(
  { user_id: "user123", payee_id: "payee456" },
  {
    $inc: { payment_count: 1, transactions_per_month: 1 },
    $set: {
      last_payment_time: new Date(),
      trust_score: computeTrustScore(newPaymentCount),
      risk_level: getRiskLevel(computeTrustScore(newPaymentCount))
    }
  },
  { upsert: true }
)
```

### Pattern 4: Bulk Feature Extraction for ML Training

```javascript
// Get all recent transactions with full feature vectors for model training
db.transactions.find(
  {
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    outcome: { $in: ["LEGITIMATE", "SCAM"] },
    "features_vector": { $exists: true }
  },
  { projection: { features_vector: 1, outcome: 1, risk_level: 1 } }
).limit(10000)
```

---

## Storage Optimization

### Aggregated vs. Raw Logs

**NOT STORED** (to save space):
- Individual transaction amounts (only avg/median/max)
- Individual confirmation times (only baseline + recent score)
- Raw edit histories (only edit count average)
- Device change events (only current known devices)

**STORED** (aggregated):
- User.avg_transaction_amount (single number)
- User.preferred_transaction_hours (array of 8 integers)
- PayeeRelationship.payment_count (single integer)
- Transaction.features_vector (single feature object)

### Expected Storage per User

| Collection | Avg Size | Notes |
|-----------|----------|-------|
| User | ~2-3 KB | Single document with 30+ fields |
| PayeeRelationships | ~500 B × N_payees | N_payees typically 10-50 |
| Transactions | ~2-5 KB each | Kept for 6-12 months |

---

## Example Document: Complete User with History

```javascript
// User document
{
  _id: ObjectId("..."),
  user_id: "user_jsmith_12345",
  account_created_at: ISODate("2025-01-15T00:00:00Z"),
  total_transactions: 45,
  user_type: "REGULAR",
  cooling_off_enabled: false,
  risk_sensitivity_level: 3,
  
  avg_transaction_amount: 3500,
  median_transaction_amount: 2500,
  max_transaction_amount: 25000,
  min_transaction_amount: 100,
  transactions_per_day_avg: 0.45,
  
  preferred_transaction_hours: [9, 12, 17, 18, 19, 20],
  preferred_transaction_days: [1, 2, 3, 4, 5],
  
  avg_confirmation_time_ms: 2300,
  amount_edit_count_avg: 0.8,
  hesitation_score_recent: 0.15,
  usual_confirmation_confidence: 0.85,
  
  intent_mismatch_count: 3,
  flagged_transaction_count: 7,
  ignored_warnings_count: 1,
  accepted_high_risk_count: 2,
  
  known_devices: [
    {
      device_id: "device_hash_abc123",
      device_name: "iPhone 15 Pro",
      first_seen: ISODate("2025-01-15T00:00:00Z"),
      last_seen: ISODate("2026-02-05T18:30:00Z"),
      transaction_count: 38,
      is_trusted: true
    },
    {
      device_id: "device_hash_def456",
      device_name: "Chrome on MacBook",
      first_seen: ISODate("2025-10-20T00:00:00Z"),
      last_seen: ISODate("2026-02-04T09:15:00Z"),
      transaction_count: 7,
      is_trusted: false
    }
  ],
  
  usual_region: "IN-MH",
  usual_timezone: "IST",
  region_transaction_counts: {
    "IN-MH": 35,
    "IN-KA": 5,
    "IN-DL": 5
  },
  
  last_transaction_at: ISODate("2026-02-05T18:45:00Z"),
  last_updated_at: ISODate("2026-02-05T18:50:00Z"),
  createdAt: ISODate("2025-01-15T00:00:00Z"),
  updatedAt: ISODate("2026-02-05T18:50:00Z")
}

// PayeeRelationship document
{
  _id: ObjectId("..."),
  user_id: "user_jsmith_12345",
  payee_id: "payee_mother_5678",
  payee_name: "Mom (Bank Account)",
  payee_type: "Individual",
  
  payment_count: 24,
  trust_score: 0.88,
  risk_level: "HIGH_TRUST",
  
  first_payment_time: ISODate("2025-01-20T10:00:00Z"),
  last_payment_time: ISODate("2026-02-02T15:30:00Z"),
  days_since_first_payment: 383,
  is_one_time: false,
  
  avg_amount_per_transaction: 2000,
  max_amount_to_payee: 5000,
  min_amount_to_payee: 500,
  transactions_per_month: 2.5,
  
  last_transaction_days_ago: 3,
  consecutive_months_active: 13,
  
  createdAt: ISODate("2025-01-20T10:00:00Z"),
  updatedAt: ISODate("2026-02-02T15:30:00Z")
}
```

---

## Summary: Features → Database Mapping

| Risk Category | User Fields | PayeeRelationship Fields | Query Pattern |
|---------------|------------|--------------------------|---------------|
| **Payee** | N/A | payment_count, trust_score, is_one_time, payee_type | Lookup by (user_id, payee_id) |
| **Amount** | avg_transaction_amount, max_transaction_amount | avg_amount_per_transaction, max_amount_to_payee | Compute ratios |
| **Time & Urgency** | transactions_per_day_avg, preferred_transaction_hours, preferred_transaction_days | transactions_per_month, last_transaction_days_ago | Compare to baseline |
| **Intent** | intent_mismatch_count | N/A | Historical count |
| **Hesitation** | avg_confirmation_time_ms, amount_edit_count_avg, hesitation_score_recent | N/A | Compare to baseline |
| **Vulnerability** | account_created_at, total_transactions, user_type, cooling_off_enabled, ignored_warnings_count | N/A | User profile lookup |
| **Device Context** | known_devices, usual_region, region_transaction_counts | N/A | Compare current to baseline |

---

**Design Principles**:
✅ All fields map directly to risk evaluation  
✅ No invented fields or unnecessary duplication  
✅ Optimized for per-user queries (indexed on user_id)  
✅ Aggregated data only (no raw logs for privacy & efficiency)  
✅ 6 risk categories fully supported across documents  
✅ ML-ready with complete feature vectors stored  
