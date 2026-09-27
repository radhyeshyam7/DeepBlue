# Frontend Behavioral Signal Capture Design

## Overview

The frontend captures **behavioral interaction signals** during transaction flow and sends them to the backend. These signals feed into the feature extraction engine for risk scoring.

**Key Principle:** Frontend captures EXACT values user provides. Backend never guesses.

---

## 1. Frontend Events to Capture

### 1.1 Amount Field Events

| Event | Trigger | Data Captured | Purpose |
|-------|---------|---------------|---------|
| `amount_focused` | User clicks amount field | timestamp | When user starts entering amount |
| `amount_changed` | User types/changes value | new_amount, previous_amount, timestamp | Track each edit (for edit_count) |
| `amount_blurred` | User leaves amount field | timestamp | When user finishes with amount |

**Example:**
```
User enters: 5000
Frontend fires: amount_changed(previous: '', new: '5000', time: 1234567890)

User changes to: 7000
Frontend fires: amount_changed(previous: 5000, new: 7000, time: 1234567895)

Edit count: 2 ← Feature for hesitation score
```

### 1.2 Payee Selection Events

| Event | Trigger | Data Captured | Purpose |
|-------|---------|---------------|---------|
| `payee_search_started` | User clicks "Select payee" | timestamp | Mark start of search |
| `payee_selected` | User picks payee | payee_id, payee_name, search_duration_ms | Track selection time |
| `payee_changed` | User changes payee | old_payee_id, new_payee_id | Track reconsidering |

**Example:**
```
User clicks "Select payee": 10:30:00
Frontend fires: payee_search_started(time: 1234567890)

User selects "John Smith": 10:30:05
Frontend fires: payee_selected(id: 'p1', name: 'John', duration: 5000ms)
Payee selection time: 5 seconds ← Could be fast or slow depending on user
```

### 1.3 Intent Selection Events

| Event | Trigger | Data Captured | Purpose |
|-------|---------|---------------|---------|
| `intent_selected` | User chooses intent | intent, previous_intent | Track what user says transaction is for |
| `intent_explanation_viewed` | User clicks "Why?" button | intent, view_count | Track if user confused about intent |

**Example:**
```
User selects intent: "Refund"
Frontend fires: intent_selected(selected: 'refund', previous: '')

User then changes to: "Bills"
Frontend fires: intent_selected(selected: 'bills', previous: 'refund')
Intent mismatch count: 1 ← Feature for intent mismatch
```

### 1.4 Review & Confirmation Events

| Event | Trigger | Data Captured | Purpose |
|-------|---------|---------------|---------|
| `review_started` | User clicks "Review" | timestamp | Mark start of review screen |
| `back_to_edit` | User clicks "Edit [field]" | field, edit_cycle_count | Track reconsidering (hesitation) |
| `confirmation_clicked` | User clicks "Confirm" | submission_to_confirmation_ms | Time from submission to confirm |

**Example:**
```
Timeline:
10:30:00 - User starts transaction (start_time)
10:30:15 - User clicks "Review" (review_started)
10:30:20 - User realizes amount wrong, clicks "Back to edit amount"
          Frontend fires: back_to_edit(field: 'amount', cycle: 1)
10:30:25 - User changes amount and clicks "Review" again (review_started)
10:30:30 - User clicks "Confirm"
          Frontend fires: confirmation_clicked()
          Confirmation delay: 10:30:30 - 10:30:25 = 5 seconds
          Total interaction: 30 seconds
          Edit cycles: 1
```

### 1.5 Warning Response Events

| Event | Trigger | Data Captured | Purpose |
|-------|---------|---------------|---------|
| `warning_displayed` | Backend sends warning | warning_code | Mark when warning shown |
| `warning_response` | User responds to warning | warning_code, response, response_time_ms | Track if user ignores warning |

**Response Types:**
- `confirmed` - User acknowledged and proceeded
- `cancelled` - User cancelled transaction
- `ignored` - User proceeded without acknowledging
- `closed` - User closed warning without action

**Example:**
```
10:30:20 - Warning shown: "Large new payee"
          Frontend fires: warning_displayed(code: 'new_payee_high_amount')

10:30:25 - User clicks "Proceed anyway"
          Frontend fires: warning_response(code: 'new_payee_high_amount', 
                                          response: 'confirmed', 
                                          response_time: 5000)
          
OR

10:30:25 - User waits 10 seconds without responding
          Frontend could fire: warning_response(response: 'ignored', time: 10000)
```

### 1.6 Session & Device Events

| Event | Trigger | Data Captured | Purpose |
|-------|---------|---------------|---------|
| `session_started` | Transaction begins | device_id, session_id | Track device consistency |
| `device_changed` | User switches device | new_device_id, old_device_id | Detect suspicious behavior |

---

## 2. Payload Sent to Backend

### 2.1 Signal Submission (POST /api/transaction/behavioral-signals)

```javascript
{
  // Identifiers
  transaction_id: "txn_1707238200000_abc123",
  session_id: "session_1707238200000_def456",
  
  // When this signal batch was received
  timestamp: 1707238215000,
  
  // Aggregated signals (computed from raw events)
  signals: {
    // Edit counts
    amount_edit_count: 2,
    payee_change_count: 0,
    intent_change_count: 1,
    edit_cycle_count: 1,  // Back-to-edit count
    
    // Time signals (milliseconds)
    confirmation_delay_ms: 5000,
    total_interaction_time_ms: 30000,
    
    // Composite hesitation score
    hesitation_score: 0.35,  // Computed from edits+delays+cycles
    hesitation_components: {
      edit_count: 2,
      delay_seconds: 5,
      review_cycles: 1
    },
    
    // Warning signals
    warning_shown_count: 1,
    warning_ignored_count: 0,
    
    // Device context
    device_id: "device_123abc"
  },
  
  // Raw events (for debugging/analysis)
  events: [
    {
      event_type: "transaction_started",
      timestamp: 1707238200000,
      data: { transaction_id: "txn_1707238200000_abc123" }
    },
    {
      event_type: "amount_changed",
      timestamp: 1707238202000,
      data: { new_amount: 5000, previous_amount: 0 }
    },
    {
      event_type: "amount_changed",
      timestamp: 1707238208000,
      data: { new_amount: 7000, previous_amount: 5000 }
    },
    {
      event_type: "payee_selected",
      timestamp: 1707238210000,
      data: { payee_id: "p1", payee_name: "John Smith", search_duration_ms: 3000 }
    },
    {
      event_type: "intent_selected",
      timestamp: 1707238212000,
      data: { intent: "refund", previous_intent: "" }
    },
    {
      event_type: "review_started",
      timestamp: 1707238215000,
      data: { timestamp: 1707238215000 }
    },
    {
      event_type: "warning_displayed",
      timestamp: 1707238216000,
      data: { warning_code: "new_payee_high_amount" }
    },
    {
      event_type: "confirmation_clicked",
      timestamp: 1707238220000,
      data: { 
        submission_to_confirmation_ms: 5000,
        total_interaction_time_ms: 20000
      }
    }
  ],
  
  // Metadata
  frontend_version: "1.2.3",
  user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
}
```

---

## 3. Timing & Frequency of Signal Capture

### 3.1 When Signals Are Sent

| Trigger | Timing | Content |
|---------|--------|---------|
| **Periodic** | Every 30 seconds during form interaction | Raw events accumulated since last send |
| **Submission** | When user clicks "Submit/Review" | All events so far + computed aggregates |
| **Confirmation** | When user clicks "Confirm" | All events + final aggregates |
| **Cancellation** | When user cancels transaction | All accumulated events |

### 3.2 Timeline Example

```
10:30:00 - Transaction starts
           onTransactionStart() called
           Signal capture active

10:30:10 - 10 seconds of events captured
           No send yet (< 30s)

10:30:25 - User submits transaction
           onTransactionSubmitted() called
           → Sends all events immediately
           + Computes hesitation_score, edit_count, etc.
           POST /api/transaction/behavioral-signals

10:30:30 - User in review screen
           Some time passes without events
           Periodic flush would trigger after 30s

10:30:35 - User clicks "Confirm"
           onConfirmationClick() called
           onTransactionConfirmed() called
           → Sends final signals + confirmation timing
           POST /api/transaction/behavioral-signals (final)

10:30:40 - Backend receives both submissions
           Stores in transaction.behavioral_signals
           Will be used during feature extraction
```

### 3.3 Signal Calculation Rules

**When to send:**
```
┌─ Every 30 seconds (ongoing) → Flush accumulated events
├─ On form submission → Send all + compute aggregates
├─ On confirmation → Send with confirmation timing
└─ On cancellation → Send with cancel flag
```

**When to compute aggregates:**
```
aggregates = {
  amount_edit_count: Count all 'amount_changed' events,
  payee_change_count: Count all 'payee_changed' events,
  intent_change_count: Count all 'intent_selected' events,
  edit_cycle_count: Count all 'back_to_edit' events,
  
  confirmation_delay_ms: Time between 'submitted' and 'confirmed',
  total_interaction_time_ms: Time since 'transaction_started',
  
  hesitation_score: Average of (
    min(edit_count / 5, 1.0),              // 5 edits = max
    min(delay_ms / 120000, 1.0),           // 2 minutes = max
    min(back_to_edit_count / 3, 1.0)       // 3 cycles = max
  )
}
```

---

## 4. Integration with Backend

### 4.1 How Signals Flow to Features

```
Frontend Capture
  ↓
POST /api/transaction/behavioral-signals
  ↓
Backend stores in transaction.behavioral_signals
  ↓
featureExtractor.js reads behavioral_signals
  ↓
Extracts into features:
  features.hesitation = {
    edit_count: signals.amount_edit_count,
    excessive_edits: signals.amount_edit_count > 3,
    confirmation_delay_ms: signals.confirmation_delay_ms,
    unusual_hesitation: signals.hesitation_score > 0.5
  }
  ↓
Risk engine uses hesitation features for scoring
```

### 4.2 Validation Rules

Backend validates all signals before storing:

```javascript
Validation Rules:
- amount_edit_count: 0-100
- payee_change_count: 0-50
- intent_change_count: 0-20
- edit_cycle_count: 0-50
- confirmation_delay_ms: 0-600000 (10 minutes)
- total_interaction_time_ms: 0-600000 (10 minutes)
- hesitation_score: 0-1 (float)
- warning_shown_count: 0-20
- warning_ignored_count: 0-20
- device_id: non-empty string

If validation fails:
→ Return 400 error
→ Frontend retries
→ Log for debugging
```

---

## 5. What NOT to Capture

### ❌ Invasive Signals (NOT captured)
```
❌ Keystroke logging
❌ Mouse movements
❌ Click coordinates
❌ Copy/paste events
❌ Text selection
❌ Scroll position
❌ Spelling corrections
❌ Autocomplete usage
❌ Focus time per field (only total time)
```

### ❌ Backend-Computed Signals (NOT sent by frontend)
```
❌ is_new_payee (backend checks payee age)
❌ payee_trust_score (from PayeeRelationship)
❌ amount_zscore (computed from user baseline)
❌ hour_zscore (computed from timestamp)
❌ intent_mismatch (computed in risk engine)
```

### ✅ Only Exact User Actions
```
✅ amount_edit_count = how many times user changed the value
✅ confirmation_delay_ms = time user took to confirm
✅ payee_selected = which payee user chose
✅ warning_response = did user click "confirm" or "cancel"
✅ intent_selected = which option user clicked
```

---

## 6. Implementation Checklist

### Frontend
- [ ] Create `behavioralSignalCapture.js` service
- [ ] Add signal capture to transaction form component
- [ ] Call appropriate event methods at each interaction point
- [ ] Validate all values before recording
- [ ] Implement periodic flushing every 30s
- [ ] Handle network errors with retry logic

### Backend
- [ ] Create `/api/transaction/behavioral-signals` endpoint
- [ ] Validate all signal values on receipt
- [ ] Store signals in transaction record
- [ ] Make signals available to featureExtractor
- [ ] Log rejected submissions for debugging

### Integration
- [ ] Modify featureExtractor.js to read behavioral_signals
- [ ] Add hesitation features from signals
- [ ] Test signal flow end-to-end
- [ ] Verify risk engine uses hesitation features

---

## 7. Data Model

### Signal Storage in Transaction

```javascript
// In Transaction model
{
  _id: ObjectId,
  user_id: "user_123",
  amount: 7000,
  payee_id: "payee_456",
  intent: "refund",
  
  // NEW: Behavioral signals
  behavioral_signals: {
    session_id: "session_...",
    received_at: Date,
    signals: {
      amount_edit_count: 2,
      payee_change_count: 0,
      intent_change_count: 1,
      edit_cycle_count: 1,
      confirmation_delay_ms: 5000,
      total_interaction_time_ms: 30000,
      hesitation_score: 0.35,
      device_id: "device_123"
    },
    events_count: 8,
    frontend_version: "1.2.3"
  },
  
  // For detailed analysis
  behavioral_events: [
    { event_type: "amount_changed", timestamp: 1234567890, ... },
    // ... up to 50 most recent events
  ]
}
```

---

## 8. Error Handling

### Network Failures
```
POST /api/transaction/behavioral-signals
  ↓
Network error or timeout
  ↓
Frontend waits 1 second
  ↓
Retry POST (exponential backoff)
  ↓
If still failing after 3 retries:
  → Continue transaction (signals not critical)
  → Log error for debugging
  → Don't block user
```

### Invalid Signals
```
POST with invalid hesitation_score: 1.5 (should be 0-1)
  ↓
Backend validation fails
  ↓
Return 400 Bad Request
  ↓
Frontend logs and retries with correct value
```

---

## 9. Privacy & GDPR

### Data Retention
```
Behavioral signals deleted after:
- 90 days (if transaction legitimate)
- 2 years (if transaction disputed/fraud)
- On user request (right to erasure)
```

### User Consent
```
- Signals are behavioral (what user did)
- Not biometric or identity data
- Required for transaction risk assessment
- Disclosed in terms of service
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **Events Captured** | Amount edits, Payee selection, Intent choice, Review cycles, Confirmation timing, Warning responses |
| **Data Sent** | Exact user values + computed aggregates (edit count, delay time, hesitation score) |
| **Frequency** | Every 30s (periodic), on submit, on confirm, on cancel |
| **No Invasive Tracking** | Only form interactions, no mouse/keystroke tracking |
| **No Backend Guessing** | All values from frontend (backend never fabricates) |
| **Storage** | In transaction record for feature extraction |
| **Privacy** | Behavioral data, GDPR compliant, auto-deleted |

This design ensures the backend gets all the signals it needs for accurate risk scoring, while respecting user privacy and never guessing missing data.
