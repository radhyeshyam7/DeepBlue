# Backend Signal Validation Rules

## Overview

The backend validates all signals received from the frontend before storing them. This document specifies all validation rules, error codes, and handling procedures.

---

## 1. Request Validation

### 1.1 Request Structure

```javascript
Expected POST /api/transaction/behavioral-signals body:
{
  transaction_id: string (required, non-empty),
  session_id: string (required, non-empty),
  timestamp: number (required, valid unix timestamp),
  signals: object (required, with specific properties),
  events: array (optional, but if provided must be valid),
  frontend_version: string (optional),
  user_agent: string (optional)
}
```

### 1.2 Validation Code

```javascript
// middleware/validateBehavioralSignals.js
export const validateBehavioralSignals = (req, res, next) => {
  const { body } = req;
  const errors = [];

  // Required fields
  if (!body.transaction_id || typeof body.transaction_id !== 'string') {
    errors.push({
      code: 'INVALID_TRANSACTION_ID',
      message: 'transaction_id must be non-empty string'
    });
  }

  if (!body.session_id || typeof body.session_id !== 'string') {
    errors.push({
      code: 'INVALID_SESSION_ID',
      message: 'session_id must be non-empty string'
    });
  }

  if (typeof body.timestamp !== 'number' || body.timestamp <= 0) {
    errors.push({
      code: 'INVALID_TIMESTAMP',
      message: 'timestamp must be valid unix timestamp'
    });
  }

  // Timestamp must be recent (within 2 hours)
  const now = Date.now();
  const age = now - body.timestamp;
  if (age > 7200000) {  // 2 hours
    errors.push({
      code: 'STALE_TIMESTAMP',
      message: 'signal timestamp is too old (> 2 hours)'
    });
  }

  // Signals object required
  if (!body.signals || typeof body.signals !== 'object') {
    errors.push({
      code: 'MISSING_SIGNALS',
      message: 'signals object is required'
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors,
      receivedAt: new Date()
    });
  }

  next();
};
```

---

## 2. Signal Values Validation

### 2.1 Allowed Signal Types

```javascript
const ALLOWED_SIGNAL_TYPES = {
  // Edit counts (0-100)
  amount_edit_count: {
    type: 'number',
    min: 0,
    max: 100,
    description: 'Number of times amount field was edited'
  },
  
  payee_change_count: {
    type: 'number',
    min: 0,
    max: 50,
    description: 'Number of times payee was changed'
  },
  
  intent_change_count: {
    type: 'number',
    min: 0,
    max: 20,
    description: 'Number of times intent selection was changed'
  },
  
  edit_cycle_count: {
    type: 'number',
    min: 0,
    max: 50,
    description: 'Number of back-to-edit actions'
  },
  
  // Time signals (milliseconds)
  confirmation_delay_ms: {
    type: 'number',
    min: 0,
    max: 600000,  // 10 minutes
    description: 'Time from submission to confirmation'
  },
  
  total_interaction_time_ms: {
    type: 'number',
    min: 0,
    max: 600000,  // 10 minutes
    description: 'Total time from start to completion'
  },
  
  // Hesitation score (0-1 float)
  hesitation_score: {
    type: 'number',
    min: 0,
    max: 1,
    description: 'Composite hesitation score (0=low, 1=high)'
  },
  
  // Hesitation breakdown (optional)
  hesitation_components: {
    type: 'object',
    properties: {
      edit_count: { type: 'number', min: 0, max: 100 },
      delay_seconds: { type: 'number', min: 0, max: 600 },
      review_cycles: { type: 'number', min: 0, max: 50 }
    },
    description: 'Breakdown of hesitation score components'
  },
  
  // Warning signals
  warning_shown_count: {
    type: 'number',
    min: 0,
    max: 20,
    description: 'Number of warnings shown to user'
  },
  
  warning_ignored_count: {
    type: 'number',
    min: 0,
    max: 20,
    description: 'Number of warnings user ignored'
  },
  
  // Device context
  device_id: {
    type: 'string',
    minLength: 1,
    maxLength: 255,
    description: 'Device identifier from frontend'
  }
};
```

### 2.2 Validation Function

```javascript
export const validateSignalValues = (signals) => {
  const errors = [];

  if (!signals || typeof signals !== 'object') {
    return [{
      code: 'INVALID_SIGNALS_OBJECT',
      message: 'signals must be an object'
    }];
  }

  // Check each signal against rules
  for (const [key, value] of Object.entries(signals)) {
    const rule = ALLOWED_SIGNAL_TYPES[key];

    if (!rule) {
      errors.push({
        code: 'UNKNOWN_SIGNAL_TYPE',
        message: `Unknown signal type: ${key}`
      });
      continue;
    }

    // Validate type
    if (typeof value !== rule.type) {
      errors.push({
        code: 'INVALID_SIGNAL_TYPE',
        message: `Signal ${key} must be ${rule.type}, got ${typeof value}`
      });
      continue;
    }

    // Validate range (for numbers)
    if (rule.type === 'number') {
      if (value < rule.min || value > rule.max) {
        errors.push({
          code: 'SIGNAL_OUT_OF_RANGE',
          message: `Signal ${key} out of range [${rule.min}, ${rule.max}], got ${value}`
        });
      }
    }

    // Validate length (for strings)
    if (rule.type === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          code: 'SIGNAL_TOO_SHORT',
          message: `Signal ${key} too short (min ${rule.minLength})`
        });
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          code: 'SIGNAL_TOO_LONG',
          message: `Signal ${key} too long (max ${rule.maxLength})`
        });
      }
    }

    // Validate nested objects
    if (rule.type === 'object' && rule.properties) {
      for (const [propKey, propValue] of Object.entries(value)) {
        const propRule = rule.properties[propKey];
        if (propRule && typeof propValue !== propRule.type) {
          errors.push({
            code: 'INVALID_OBJECT_PROPERTY_TYPE',
            message: `Signal ${key}.${propKey} must be ${propRule.type}`
          });
        }
      }
    }
  }

  return errors;
};
```

---

## 3. Event Array Validation

### 3.1 Event Structure

```javascript
// Each event in the events array must have:
{
  event_type: string,           // One of: amount_changed, payee_selected, etc.
  timestamp: number,            // Unix timestamp
  data: object                  // Event-specific data
}
```

### 3.2 Event Types

```javascript
const ALLOWED_EVENT_TYPES = {
  // Amount events
  amount_focused: {
    data: { timestamp: 'number' }
  },
  amount_changed: {
    data: {
      new_amount: 'number',
      previous_amount: 'number',
      timestamp: 'number'
    },
    constraints: {
      new_amount_min: 0,
      new_amount_max: 10000000,
      previous_amount_min: 0,
      previous_amount_max: 10000000
    }
  },
  amount_blurred: {
    data: { timestamp: 'number' }
  },

  // Payee events
  payee_search_started: {
    data: { timestamp: 'number' }
  },
  payee_selected: {
    data: {
      payee_id: 'string',
      payee_name: 'string',
      search_duration_ms: 'number'
    },
    constraints: {
      payee_id_maxLength: 255,
      payee_name_maxLength: 255,
      search_duration_ms_max: 600000
    }
  },
  payee_changed: {
    data: {
      old_payee_id: 'string',
      new_payee_id: 'string'
    }
  },

  // Intent events
  intent_selected: {
    data: {
      intent: 'string',
      previous_intent: ['string', 'null']
    }
  },

  // Review events
  review_started: {
    data: { timestamp: 'number' }
  },
  back_to_edit: {
    data: {
      field: 'string',
      edit_cycle_count: 'number'
    }
  },

  // Warning events
  warning_displayed: {
    data: { warning_code: 'string' }
  },
  warning_response: {
    data: {
      warning_code: 'string',
      response: ['string'],  // One of: confirmed, cancelled, ignored
      response_time_ms: 'number'
    }
  },

  // Confirmation events
  submission_marked: {
    data: {
      total_interaction_time_ms: 'number'
    }
  },
  confirmation_clicked: {
    data: {
      confirmation_delay_ms: 'number',
      timestamp: 'number'
    }
  }
};
```

### 3.3 Event Validation

```javascript
export const validateEventArray = (events, transactionTimestamp) => {
  const errors = [];

  if (!Array.isArray(events)) {
    return [{
      code: 'INVALID_EVENTS_ARRAY',
      message: 'events must be an array'
    }];
  }

  if (events.length > 100) {
    errors.push({
      code: 'TOO_MANY_EVENTS',
      message: `Too many events (max 100), got ${events.length}`
    });
  }

  // Validate each event
  events.forEach((event, index) => {
    // Check required fields
    if (!event.event_type || typeof event.event_type !== 'string') {
      errors.push({
        code: 'MISSING_EVENT_TYPE',
        message: `Event ${index} missing or invalid event_type`
      });
      return;
    }

    if (typeof event.timestamp !== 'number') {
      errors.push({
        code: 'INVALID_EVENT_TIMESTAMP',
        message: `Event ${index} invalid timestamp`
      });
      return;
    }

    // Check event type is allowed
    if (!ALLOWED_EVENT_TYPES[event.event_type]) {
      errors.push({
        code: 'UNKNOWN_EVENT_TYPE',
        message: `Event ${index} unknown event_type: ${event.event_type}`
      });
      return;
    }

    // Check timestamp is not before transaction start
    if (event.timestamp < transactionTimestamp - 5000) {  // 5s grace
      errors.push({
        code: 'EVENT_TIMESTAMP_BEFORE_TRANSACTION',
        message: `Event ${index} timestamp before transaction start`
      });
    }

    // Check event data matches expected schema
    const eventSchema = ALLOWED_EVENT_TYPES[event.event_type];
    if (eventSchema.data) {
      for (const [key, expectedType] of Object.entries(eventSchema.data)) {
        const actualType = typeof event.data?.[key];
        const expectedTypes = Array.isArray(expectedType) ? expectedType : [expectedType];
        
        if (!expectedTypes.includes(actualType) && actualType !== 'undefined') {
          errors.push({
            code: 'INVALID_EVENT_DATA_TYPE',
            message: `Event ${index} field ${key} expected ${expectedTypes.join('|')}, got ${actualType}`
          });
        }
      }
    }

    // Validate constraints
    if (eventSchema.constraints) {
      const constraints = eventSchema.constraints;
      for (const [key, limit] of Object.entries(constraints)) {
        const fieldName = key.replace(/_\w+$/, '');
        const fieldValue = event.data?.[fieldName];
        
        if (typeof fieldValue === 'number') {
          if (key.endsWith('_min') && fieldValue < limit) {
            errors.push({
              code: 'EVENT_FIELD_OUT_OF_RANGE',
              message: `Event ${index} field ${fieldName} too small (min ${limit})`
            });
          }
          if (key.endsWith('_max') && fieldValue > limit) {
            errors.push({
              code: 'EVENT_FIELD_OUT_OF_RANGE',
              message: `Event ${index} field ${fieldName} too large (max ${limit})`
            });
          }
        }
      }
    }
  });

  return errors;
};
```

---

## 4. Cross-Field Validation

### 4.1 Consistency Rules

```javascript
export const validateSignalConsistency = (signals, events) => {
  const errors = [];

  // Rule 1: amount_edit_count should match number of amount_changed events
  if (events) {
    const amountChangedCount = events.filter(
      e => e.event_type === 'amount_changed'
    ).length;
    
    if (signals.amount_edit_count !== amountChangedCount) {
      errors.push({
        code: 'INCONSISTENT_AMOUNT_EDIT_COUNT',
        message: `amount_edit_count (${signals.amount_edit_count}) doesn't match events (${amountChangedCount})`
      });
    }
  }

  // Rule 2: confirmation_delay_ms should not exceed total_interaction_time_ms
  if (signals.confirmation_delay_ms && signals.total_interaction_time_ms) {
    if (signals.confirmation_delay_ms > signals.total_interaction_time_ms) {
      errors.push({
        code: 'IMPOSSIBLE_TIMING',
        message: 'confirmation_delay_ms cannot exceed total_interaction_time_ms'
      });
    }
  }

  // Rule 3: hesitation_score should be 0 if no hesitation signals
  if (
    signals.amount_edit_count === 0 &&
    signals.edit_cycle_count === 0 &&
    signals.confirmation_delay_ms === 0 &&
    signals.hesitation_score > 0.1
  ) {
    errors.push({
      code: 'INVALID_HESITATION_SCORE',
      message: 'hesitation_score should be near 0 with no hesitation indicators'
    });
  }

  // Rule 4: warning_ignored_count should not exceed warning_shown_count
  if (signals.warning_ignored_count > signals.warning_shown_count) {
    errors.push({
      code: 'IMPOSSIBLE_WARNING_STATE',
      message: 'warning_ignored_count cannot exceed warning_shown_count'
    });
  }

  return errors;
};
```

---

## 5. Response Codes

### 5.1 Success Response

```javascript
{
  success: true,
  transaction_id: "txn_1707238200000_abc123",
  signals_received: 12,
  events_received: 8,
  stored_at: "2024-02-07T10:30:25.000Z",
  processing_time_ms: 145
}
```

### 5.2 Error Response

```javascript
{
  success: false,
  transaction_id: "txn_1707238200000_abc123",
  errors: [
    {
      code: "INVALID_TRANSACTION_ID",
      message: "transaction_id must be non-empty string"
    },
    {
      code: "SIGNAL_OUT_OF_RANGE",
      message: "Signal amount_edit_count out of range [0, 100], got 250"
    }
  ],
  received_at: "2024-02-07T10:30:25.000Z"
}
```

### 5.3 HTTP Status Codes

| Status | Scenario |
|--------|----------|
| `200` | All validations passed, signals stored |
| `400` | Request validation failed (invalid JSON, missing fields) |
| `422` | Signal validation failed (out of range, invalid values) |
| `409` | Conflict (duplicate transaction_id in same session) |
| `429` | Rate limited (too many signals too fast) |
| `500` | Server error during storage |

---

## 6. Rate Limiting

### 6.1 Limits

```javascript
const RATE_LIMITS = {
  // Per user per hour
  signals_per_hour: 1000,
  
  // Per transaction
  signals_per_transaction: 10,  // Max 10 signal submissions per txn
  events_per_signals: 100,       // Max 100 events per submission
  
  // Per minute (abuse detection)
  signals_per_minute: 100,
  
  // Submission frequency
  min_time_between_signals_ms: 1000,  // Min 1 second between submissions
};

export const checkRateLimit = async (userId, transactionId) => {
  // Check user hourly limit
  const hourlyCount = await redis.incr(
    `signals:user:${userId}:hourly`,
    'EX', 3600
  );
  if (hourlyCount > RATE_LIMITS.signals_per_hour) {
    throw {
      code: 'RATE_LIMIT_EXCEEDED_HOURLY',
      message: 'Too many signal submissions this hour'
    };
  }

  // Check per-transaction limit
  const txnCount = await redis.incr(
    `signals:txn:${transactionId}:count`
  );
  if (txnCount > RATE_LIMITS.signals_per_transaction) {
    throw {
      code: 'RATE_LIMIT_EXCEEDED_TRANSACTION',
      message: 'Too many signal submissions for this transaction'
    };
  }

  // Check minimum time between submissions
  const lastSubmission = await redis.get(
    `signals:txn:${transactionId}:last`
  );
  if (lastSubmission) {
    const timeSince = Date.now() - parseInt(lastSubmission);
    if (timeSince < RATE_LIMITS.min_time_between_signals_ms) {
      throw {
        code: 'SUBMISSION_TOO_FREQUENT',
        message: `Wait ${RATE_LIMITS.min_time_between_signals_ms}ms between submissions`
      };
    }
  }

  // Update last submission time
  await redis.set(
    `signals:txn:${transactionId}:last`,
    Date.now().toString(),
    'EX', 3600
  );
};
```

---

## 7. Injection Prevention

### 7.1 What We Prevent

```javascript
// ❌ Injection: Fake signals that don't match events
{
  events: [
    { event_type: "amount_changed", data: { new_amount: 5000 } }
  ],
  signals: {
    amount_edit_count: 100  // ← Doesn't match 1 actual change
  }
}

// ❌ Injection: Negative values
{
  signals: {
    edit_cycle_count: -5  // Should be 0-50
  }
}

// ❌ Injection: Impossible timing
{
  total_interaction_time_ms: 5000,
  confirmation_delay_ms: 10000  // Delay > total time!
}

// ❌ Injection: Future timestamps
{
  timestamp: Date.now() + 3600000  // 1 hour in future
}
```

### 7.2 Injection Detection

```javascript
export const detectInjectionAttempts = (signals, events) => {
  const injections = [];

  // Check for impossible ranges
  if (signals.amount_edit_count < 0 || signals.amount_edit_count > 100) {
    injections.push({
      type: 'RANGE_VIOLATION',
      field: 'amount_edit_count',
      value: signals.amount_edit_count
    });
  }

  // Check for inconsistencies
  if (events && signals.amount_edit_count !== events.filter(e => e.event_type === 'amount_changed').length) {
    injections.push({
      type: 'CONSISTENCY_MISMATCH',
      field: 'amount_edit_count',
      expected: events.filter(e => e.event_type === 'amount_changed').length,
      received: signals.amount_edit_count
    });
  }

  // Check for impossible timings
  if (signals.confirmation_delay_ms > signals.total_interaction_time_ms) {
    injections.push({
      type: 'IMPOSSIBLE_TIMING',
      field: 'confirmation_delay_ms',
      message: 'delay > total time'
    });
  }

  // Log injection attempts
  if (injections.length > 0) {
    logger.warn('Possible injection attempt detected', {
      injections,
      userId: signals.user_id,
      transactionId: signals.transaction_id
    });
  }

  return injections;
};
```

---

## 8. Implementation Checklist

### Backend Route Handler
- [ ] Add `validateBehavioralSignals` middleware
- [ ] Validate all signal values with `validateSignalValues()`
- [ ] Validate event array with `validateEventArray()` if provided
- [ ] Check cross-field consistency with `validateSignalConsistency()`
- [ ] Check rate limits with `checkRateLimit()`
- [ ] Detect injection attempts with `detectInjectionAttempts()`
- [ ] Return appropriate HTTP status and error codes
- [ ] Store valid signals in transaction record
- [ ] Log all validation failures

### Frontend
- [ ] Validate values before calling capture methods
- [ ] Use try-catch around all signal operations
- [ ] Retry failed submissions with exponential backoff
- [ ] Handle 400/422 error responses gracefully
- [ ] Don't block transaction on signal errors

---

## Summary

| Aspect | Details |
|--------|---------|
| **Request Validation** | Required fields, timestamp freshness |
| **Signal Values** | Type checking, range validation (0-100, 0-1, etc.) |
| **Event Validation** | Known event types, valid data, constraints |
| **Consistency** | Event counts match signal counts, timing makes sense |
| **Rate Limiting** | 1000/hour per user, 10/transaction, 1s min between |
| **Injection Prevention** | Range checks, consistency checks, impossible timing detection |
| **Error Response** | 400/422 with detailed error codes and messages |
| **Success Response** | 200 with received/stored counts |

All validation happens **server-side**. Frontend suggestions are not trusted - all values are verified.
