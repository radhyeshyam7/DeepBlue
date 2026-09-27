# Payee Relationship Storage & Update Logic

## Overview
Per-user payee relationship tracking without storing raw transaction logs. Focuses on aggregate statistics, trust scoring, and risk classification.

---

## 1. Data Structure: known_payees

### Location
**User collection**, field: `known_payees`

### Schema
```javascript
known_payees: {
  <payee_id>: {
    // IDENTITY
    payee_id: String,
    payee_name: String,
    payee_type: 'INDIVIDUAL' | 'MERCHANT' | 'BUSINESS',
    first_seen_date: Date,
    last_transaction_date: Date,
    
    // TRANSACTION STATS (aggregated, NO raw logs)
    total_transactions: Number,        // Total successful transactions
    failed_transactions: Number,       // Failed/cancelled transactions
    total_amount_sent: Number,         // Sum of all amounts
    avg_amount: Number,
    max_amount: Number,
    min_amount: Number,
    
    // TRUST METRICS
    trust_score: Number,               // 0-10 scale
    days_since_first_transaction: Number,
    consecutive_successful: Number,    // Streak of successful txns
    intent_mismatch_count: Number,     // Times intent didn't match
    blocked_count: Number,             // Times flagged/delayed/cancelled
    
    // RELATIONSHIP TYPE
    is_new_payee: Boolean,             // First transaction < 30 days
    is_one_time: Boolean,              // Only 1 transaction ever
    is_recurring: Boolean,             // Multiple transactions in regular pattern
    relationship_duration_days: Number,
    
    // BEHAVIORAL SIGNALS
    typical_amount_range: {
      min: Number,
      max: Number,
      median: Number
    },
    typical_day_of_week: String,       // e.g., "MONDAY"
    typical_time_hour: Number,         // e.g., 14 (for 2 PM)
    risk_flags: [String]               // e.g., ['unusual_pattern', 'refund_attempt']
  }
}
```

### Example
```javascript
known_payees: {
  'payee_123': {
    payee_id: 'payee_123',
    payee_name: 'Rajesh Kumar',
    payee_type: 'INDIVIDUAL',
    first_seen_date: '2025-12-15T10:30:00Z',
    last_transaction_date: '2026-02-05T14:20:00Z',
    
    total_transactions: 8,
    failed_transactions: 1,
    total_amount_sent: 45000,
    avg_amount: 5625,
    max_amount: 12000,
    min_amount: 2000,
    
    trust_score: 7.5,
    days_since_first_transaction: 52,
    consecutive_successful: 7,
    intent_mismatch_count: 0,
    blocked_count: 1,
    
    is_new_payee: false,
    is_one_time: false,
    is_recurring: true,
    relationship_duration_days: 52,
    
    typical_amount_range: { min: 4000, max: 8000, median: 5500 },
    typical_day_of_week: 'FRIDAY',
    typical_time_hour: 15,
    risk_flags: []
  }
}
```

---

## 2. Trust Score Calculation

### Algorithm
```
trust_score = (base_score + success_bonus + duration_bonus) * blocking_penalty
```

### Components

#### Base Score (0-3)
```
if (failed_transactions > 0 OR blocked_count > 2):
  base_score = 1
else if (total_transactions >= 10):
  base_score = 2.5
else if (total_transactions >= 5):
  base_score = 2
else if (total_transactions >= 2):
  base_score = 1.5
else:
  base_score = 0 (NEW PAYEE)
```

#### Success Bonus (0-2)
```
success_rate = total_transactions / (total_transactions + failed_transactions)
if (success_rate >= 0.95):
  success_bonus = 2
else if (success_rate >= 0.9):
  success_bonus = 1.5
else if (success_rate >= 0.8):
  success_bonus = 1
else:
  success_bonus = 0.5
```

#### Duration Bonus (0-2)
```
days_known = days_since_first_transaction
if (days_known >= 180):
  duration_bonus = 2
else if (days_known >= 90):
  duration_bonus = 1.5
else if (days_known >= 30):
  duration_bonus = 1
else:
  duration_bonus = 0 (Less than 30 days = new payee)
```

#### Blocking Penalty (0.5-1.0)
```
if (blocked_count >= 3):
  blocking_penalty = 0.5
else if (blocked_count >= 2):
  blocking_penalty = 0.7
else if (blocked_count >= 1):
  blocking_penalty = 0.85
else:
  blocking_penalty = 1.0
```

### Trust Level Classification
```
if (trust_score <= 0):
  level = 'UNKNOWN'       // No transactions
else if (trust_score < 1):
  level = 'NEW'           // < 1 week, no history
else if (trust_score < 3):
  level = 'LOW_TRUST'     // New or risky pattern
else if (trust_score < 6):
  level = 'MEDIUM_TRUST'  // Established, some history
else:
  level = 'HIGH_TRUST'    // 6+ months, consistent
```

### Code Implementation
```javascript
function calculatePayeeTrustScore(payeeData) {
  const {
    total_transactions,
    failed_transactions,
    blocked_count,
    days_since_first_transaction
  } = payeeData;

  // Base score
  let baseScore = 0;
  if (failed_transactions > 0 || blocked_count > 2) {
    baseScore = 1;
  } else if (total_transactions >= 10) {
    baseScore = 2.5;
  } else if (total_transactions >= 5) {
    baseScore = 2;
  } else if (total_transactions >= 2) {
    baseScore = 1.5;
  }

  // Success bonus
  const successRate = total_transactions / (total_transactions + failed_transactions || 1);
  let successBonus = 0;
  if (successRate >= 0.95) successBonus = 2;
  else if (successRate >= 0.9) successBonus = 1.5;
  else if (successRate >= 0.8) successBonus = 1;
  else successBonus = 0.5;

  // Duration bonus
  let durationBonus = 0;
  if (days_since_first_transaction >= 180) durationBonus = 2;
  else if (days_since_first_transaction >= 90) durationBonus = 1.5;
  else if (days_since_first_transaction >= 30) durationBonus = 1;

  // Blocking penalty
  let blockingPenalty = 1.0;
  if (blocked_count >= 3) blockingPenalty = 0.5;
  else if (blocked_count >= 2) blockingPenalty = 0.7;
  else if (blocked_count >= 1) blockingPenalty = 0.85;

  const trustScore = Math.min(
    (baseScore + successBonus + durationBonus) * blockingPenalty,
    10
  );

  return trustScore;
}
```

---

## 3. Update Logic

### Trigger: After Transaction Confirmation

Called in `POST /transaction/feedback` when user action = 'PROCEEDED'

```javascript
async function updatePayeeRelationship(
  userId,
  payeeId,
  transactionData,
  userAction  // 'PROCEEDED' | 'CANCELLED'
) {
  const user = await User.findOne({ user_id: userId });
  
  if (!user.known_payees) {
    user.known_payees = {};
  }

  let payeeRecord = user.known_payees[payeeId];

  // NEW PAYEE: Create entry
  if (!payeeRecord) {
    payeeRecord = {
      payee_id: payeeId,
      payee_name: transactionData.payee_name,
      payee_type: detectPayeeType(transactionData),
      first_seen_date: new Date(),
      last_transaction_date: new Date(),
      
      total_transactions: 0,
      failed_transactions: 0,
      total_amount_sent: 0,
      avg_amount: 0,
      max_amount: 0,
      min_amount: Infinity,
      
      trust_score: 0,
      days_since_first_transaction: 0,
      consecutive_successful: 0,
      intent_mismatch_count: 0,
      blocked_count: 0,
      
      is_new_payee: true,
      is_one_time: true,
      is_recurring: false,
      relationship_duration_days: 0,
      
      typical_amount_range: { min: 0, max: 0, median: 0 },
      typical_day_of_week: null,
      typical_time_hour: null,
      risk_flags: []
    };
  }

  // UPDATE based on user action
  if (userAction === 'PROCEEDED') {
    payeeRecord.total_transactions += 1;
    payeeRecord.last_transaction_date = new Date();
    payeeRecord.consecutive_successful += 1;
  } else if (userAction === 'CANCELLED') {
    payeeRecord.failed_transactions += 1;
    payeeRecord.consecutive_successful = 0;
  }

  // UPDATE aggregates
  const amount = transactionData.amount;
  payeeRecord.total_amount_sent += amount;
  payeeRecord.avg_amount = Math.round(payeeRecord.total_amount_sent / payeeRecord.total_transactions);
  payeeRecord.max_amount = Math.max(payeeRecord.max_amount || 0, amount);
  payeeRecord.min_amount = Math.min(payeeRecord.min_amount || Infinity, amount);

  // UPDATE relationship classification
  const daysSinceFirst = Math.floor(
    (Date.now() - payeeRecord.first_seen_date) / (1000 * 60 * 60 * 24)
  );
  payeeRecord.days_since_first_transaction = daysSinceFirst;
  payeeRecord.relationship_duration_days = daysSinceFirst;
  
  payeeRecord.is_new_payee = daysSinceFirst < 30;
  payeeRecord.is_one_time = payeeRecord.total_transactions === 1;
  payeeRecord.is_recurring = payeeRecord.total_transactions >= 3;

  // UPDATE trust score
  payeeRecord.trust_score = calculatePayeeTrustScore(payeeRecord);

  // UPDATE timing patterns
  const txnDate = new Date();
  payeeRecord.typical_day_of_week = DAYS[txnDate.getDay()];
  payeeRecord.typical_time_hour = txnDate.getHours();

  // Save
  user.known_payees[payeeId] = payeeRecord;
  await user.save();

  return payeeRecord;
}
```

---

## 4. Detection Logic

### New Payee Detection
```javascript
function isNewPayee(payeeRecord) {
  if (!payeeRecord) return true; // Never seen before
  
  const daysSinceFirst = payeeRecord.days_since_first_transaction;
  return daysSinceFirst < 30;
}
```

### One-Time Payee Detection
```javascript
function isOneTimePayee(payeeRecord) {
  return payeeRecord && payeeRecord.total_transactions === 1;
}
```

### Recurring Payee Detection
```javascript
function isRecurringPayee(payeeRecord) {
  if (!payeeRecord) return false;
  
  return (
    payeeRecord.is_recurring === true ||
    payeeRecord.total_transactions >= 3
  );
}
```

### Risk Pattern Detection
```javascript
function detectPayeeRiskPatterns(payeeRecord) {
  const risks = [];

  // High block rate
  if (payeeRecord.blocked_count >= 3) {
    risks.push('high_block_rate');
  }

  // Intent mismatches
  if (payeeRecord.intent_mismatch_count >= 2) {
    risks.push('intent_pattern_inconsistency');
  }

  // Amount deviations
  if (payeeRecord.max_amount > payeeRecord.avg_amount * 3) {
    risks.push('extreme_amount_variance');
  }

  // Low success rate
  const successRate = payeeRecord.total_transactions / 
                      (payeeRecord.total_transactions + payeeRecord.failed_transactions || 1);
  if (successRate < 0.7) {
    risks.push('low_success_rate');
  }

  return risks;
}
```

---

## 5. Feature Extraction Integration

### Used By: featureExtractor.js

```javascript
async function extractPayeeFeatures(userId, payeeId) {
  const user = await User.findOne({ user_id: userId });
  const payeeRecord = user.known_payees[payeeId];

  return {
    is_new_payee: isNewPayee(payeeRecord),
    payee_trust_score: payeeRecord?.trust_score || 0,
    payee_is_individual: payeeRecord?.payee_type === 'INDIVIDUAL',
    is_one_time: isOneTimePayee(payeeRecord),
    is_recurring: isRecurringPayee(payeeRecord),
    avg_payee_amount: payeeRecord?.avg_amount || 0,
    payee_blocked_count: payeeRecord?.blocked_count || 0,
    payee_risk_patterns: detectPayeeRiskPatterns(payeeRecord) || []
  };
}
```

---

## 6. NO Raw Transaction Logs

### What We DON'T Store
```javascript
// ❌ DON'T DO THIS - wastes space
transaction_logs: [
  { date: '2026-01-15', amount: 5000, status: 'SUCCESS' },
  { date: '2026-01-22', amount: 5500, status: 'SUCCESS' },
  { date: '2026-02-01', amount: 6000, status: 'FAILED' },
  // ... 100+ entries
]
```

### What We DO Store
```javascript
// ✅ DO THIS - aggregated only
total_transactions: 102,
failed_transactions: 3,
total_amount_sent: 510000,
avg_amount: 5000,
max_amount: 12000,
min_amount: 2000,
consecutive_successful: 23,
typical_day_of_week: 'FRIDAY'
```

---

## Summary Table

| Feature | Storage | Purpose |
|---------|---------|---------|
| `payee_id` | String | Unique identifier |
| `first_seen_date` | Date | Determine if new |
| `total_transactions` | Number | Trust base score |
| `failed_transactions` | Number | Penalties for failed txns |
| `trust_score` | Number | 0-10 risk classification |
| `avg_amount`, `max_amount` | Number | Detect amount anomalies |
| `blocked_count` | Number | Pattern of flags/delays |
| `is_new_payee` | Boolean | < 30 days |
| `is_one_time` | Boolean | Only 1 transaction |
| `is_recurring` | Boolean | 3+ transactions |
| `risk_flags` | Array | Specific pattern alerts |

---

This design avoids data bloat while capturing all behavioral signals needed for risk assessment.
