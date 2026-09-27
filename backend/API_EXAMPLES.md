# API Examples for Postman Testing

## Quick Test Flow

### 1. Submit Transaction Intent (New User - High Risk Scenario)

**POST** `http://localhost:3000/transaction/intent`

```json
{
  "user_id": "user_001",
  "amount": 50000,
  "payee_id": "payee_001",
  "intent_type": "purchase",
  "behavioral_signals": {
    "hesitation_time_ms": 4000,
    "amount_edit_count": 5,
    "confirmation_delay_ms": 6000
  }
}
```

**Expected Response:**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "RECEIVED"
}
```

### 2. Get Risk Decision

**POST** `http://localhost:3000/transaction/decision`

```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Expected Response (HIGH risk):**
```json
{
  "risk_level": "HIGH",
  "action": "DELAY",
  "reason_codes": [
    "new_payee",
    "amount_spike",
    "hesitation_detected"
  ]
}
```

### 3. Submit User Feedback

**POST** `http://localhost:3000/transaction/feedback`

```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_action": "PROCEEDED"
}
```

**Expected Response:**
```json
{
  "status": "ACKNOWLEDGED"
}
```

---

## Test Scenarios

### Scenario 1: Low Risk Transaction

**Step 1:** Create a regular user by submitting 5+ small transactions:
```json
POST /transaction/intent
{
  "user_id": "regular_user",
  "amount": 1000,
  "payee_id": "known_payee",
  "intent_type": "purchase"
}
```
Repeat 5 times.

**Step 2:** Submit another transaction with same payee:
```json
POST /transaction/intent
{
  "user_id": "regular_user",
  "amount": 1200,
  "payee_id": "known_payee",
  "intent_type": "purchase"
}
```

**Expected:** `risk_level: "LOW"`, `action: "ALLOW"`

---

### Scenario 2: Medium Risk (Amount Spike)

**Step 1:** Establish baseline with small transactions:
```json
POST /transaction/intent
{
  "user_id": "spike_user",
  "amount": 1000,
  "payee_id": "payee_spike",
  "intent_type": "purchase"
}
```
Repeat 5 times.

**Step 2:** Submit large transaction:
```json
POST /transaction/intent
{
  "user_id": "spike_user",
  "amount": 3000,
  "payee_id": "payee_spike",
  "intent_type": "purchase"
}
```

**Expected:** `risk_level: "MEDIUM"`, `action: "WARN"`, `reason_codes: ["amount_spike"]`

---

### Scenario 3: High Risk (New User + New Payee + High Amount)

```json
POST /transaction/intent
{
  "user_id": "brand_new_user",
  "amount": 75000,
  "payee_id": "unknown_payee",
  "intent_type": "purchase",
  "behavioral_signals": {
    "hesitation_time_ms": 5000,
    "amount_edit_count": 8,
    "confirmation_delay_ms": 7000
  }
}
```

**Expected:** `risk_level: "HIGH"`, `action: "DELAY"`, multiple reason codes

---

## Health Check

**GET** `http://localhost:3000/health`

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "mongodb": "connected"
}
```

