# Feature Extraction Engine - Design & Implementation

## Overview

The Feature Extraction Engine converts **transaction context + user memory** into **measurable risk features** that answer 6 scam-detection questions.

**Key Principle:** Extract ONLY features; do NOT compute risk scores here.

---

## 6 Scam-Detection Questions → Feature Categories

### Q1: "Do I know this person?"
**Category:** PAYEE-BASED FEATURES
**Features Extracted:**
```javascript
features.payee = {
  is_new_payee: Boolean,           // First transaction < 30 days?
  payee_trust_score: Number,       // 0-10 scale (from PayeeRelationship)
  payee_is_individual: Boolean,    // Person vs Business?
  is_one_time: Boolean,            // Only 1 transaction ever?
  is_recurring: Boolean,           // 3+ transactions?
  avg_payee_amount: Number,        // What I typically send to them
  payee_blocked_count: Number,     // Times flagged/delayed?
  payee_risk_patterns: [String]    // Detected warning patterns
}
```

**Derivation:**
| Feature | Source | Calculation |
|---------|--------|-------------|
| `is_new_payee` | PayeeRelationship | days_since_first_transaction < 30 |
| `payee_trust_score` | PayeeRelationship | (base + success + duration) × penalty, max 10 |
| `payee_is_individual` | PayeeRelationship.payee_type | payee_type === 'INDIVIDUAL' |
| `is_one_time` | PayeeRelationship | total_transactions === 1 |
| `is_recurring` | PayeeRelationship | total_transactions >= 3 |
| `avg_payee_amount` | PayeeRelationship | total_amount_sent / total_transactions |
| `payee_blocked_count` | PayeeRelationship | COUNT(blocked_transactions) |
| `payee_risk_patterns` | PayeeRelationship | high_block_rate, intent_mismatch, variance, low_success_rate |

---

### Q2: "Is this amount too high for me?"
**Category:** AMOUNT-BASED FEATURES
**Features Extracted:**
```javascript
features.amount = {
  amount_value: Number,            // Raw transaction amount
  user_avg_amount: Number,         // My typical transaction
  user_max_amount: Number,         // My highest transaction ever
  user_median_amount: Number,      // My median transaction
  
  amount_vs_avg_ratio: Number,     // amount / avg (1.0 = typical)
  amount_vs_max_ratio: Number,     // amount / max (0.0-1.0)
  
  is_largest_ever: Boolean,        // Exceeds my max?
  is_multiple_of_avg: Boolean,     // > 3x my average?
  near_max: Boolean                // > 80% of my max?
}
```

**Derivation:**
| Feature | Source | Calculation |
|---------|--------|-------------|
| `amount_value` | Transaction | Direct input |
| `user_avg_amount` | User.transaction_stats | SUM(amounts) / COUNT(txns) |
| `user_max_amount` | User.transaction_stats | MAX(amounts) |
| `user_median_amount` | User.transaction_stats | MEDIAN(amounts) |
| `amount_vs_avg_ratio` | Computed | amount / user_avg_amount |
| `amount_vs_max_ratio` | Computed | amount / user_max_amount |
| `is_largest_ever` | Computed | amount > user_max_amount |
| `is_multiple_of_avg` | Computed | amount > (user_avg_amount × 3) |
| `near_max` | Computed | amount > (user_max_amount × 0.8) |

---

### Q3: "Why the rush? Is someone pressuring me?"
**Category:** TIME & URGENCY FEATURES
**Features Extracted:**
```javascript
features.time_urgency = {
  transaction_hour: Number,           // 0-23 (when sending)
  is_unusual_hour: Boolean,           // Outside my preferred hours?
  is_night_time: Boolean,             // 20:00-02:00?
  
  recent_tx_count_24h: Number,        // Transactions in last 24h
  rapid_succession: Boolean,          // > 3 txns in 24h?
  
  last_confirmation_time_ms: Number,  // Time to confirm last txn
  confirmation_faster_than_baseline: Boolean,  // 30% faster than avg?
  
  time_since_last_tx_seconds: Number  // Seconds since last txn
}
```

**Derivation:**
| Feature | Source | Calculation |
|---------|--------|-------------|
| `transaction_hour` | timestamp | timestamp.getHours() |
| `is_unusual_hour` | User.transaction_stats | !preferred_hours.includes(hour) |
| `is_night_time` | Computed | hour >= 20 OR hour <= 2 |
| `recent_tx_count_24h` | User.recent_transactions_count_24h | COUNT(txns in last 24h) |
| `rapid_succession` | Computed | recent_tx_count_24h > 3 |
| `last_confirmation_time_ms` | User.behavioral_signals | Time from PIN screen to confirm |
| `confirmation_faster_than_baseline` | Computed | last_time < (avg_time × 0.7) |
| `time_since_last_tx_seconds` | Computed | NOW - last_transaction_time |

---

### Q4: "What am I sending money for?"
**Category:** INTENT-BASED FEATURES
**Features Extracted:**
```javascript
features.intent = {
  selected_intent: String,         // 'refund', 'receive', 'purchase', 'support'
  last_selected_intent: String,    // Intent from previous txn
  
  intent_mismatch: Boolean,        // Does it differ from last time?
  
  is_risky_intent: Boolean,        // High-scam-rate category?
  is_refund: Boolean,              // Refund intent? (refund scams)
  
  intent_mismatch_count: Number,   // Times I've changed my mind
  flagged_tx_count: Number         // Times this intent was flagged
}
```

**Derivation:**
| Feature | Source | Calculation |
|---------|--------|-------------|
| `selected_intent` | Transaction | Direct input |
| `last_selected_intent` | User.intent_history | Last intent chosen |
| `intent_mismatch` | Computed | selected_intent !== last_selected_intent |
| `is_risky_intent` | Hardcoded list | intent in ['purchase', 'test'] |
| `is_refund` | Computed | selected_intent === 'refund' |
| `intent_mismatch_count` | User.intent_history | COUNT(intent changes) |
| `flagged_tx_count` | User.intent_history | COUNT(txns with this intent that were flagged) |

---

### Q5: "Am I hesitating? Does something feel off?"
**Category:** HESITATION & CONFUSION FEATURES
**Features Extracted:**
```javascript
features.hesitation = {
  amount_edit_count: Number,       // How many times did I change amount?
  amount_edit_count_avg: Number,   // My typical edit count
  excessive_edits: Boolean,        // > 3 edits?
  
  confirmation_delay_ms: Number,   // Time paused before confirming
  avg_confirmation_ms: Number,     // My typical pause time
  unusual_hesitation: Boolean,     // Pause > 150% of my average?
  
  hesitation_score_recent: Number  // Composite recent hesitation (0-1)
}
```

**Derivation:**
| Feature | Source | Calculation |
|---------|--------|-------------|
| `amount_edit_count` | Behavioral Signals | COUNT(amount field edits on this txn) |
| `amount_edit_count_avg` | User.behavioral_signals | AVG(edit_count across past txns) |
| `excessive_edits` | Computed | amount_edit_count > 3 |
| `confirmation_delay_ms` | Behavioral Signals | Time from PIN screen shown to PIN entered |
| `avg_confirmation_ms` | User.behavioral_signals | AVG(delay_ms) across past txns |
| `unusual_hesitation` | Computed | delay_ms > (avg_ms × 1.5) |
| `hesitation_score_recent` | User.behavioral_signals | Composite of recent edits + delays |

---

### Q6: "Can I afford to lose this money?"
**Category:** USER VULNERABILITY FEATURES
**Features Extracted:**
```javascript
features.vulnerability = {
  user_type: String,              // 'NEW', 'ESTABLISHED', 'POWER'
  account_age_days: Number,       // Days since account creation
  is_new_user: Boolean,           // Account < 30 days old?
  is_low_experience: Boolean,     // < 10 transactions?
  total_transactions: Number,     // Lifetime transaction count
  
  cooling_off_enabled: Boolean,   // Extra safety mode enabled?
  risk_sensitivity_level: String, // 'LOW', 'MEDIUM', 'HIGH'
  
  ignored_warnings_count: Number, // Times I ignored warnings
  canceled_flagged_tx_count: Number,  // Times I stopped flagged txns
  
  vulnerability_score: Number     // Composite (0-1)
}
```

**Derivation:**
| Feature | Source | Calculation |
|---------|--------|-------------|
| `user_type` | User.profile | Based on account_age & txn_count |
| `account_age_days` | User.created_at | NOW - created_at |
| `is_new_user` | Computed | user_type === 'NEW' |
| `is_low_experience` | Computed | total_transactions < 10 |
| `total_transactions` | User.transaction_stats | COUNT(all txns) |
| `cooling_off_enabled` | User.settings | User-configurable flag |
| `risk_sensitivity_level` | User.settings | User-configurable choice |
| `ignored_warnings_count` | User.intent_history | COUNT(times proceeded after warning) |
| `canceled_flagged_tx_count` | User.intent_history | COUNT(times canceled flagged txns) |
| `vulnerability_score` | Computed | (new_user_penalty + low_exp_penalty) × (1 - experience_bonus) |

---

## Feature Extraction Data Flow

```
┌─────────────────────────────────────────────────────────┐
│   Transaction Submission                                │
│   { user_id, amount, payee_id, intent_type, ... }       │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ┌─────────────┐      ┌──────────────────┐
    │   User      │      │   Payee          │
    │   Memory    │      │   Relationship   │
    │             │      │                  │
    │ (150 fields)│      │ (30 fields)      │
    └──────┬──────┘      └────────┬─────────┘
           │                      │
           └──────────┬───────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Feature Extraction Engine   │
        │                             │
        │  Extract 6 Categories:      │
        │  • Payee (8 features)       │
        │  • Amount (9 features)      │
        │  • Time & Urgency (7)       │
        │  • Intent (6 features)      │
        │  • Hesitation (7 features)  │
        │  • Vulnerability (10)       │
        │                             │
        │  TOTAL: ~47 features        │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Feature Vector             │
        │  (NO risk scores computed)  │
        │                             │
        │  {                          │
        │    features: { ... },       │
        │    user_id,                 │
        │    timestamp,               │
        │    metadata                 │
        │  }                          │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Risk Engine (next step)    │
        │  Uses features to compute:  │
        │  • Risk scores per category │
        │  • Composite risk level     │
        │  • Action (ALLOW/WARN/DELAY)│
        └─────────────────────────────┘
```

---

## Feature Statistics

### By Category

| Category | Features | Type | Range |
|----------|----------|------|-------|
| Payee | 8 | Boolean, Numeric, Array | 0-10, T/F, [] |
| Amount | 9 | Numeric, Boolean | 0-∞, T/F |
| Time & Urgency | 7 | Numeric, Boolean | 0-∞, T/F |
| Intent | 6 | String, Boolean, Numeric | '', T/F, 0-∞ |
| Hesitation | 7 | Numeric, Boolean | 0-∞, T/F |
| Vulnerability | 10 | String, Numeric, Boolean | '', 0-1, T/F |
| **TOTAL** | **~47** | Mixed | Mixed |

### By Data Type

| Type | Count | Example |
|------|-------|---------|
| Boolean | 16 | is_new_payee, is_largest_ever |
| Numeric | 26 | amount_vs_avg_ratio, recent_tx_count_24h |
| String | 3 | selected_intent, payee_type |
| Array | 1 | payee_risk_patterns |
| Composite | 1 | vulnerability_score |

---

## Important: What's NOT Here

### ❌ DON'T Compute Risk Scores
```javascript
// ❌ WRONG - Risk engine job, not here
features.risk_score = 0.75;
features.risk_level = 'MEDIUM';
features.action = 'WARN';
```

### ❌ DON'T Store Raw Data
```javascript
// ❌ WRONG - Storage bloat
features.recent_transactions = [
  { date: '2026-02-05', amount: 1000, status: 'SUCCESS' },
  { date: '2026-02-04', amount: 2000, status: 'SUCCESS' },
  // ... 100s of entries
];
```

### ✅ DO Extract Aggregates
```javascript
// ✅ CORRECT - Clean summary
features.recent_tx_count_24h = 3;
features.avg_amount = 2500;
features.max_amount = 5000;
```

---

## Usage Example

```javascript
const { extractTransactionFeatures } = require('./services/featureExtractor');

// Extract features for a transaction
const { features, metadata } = await extractTransactionFeatures(
  'user_123',
  {
    amount: 5000,
    payee_id: 'payee_456',
    intent_type: 'refund',
    timestamp: new Date()
  },
  {
    amount_edit_count: 2,
    confirmation_delay_ms: 3500
  }
);

console.log('Total features:', metadata.feature_count);  // ~47
console.log('Q1 - Know person?', features.payee);
console.log('Q2 - Amount too high?', features.amount);
console.log('Q3 - Why rush?', features.time_urgency);
console.log('Q4 - What for?', features.intent);
console.log('Q5 - Hesitating?', features.hesitation);
console.log('Q6 - Afford loss?', features.vulnerability);

// Next: Pass features to risk engine (NOT here)
// const riskDecision = await calculateRiskLevel(features);
```

---

## Summary

| Aspect | Detail |
|--------|--------|
| **Features Extracted** | ~47 across 6 categories |
| **Data Sources** | User memory (150 fields) + Payee relationship (30 fields) |
| **Questions Answered** | 6 scam-detection questions |
| **Risk Scores Computed** | 0 (done by risk engine) |
| **Storage Type** | Aggregates only (no raw logs) |
| **Reusability** | Features stored in Transaction.features_vector |
| **ML Training** | features_vector used for training |
| **Purpose** | Convert context → measurable signals |

This engine is the **bridge between user data and risk evaluation**.
