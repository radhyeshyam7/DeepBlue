# Visual Guide: Behavioral Signal Capture System

## 1. Event Capture Timeline

```
USER PERSPECTIVE:
═════════════════════════════════════════════════════════════════════════

10:30:00 ┌─ Transaction starts
         │  "Send Money" form loads
         └─ [Frontend initializes signal capture]
         
10:30:05 ┌─ User enters amount: 5000
         └─ [Signal captured: amount_changed(0, 5000)]

10:30:08 ┌─ User changes amount: 7000
         └─ [Signal captured: amount_changed(5000, 7000)]

10:30:12 ┌─ User clicks "Select Payee"
         │  Payee search modal opens
         └─ [Timer started]

10:30:17 ┌─ User selects "John Smith"
         └─ [Signal captured: payee_selected(id, duration=5000ms)]

10:30:20 ┌─ User selects intent: "Refund"
         └─ [Signal captured: intent_selected('refund', previous='')]

10:30:22 ┌─ User clicks "Review Transaction"
         └─ [Signal captured: submission_marked() → review screen]

10:30:28 ┌─ User realizes needs to double-check
         │  Clicks "Edit Amount"
         └─ [Signal captured: back_to_edit('amount') → form screen]

10:30:33 ┌─ User re-verifies amount (7000)
         │  Clicks "Review Transaction" again
         └─ [No new signals - same values]

10:30:37 ┌─ User clicks "Confirm & Send"
         └─ [Signal captured: confirmation_clicked()]
         
         ┌─ Aggregates computed:
         │  - amount_edit_count = 2
         │  - edit_cycle_count = 1
         │  - confirmation_delay_ms = 9000
         │  - total_interaction_time_ms = 37000
         │  - hesitation_score = 0.35
         └─ [All signals batched for backend]

10:30:38 ┌─ Network request: POST /signals
         │  {
         │    transaction_id: "txn_123",
         │    signals: { amount_edit_count: 2, ... },
         │    events: [ 6 events ]
         │  }
         └─ [Backend receives and validates]

10:30:39 ┌─ Backend response: 200 OK
         │  Signals stored in transaction.behavioral_signals
         └─ [Transaction proceeds normally]

10:30:42 ┌─ Feature extraction phase (later)
         │  featureExtractor reads signals
         │  Computes hesitation feature
         └─ [Risk scoring uses hesitation]

10:30:45 ┌─ Risk score computed: 0.32 (32%)
         └─ [Action: ALLOW - below 50% threshold]
         
10:30:46 ┌─ Transaction completed
         └─ User receives confirmation
```

---

## 2. Data Flow Diagram

```
FRONTEND LAYER:
═════════════════════════════════════════════════════════════════════════
    
    TransactionForm.tsx
         │
         ├─ [onAmountChange] ──→ captureAmountChange()
         │                       │
         │                       └─→ signals.amount_edit_count++
         │
         ├─ [onPayeeSelect] ───→ capturePayeeSearch()
         │                       │
         │                       └─→ signals.payee_change_count++
         │
         ├─ [onIntentSelect] ──→ captureIntentSelection()
         │                       │
         │                       └─→ signals.intent_change_count++
         │
         ├─ [onBackToEdit] ────→ captureEditCycle()
         │                       │
         │                       └─→ signals.edit_cycle_count++
         │
         └─ [onConfirm] ───────→ captureConfirmation()
                                │
                                ├─→ Compute aggregates
                                │   - hesitation_score
                                │   - total_interaction_time_ms
                                │   - confirmation_delay_ms
                                │
                                └─→ flushSignals()
                                    │
                                    POST /api/transaction/behavioral-signals
                                    │
                                    └─→ [ Network ]


BACKEND LAYER:
═════════════════════════════════════════════════════════════════════════
    
    POST /api/transaction/behavioral-signals
         │
         ├─ Validate request structure
         │  - Has transaction_id?
         │  - Has timestamp?
         │  - Is timestamp recent?
         │
         ├─ Validate signal values
         │  - amount_edit_count: 0-100? ✓
         │  - hesitation_score: 0-1? ✓
         │  - All required fields present? ✓
         │
         ├─ Check consistency
         │  - edit_count matches events? ✓
         │  - timing makes sense? ✓
         │  - no impossible values? ✓
         │
         ├─ Check rate limits
         │  - User < 1000/hour? ✓
         │  - Transaction < 10 submissions? ✓
         │
         ├─ Detect injections
         │  - Suspicious patterns? ✓
         │  - Log any detected? ✓
         │
         └─ Store in MongoDB
            transaction.behavioral_signals = {
              signals: { ... },
              events: [ ... ],
              received_at: Date,
              validation_passed: true
            }


FEATURE EXTRACTION LAYER:
═════════════════════════════════════════════════════════════════════════
    
    featureExtractor.readSignals(transaction)
         │
         └─→ Extract signals into features:
             {
               hesitation: {
                 edit_count: 2,
                 excessive_edits: false,
                 confirmation_delay_ms: 9000,
                 unusual_hesitation: false
               },
               // ... 46 other features ...
             }


RISK SCORING LAYER:
═════════════════════════════════════════════════════════════════════════
    
    riskEngine.score(features)
         │
         ├─ payee_risk = 0.55 (new payee)
         ├─ amount_risk = 0.25 (₹7k = moderate)
         ├─ hesitation_risk = 0.35 (2 edits, 1 cycle)
         ├─ urgency_risk = 0.15 (normal timing)
         ├─ intent_risk = 0.20 (refund = routine)
         └─ vulnerability_risk = 0.30 (normal user)
              │
              └─→ composite_risk = 0.32 (32%)
                  │
                  └─→ ALLOW (< 50% threshold)
```

---

## 3. Signal Hierarchy

```
SIGNALS (What Frontend Captures)
═════════════════════════════════════════════════════════════════════════

Interaction Signals
├─ Amount Editing
│  ├─ amount_edit_count: 2
│  ├─ amount_changed_from: 5000
│  └─ amount_changed_to: 7000
│
├─ Payee Selection
│  ├─ payee_change_count: 0
│  ├─ payee_search_duration_ms: 5000
│  └─ new_payee: true
│
└─ Intent Declaration
   ├─ intent_change_count: 0
   ├─ selected_intent: "refund"
   └─ intent_matches_history: true

Hesitation Signals
├─ Edit Cycles
│  ├─ edit_cycle_count: 1 (back-to-edit)
│  ├─ fields_edited: ["amount"]
│  └─ cycles_history: [amount]
│
├─ Confirmation Delays
│  ├─ confirmation_delay_ms: 9000
│  ├─ review_screen_dwell_ms: 9000
│  └─ hesitation_evident: true
│
└─ Aggregate Hesitation
   ├─ hesitation_score: 0.35
   └─ hesitation_components:
      ├─ from_edits: 0.4 (2 edits / 5 max)
      ├─ from_delays: 0.3 (9s / 120s max)
      └─ from_cycles: 0.33 (1 cycle / 3 max)

Device & Context
├─ Device ID
├─ Session ID
├─ Timestamp
└─ Frontend Version

Warning Signals
├─ warning_shown_count: 1
├─ warning_ignored_count: 0
├─ warning_codes: ["new_payee_high_amount"]
└─ user_response_time_ms: 5000
```

---

## 4. Validation Pipeline

```
REQUEST ARRIVES
   │
   ▼
┌─────────────────────────────────┐
│ 1. REQUEST VALIDATION           │  ← Is JSON valid?
│    - Valid JSON?                │  ← Has required fields?
│    - transaction_id exists?     │  ← Is timestamp recent?
│    - timestamp valid?           │
└─────────────────────────────────┘
   │ ✓ PASS → | ✗ FAIL → 400 Bad Request
   │         │
   ▼         │
┌─────────────────────────────────┐
│ 2. SIGNAL VALUE VALIDATION      │  ← Are values in range?
│    - amount_edit_count: 0-100?  │  ← Are types correct?
│    - hesitation_score: 0-1?     │  ← Are strings under length limit?
│    - All values expected type?  │
└─────────────────────────────────┘
   │ ✓ PASS → | ✗ FAIL → 422 Unprocessable
   │         │
   ▼         │
┌─────────────────────────────────┐
│ 3. CONSISTENCY VALIDATION       │  ← Do aggregates match events?
│    - Edit count vs events?      │  ← Does timing make sense?
│    - Timing sequence valid?     │  ← Are impossible values detected?
│    - No injection patterns?     │
└─────────────────────────────────┘
   │ ✓ PASS → | ✗ FAIL → 422 Unprocessable
   │         │
   ▼         │
┌─────────────────────────────────┐
│ 4. RATE LIMIT CHECK             │  ← User < 1000/hour?
│    - User hourly limit?         │  ← Transaction < 10/txn?
│    - Per-transaction limit?     │  ← Min 1s between submissions?
│    - Abuse patterns?            │
└─────────────────────────────────┘
   │ ✓ PASS → | ✗ FAIL → 429 Too Many Requests
   │         │
   ▼         │
┌─────────────────────────────────┐
│ 5. INJECTION DETECTION          │  ← Log any suspicious patterns
│    - Impossible ranges?         │  ← Flag for investigation
│    - Inconsistent values?       │  ← Store with security flag
│    - Timing violations?         │
└─────────────────────────────────┘
   │ ✓ PASS → | ✗ LOG & CONTINUE (non-blocking)
   │
   ▼
┌─────────────────────────────────┐
│ 6. STORE IN MONGODB             │
│    transaction.behavioral_signals= {
│      signals: { ... },
│      events: [ ... ],
│      received_at: Date,
│      validation_passed: true
│    }
└─────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────┐
│ 7. RETURN RESPONSE              │
│    200 OK                       │
│    {                            │
│      success: true,             │
│      signals_received: 12,      │
│      stored_at: Date            │
│    }                            │
└─────────────────────────────────┘
```

---

## 5. What Gets Captured (Green) vs Not (Red)

```
Frontend Interaction Events:
═════════════════════════════════════════════════════════════════════════

✅ Amount Changes
   └─ "User changed amount from 5000 to 7000"
   └─ Captured: { new_amount: 7000, previous_amount: 5000 }
   └─ Count: 2 edits detected

✅ Payee Selection  
   └─ "User searched for payee for 5 seconds and selected John"
   └─ Captured: { payee_id: "p1", duration_ms: 5000 }
   └─ Count: 1 selection (first choice)

✅ Intent Selection
   └─ "User said this is a Refund"
   └─ Captured: { intent: "refund" }
   └─ Count: 1 intent declared

✅ Back-to-Edit
   └─ "User went back to edit amount after review"
   └─ Captured: { field: "amount" }
   └─ Count: 1 edit cycle

❌ Keystroke Details
   └─ NOT captured: exact keystrokes
   └─ NOT captured: how user typed amount
   └─ NOT captured: edits within a field before blur

❌ Mouse/Pointer Events
   └─ NOT captured: where mouse was
   └─ NOT captured: click coordinates
   └─ NOT captured: scroll position
   └─ NOT captured: pointer movements

❌ Ambient Browser Activity
   └─ NOT captured: other tabs open
   └─ NOT captured: idle time
   └─ NOT captured: copy/paste events
   └─ NOT captured: field focus time

❌ Backend-Computed Values (NOT sent by frontend)
   └─ NOT computed by frontend: is_new_payee
   └─ NOT computed by frontend: payee_trust_score
   └─ NOT computed by frontend: amount_zscore
   └─ NOT computed by frontend: vulnerability_score
```

---

## 6. Feature Extraction Mapping

```
SIGNALS → FEATURES
═════════════════════════════════════════════════════════════════════════

Signal: amount_edit_count = 2
   ├─ Feature: hesitation.edit_count = 2
   ├─ Feature: hesitation.excessive_edits = (2 > 3) = false
   └─ Component: 2/5 = 0.4 toward hesitation_score

Signal: edit_cycle_count = 1
   ├─ Feature: hesitation.review_cycles = 1
   ├─ Feature: hesitation.unusual_hesitation = (1 > 2) = false
   └─ Component: 1/3 = 0.33 toward hesitation_score

Signal: confirmation_delay_ms = 9000
   ├─ Feature: hesitation.confirmation_delay_ms = 9000
   ├─ Feature: hesitation.unusual_delay = (9000 > 60000) = false
   └─ Component: 9000/120000 = 0.075 toward hesitation_score

Result: hesitation_score = (0.4 + 0.33 + 0.075) / 3 = 0.268 ≈ 0.27

Signal: payee_change_count = 0
   └─ Feature: interaction.payee_reconsidered = false

Signal: intent_change_count = 0
   └─ Feature: interaction.intent_reconsidered = false

Signal: warning_ignored_count = 0
   └─ Feature: security.warning_ignored = false

→ These features feed into riskEngine.js for composite scoring
```

---

## 7. Complete Transaction Score Calculation

```
TRANSACTION RISK SCORE CALCULATION
═════════════════════════════════════════════════════════════════════════

Input: Transaction with behavioral signals
   {
     amount: 7000,
     payee: { name: "John Smith", age_days: 1 },  ← New payee
     intent: "refund",
     signals: {
       amount_edit_count: 2,
       edit_cycle_count: 1,
       confirmation_delay_ms: 9000,
       hesitation_score: 0.27
     }
   }

Step 1: Extract Features (47 features)
   ├─ hesitation features ─────→ [edit_count: 2, cycles: 1, delay: 9s, score: 0.27]
   ├─ payee features ──────────→ [is_new: true, trust_score: 0, mismatch: 0]
   ├─ amount features ─────────→ [zscore: 1.2, large: false, unusual: false]
   ├─ intent features ─────────→ [refund: true, high_risk_intent: false]
   └─ ... more features ...

Step 2: Score Each Category
   ├─ Payee Risk Score = 0.55
   │  └─ New payee (age=1 day) = base 0.5
   │  └─ No trust history = +0.05
   │
   ├─ Amount Risk Score = 0.25
   │  └─ ₹7k = moderate (0.25)
   │  └─ Not unusual for user
   │
   ├─ Urgency Risk Score = 0.15
   │  └─ Normal time pressure
   │  └─ Not rushed (9s review time)
   │
   ├─ Intent Risk Score = 0.20
   │  └─ Refund = routine (0.20)
   │  └─ Aligns with intent
   │
   ├─ Hesitation Risk Score = 0.35
   │  └─ 2 edits + 1 cycle = moderate (0.35)
   │  └─ But long review time (9s) suggests carefulness
   │
   └─ Vulnerability Risk Score = 0.30
      └─ Normal user (no fraud history)
      └─ Established account

Step 3: Composite Score (Weighted Average)
   
   Risk = (
     0.55 * 0.25 (payee weight) +     ← New payee is major factor
     0.25 * 0.20 (amount weight) +    ← Moderate amount
     0.15 * 0.15 (urgency weight) +   ← Not urgent
     0.20 * 0.15 (intent weight) +    ← Routine intent
     0.35 * 0.10 (hesitation weight)+ ← Some hesitation
     0.30 * 0.15 (vulnerability)      ← Normal user
   )
   
   Risk = 0.1375 + 0.05 + 0.0225 + 0.03 + 0.035 + 0.045
   Risk = 0.32 (32%)

Step 4: Determine Action
   
   Risk Score: 0.32 (32%)
   Threshold: 0.50 (50%)
   Action: ALLOW (< threshold)
   
   Reason:
   └─ New payee is concerning
   └─ But moderate amount, routine intent, careful review suggests legitimate
   └─ User showed hesitation (good sign - careful decision-making)
   └─ No fraud indicators

Result: ✅ ALLOW
   Transaction proceeds without warning
   Signals stored for learning
```

---

## 8. Error Handling Flow

```
Frontend Error Handling:
═════════════════════════════════════════════════════════════════════════

Try to capture signal
   │
   ├─ ✓ Success → Store in batch
   │
   └─ ✗ Error (e.g., invalid value)
      └─ Log error (console.warn)
      └─ Continue (non-blocking)
      └─ Don't interrupt user

Try to send signals
   │
   ├─ ✓ Success (200 OK) → Clear batch
   │
   ├─ ✗ Network error (timeout)
   │  └─ Wait 1 second
   │  └─ Retry (exponential backoff)
   │  └─ After 3 retries: give up (log & continue)
   │
   └─ ✗ Server error (400/422)
      └─ Log error code + message
      └─ Don't retry (would fail again)
      └─ Continue (signals optional)

Backend Error Handling:
═════════════════════════════════════════════════════════════════════════

Receive POST request
   │
   ├─ ✓ Valid request → Store signals
   │  └─ Return 200 OK
   │
   ├─ ✗ Request validation failed
   │  └─ Return 400 Bad Request
   │  └─ Include error details
   │  └─ Log for debugging
   │
   ├─ ✗ Signal validation failed
   │  └─ Return 422 Unprocessable
   │  └─ Include field-level errors
   │  └─ Don't store (invalid data)
   │
   ├─ ✗ Rate limit exceeded
   │  └─ Return 429 Too Many Requests
   │  └─ Include retry-after header
   │  └─ Log user for investigation
   │
   └─ ✗ Server error
      └─ Return 500 Internal Server Error
      └─ Log stack trace
      └─ Don't block transaction
```

---

## 9. Privacy Guarantees

```
WHAT WE CAPTURE (Transaction-Scoped)
═════════════════════════════════════════════════════════════════════════

✅ During a single transaction:
   ├─ What user entered (amounts, selected payee)
   ├─ How long user took to decide (confirmation_delay_ms)
   ├─ Whether user changed their mind (edit_count, cycles)
   ├─ What user said transaction was for (intent)
   └─ Device used to send (device_id)

❌ NOT captured:
   ├─ Any activity before transaction started
   ├─ Any activity after transaction sent
   ├─ Other transactions or browsing
   ├─ Passwords or sensitive data
   ├─ Payment details
   └─ PII beyond what's in transaction

Data Retention:
═════════════════════════════════════════════════════════════════════════

✅ Kept for analysis:
   ├─ 90 days if transaction is legitimate
   ├─ 2 years if transaction is disputed
   └─ Can be deleted on user request (GDPR right to erasure)

Sharing:
═════════════════════════════════════════════════════════════════════════

✅ Used only for:
   ├─ Risk scoring (this system)
   ├─ Fraud detection
   ├─ ML model training (anonymized)
   └─ Authorized security analysis

❌ NOT shared with:
   ├─ Third parties (unless required by law)
   ├─ Ad networks
   ├─ Marketing teams
   └─ Other services

GDPR Compliance:
═════════════════════════════════════════════════════════════════════════

✅ Lawful Basis:
   └─ Legitimate interest (fraud prevention)

✅ Data Subject Rights:
   ├─ Right to be informed (privacy policy)
   ├─ Right of access (show user their signals)
   ├─ Right to erasure (delete on request)
   ├─ Right to restrict (don't use signals)
   └─ Right to data portability (export signals)

✅ Data Protection:
   ├─ Encrypted in transit (HTTPS)
   ├─ Encrypted at rest (MongoDB encryption)
   ├─ Access logged (who accessed when)
   └─ Regular security audits
```

---

## Summary

| Aspect | What We Do |
|--------|-----------|
| **Capture** | User interactions during transaction (amounts, selections, timing) |
| **Store** | In transaction record, encrypted, for 90 days |
| **Use** | Risk scoring, fraud detection, ML learning |
| **Protect** | Full encryption, access logs, GDPR compliant |
| **Share** | Only within company, only for security |
| **Privacy** | Transaction-scoped, non-invasive, deletable on request |

This design respects user privacy while providing critical signals for fraud prevention.
