# Feature Extraction Engine - Implementation Summary

## ✅ What's Implemented

### 1. Question-to-Feature Mapping
```
6 Scam-Detection Questions → 6 Feature Categories → ~47 Total Features

Q1: "Do I know this person?"
    └─→ PAYEE features (8)
        • is_new_payee, trust_score, is_individual, is_one_time, 
          is_recurring, avg_amount, blocked_count, risk_patterns

Q2: "Is this amount too high for me?"
    └─→ AMOUNT features (9)
        • amount_value, user_avg, user_max, vs_avg_ratio, 
          is_largest_ever, is_multiple_of_avg, near_max

Q3: "Why the rush? Is someone pressuring me?"
    └─→ TIME & URGENCY features (7)
        • transaction_hour, is_unusual_hour, recent_tx_count_24h,
          rapid_succession, confirmation_faster_than_baseline

Q4: "What am I sending money for?"
    └─→ INTENT features (6)
        • selected_intent, intent_mismatch, is_risky_intent,
          intent_mismatch_count, flagged_tx_count

Q5: "Am I hesitating? Does something feel off?"
    └─→ HESITATION features (7)
        • amount_edit_count, excessive_edits, confirmation_delay_ms,
          unusual_hesitation, hesitation_score

Q6: "Can I afford to lose this money?"
    └─→ VULNERABILITY features (10)
        • user_type, account_age_days, is_new_user, is_low_experience,
          cooling_off_enabled, ignored_warnings_count, vulnerability_score
```

### 2. Enhanced Feature Extractor (src/services/featureExtractor.js)
```javascript
NEW: QUESTION_MAPPING constant
     ├─ Maps each question to its features
     ├─ Documents which features answer which question
     └─ Exportable for reference & ML training

ENHANCED: extractTransactionFeatures()
          ├─ Returns 47 features across 6 categories
          ├─ Detailed comments for each feature
          ├─ Clear derivation logic (HOW feature is calculated)
          ├─ NO risk scores computed (that's risk engine's job)
          └─ Metadata shows total feature count
```

### 3. Detailed Documentation (docs/FEATURE_EXTRACTION_ENGINE.md)
```
Sections:
├─ Q1-Q6: Question → Features mapping with tables
├─ Derivation: How each of 47 features is calculated
├─ Data Flow: Visual diagram of extraction process
├─ Statistics: Feature count by category & type
├─ What's NOT here: Clarifies separation of concerns
├─ Usage Example: Code sample showing extraction
└─ Summary: Quick reference table
```

---

## 📊 Feature Extraction Statistics

### By Category
```
PAYEE:           8 features  (Know person?)
AMOUNT:          9 features  (Too high?)
TIME & URGENCY:  7 features  (Why rush?)
INTENT:          6 features  (What for?)
HESITATION:      7 features  (Doubting?)
VULNERABILITY:  10 features  (Afford loss?)
─────────────────────────────────
TOTAL:          ~47 features
```

### By Data Type
```
Boolean:     16  (is_new_payee, is_largest_ever, excessive_edits, ...)
Numeric:     26  (amount, trust_score, ratios, counts, ...)
String:       3  (selected_intent, user_type, risk_level, ...)
Array:        1  (payee_risk_patterns)
Composite:    1  (vulnerability_score)
─────────────────────────────────
TOTAL:      ~47 features
```

### By Source
```
User Memory (User collection):              28 features
Payee Relationship (PayeeRelationship):      8 features
Transaction Context (current txn):           7 features
Behavioral Signals (form inputs):            4 features
─────────────────────────────────────────────
TOTAL:                                      47 features
```

---

## 🔄 Feature Derivation Examples

### Example 1: Amount too high? (Q2)
```
Raw Input:  amount = 5000
User Data:  avg_amount = 2000, max_amount = 4000

Derived Features:
  amount_vs_avg_ratio = 5000 / 2000 = 2.5     (numeric)
  is_largest_ever = 5000 > 4000 = true        (boolean)
  is_multiple_of_avg = 5000 > (2000 * 3) = false
  near_max = 5000 > (4000 * 0.8) = true

Risk Engine Uses These Later:
  If is_largest_ever → +0.3 to amount risk score
  If amount_vs_avg_ratio > 3 → higher risk
```

### Example 2: Know this person? (Q1)
```
Raw Input:  payee_id = 'payee_123'
Payee Data: is_new_payee = false
            trust_score = 7.5 (from trust algorithm)
            is_recurring = true
            blocked_count = 0

Derived Features:
  payee_trust_score = 7.5         (numeric 0-10)
  is_recurring = true             (boolean)
  payee_blocked_count = 0         (numeric)

Risk Engine Uses These:
  If trust_score > 6 → LOW payee risk
  If blocked_count >= 3 → higher payee risk
```

### Example 3: Hesitating? (Q5)
```
Behavioral Signal: User edited amount 4 times, paused 8 seconds

Derived Features:
  amount_edit_count = 4           (numeric)
  excessive_edits = 4 > 3 = true  (boolean)
  confirmation_delay_ms = 8000    (numeric)
  unusual_hesitation = 8000 > (avg_5000 * 1.5) = true

Risk Engine Interprets:
  Multiple edits + long pause → user doubt → higher risk
  Could indicate: Confusion, pressure, or reconsidering
```

---

## 🎯 Key Design Principles

### 1. ONLY Features, NO Risk Scores
```javascript
✅ CORRECT: features.is_new_payee = true
✅ CORRECT: features.amount_vs_avg_ratio = 2.5
❌ WRONG:   features.risk_score = 0.75
❌ WRONG:   features.risk_level = 'MEDIUM'
```

### 2. Aggregates Only, NO Raw Logs
```javascript
✅ CORRECT: features.recent_tx_count_24h = 3
✅ CORRECT: features.avg_payee_amount = 5000
❌ WRONG:   features.recent_transactions = [
  { date: '2026-02-05', amount: 1000 },
  { date: '2026-02-04', amount: 2000 }
]
```

### 3. Clear Derivation, Easy to Understand
```javascript
// Each feature includes:
// 1. Descriptive name (is_new_payee, not new_p)
// 2. Comment explaining what it measures
// 3. Source data (where it comes from)
// 4. Calculation (how it's derived)
```

### 4. Question → Feature Traceability
```javascript
// Anyone can see:
// - Which features answer Q1 (Know person?)
// - Which features answer Q2 (Amount high?)
// - How these features come together in risk engine
```

---

## 📈 Data Flow

```
┌──────────────────────────────────────┐
│ Transaction Submission               │
│ POST /transaction/intent              │
│ { user_id, amount, payee_id, intent } │
└────────────────┬─────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌──────────┐            ┌──────────────────┐
│ User     │            │ Payee            │
│ Memory   │            │ Relationship     │
│ (150     │            │ (30 fields)      │
│ fields)  │            │                  │
└──┬───────┘            └────────┬─────────┘
   │                             │
   │ Behavioral                  │
   │ Signals                     │
   └──────────┬──────────────────┘
              │
              ▼
    ┌─────────────────────────────────┐
    │ Feature Extraction Engine       │
    │                                 │
    │ extractTransactionFeatures()   │
    │                                 │
    │ Q1 → Payee features (8)        │
    │ Q2 → Amount features (9)       │
    │ Q3 → Time & Urgency (7)        │
    │ Q4 → Intent features (6)       │
    │ Q5 → Hesitation features (7)   │
    │ Q6 → Vulnerability (10)        │
    │                                 │
    │ TOTAL: 47 features             │
    └─────────────┬───────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │ Feature Vector                  │
    │ {                               │
    │   features: {                   │
    │     payee: {...},               │
    │     amount: {...},              │
    │     time_urgency: {...},        │
    │     intent: {...},              │
    │     hesitation: {...},          │
    │     vulnerability: {...}        │
    │   },                            │
    │   user_id,                      │
    │   timestamp,                    │
    │   metadata: {                   │
    │     feature_count: 47,          │
    │     categories: 6               │
    │   }                             │
    │ }                               │
    └─────────────┬───────────────────┘
                  │
         (NO RISK SCORES HERE)
                  │
                  ▼
    ┌─────────────────────────────────┐
    │ Risk Engine                     │
    │ calculateRiskLevel()            │
    │                                 │
    │ Uses features to compute:       │
    │ • Score per category (0-1)      │
    │ • Composite score               │
    │ • Risk level (LOW/MEDIUM/HIGH)  │
    │ • Action (ALLOW/WARN/DELAY)     │
    └─────────────────────────────────┘
```

---

## ✨ Integration Points

### 1. Transaction Intent Endpoint
```
POST /transaction/intent
├─ Calls extractTransactionFeatures()
├─ Gets 47 features
├─ Stores in Transaction.features_vector
└─ Passes to risk engine
```

### 2. ML Training
```
Features stored in Transaction.features_vector
├─ ~47 numerical/categorical features per transaction
├─ Combined with outcome (fraud/legit)
├─ Used to train ML models
└─ Helps understand scam patterns
```

### 3. Feature Analysis
```
GET /transaction/intent response includes:
├─ risk_level (based on features)
├─ category_scores (how each category scored)
├─ reason_codes (which features triggered alerts)
└─ explanation (human-readable explanation)
```

---

## 📁 Files Created/Modified

```
Created:
  ✅ docs/FEATURE_EXTRACTION_ENGINE.md
     (Comprehensive 400+ line design document)

Modified:
  ✅ src/services/featureExtractor.js
     • Added QUESTION_MAPPING constant
     • Enhanced comments for each feature
     • Clarified derivation logic
     • Added metadata output
     • Exported QUESTION_MAPPING for reference
```

---

## 🚀 What's Ready

✅ Feature extraction for all 6 questions
✅ ~47 features covering all scam-detection angles
✅ Clear mapping of questions → features
✅ Documented derivation for every feature
✅ NO risk scores computed (separation of concerns)
✅ Aggregates only (no storage bloat)
✅ Server running and endpoints working

---

## Next Steps (Risk Engine Uses These)

The 47 features feed into the **Risk Engine** which:
1. Scores each of 6 categories (0-1 range)
2. Weights the categories (payee=0.25, amount=0.2, etc.)
3. Computes composite score (0-10)
4. Maps to risk level (LOW/MEDIUM/HIGH)
5. Determines action (ALLOW/WARN/DELAY)

This happens in `src/services/riskEngine.js`
