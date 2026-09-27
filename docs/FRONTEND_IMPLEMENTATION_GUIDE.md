# Frontend Signal Capture Implementation Guide

## Quick Start

### 1. Import the Signal Capture Service

```javascript
// In your TransactionForm component
import { BehavioralSignalCapture } from '../services/behavioralSignalCapture';

const TransactionForm = () => {
  const [signals, setSignals] = useState(null);
  
  // Initialize on mount
  useEffect(() => {
    const signalCapture = new BehavioralSignalCapture(transactionId);
    setSignals(signalCapture);
    return () => signalCapture.cleanup();
  }, [transactionId]);
  
  return (
    // Form JSX below
  );
};
```

---

## Step-by-Step Integration

### Step 1: Capture Amount Changes

```javascript
const handleAmountChange = (e) => {
  const newAmount = parseFloat(e.target.value);
  const previousAmount = formData.amount;
  
  // CAPTURE: Amount edit
  if (signals && newAmount !== previousAmount) {
    signals.captureAmountChange(previousAmount, newAmount);
  }
  
  // Update form
  setFormData(prev => ({ ...prev, amount: newAmount }));
};

// In JSX
<input
  type="number"
  value={formData.amount}
  onChange={handleAmountChange}
  placeholder="Enter amount"
/>
```

**What Gets Captured:**
```
Event: amount_changed
Data: {
  new_amount: 7000,
  previous_amount: 5000,
  timestamp: 1707238208000
}

Backend Impact:
→ Increments amount_edit_count (signals.amount_edit_count++)
→ Used for hesitation scoring
```

---

### Step 2: Capture Payee Selection

```javascript
const handlePayeeSelected = (payee, searchDuration) => {
  // searchDuration comes from timing the search
  
  // CAPTURE: Payee selected
  if (signals) {
    signals.capturePayeeSearch(
      formData.payee?.id,  // previous payee
      payee.id,
      searchDuration
    );
  }
  
  // Update form
  setFormData(prev => ({ ...prev, payee }));
};

// For search timing
const [searchStart, setSearchStart] = useState(null);

const handlePayeeSearchOpen = () => {
  setSearchStart(Date.now());
};

const handlePayeeSearchClose = (selectedPayee) => {
  const duration = searchStart ? Date.now() - searchStart : 0;
  handlePayeeSelected(selectedPayee, duration);
  setSearchStart(null);
};
```

**What Gets Captured:**
```
Event: payee_search_completed
Data: {
  old_payee_id: "p1",
  new_payee_id: "p2",
  search_duration_ms: 3000,
  timestamp: 1707238210000
}

Backend Impact:
→ Increments payee_change_count if payee was changed
→ Records selection time for "fast/slow decision" heuristic
```

---

### Step 3: Capture Intent Selection

```javascript
const handleIntentSelected = (intent) => {
  // CAPTURE: Intent selection
  if (signals) {
    const previousIntent = formData.intent || null;
    signals.captureIntentSelection(intent, previousIntent);
  }
  
  // Update form
  setFormData(prev => ({ ...prev, intent }));
};

// In JSX
<select onChange={(e) => handleIntentSelected(e.target.value)}>
  <option value="">Select reason...</option>
  <option value="refund">Refund</option>
  <option value="bills">Bills & Utilities</option>
  <option value="personal">Personal Transfer</option>
  <option value="business">Business Payment</option>
</select>
```

**What Gets Captured:**
```
Event: intent_selected
Data: {
  selected_intent: "refund",
  previous_intent: "",
  timestamp: 1707238212000
}

Backend Impact:
→ Increments intent_change_count if intent was changed
→ Checks for intent_mismatch with previous history
```

---

### Step 4: Capture Back-to-Edit Actions

```javascript
const handleEditField = (fieldName) => {
  // CAPTURE: User going back to edit (hesitation signal)
  if (signals) {
    signals.captureEditCycle(fieldName);
  }
  
  // Scroll to field
  document.getElementById(`field-${fieldName}`).focus();
};

// In JSX
<button onClick={() => handleEditField('amount')}>
  Edit Amount
</button>
```

**What Gets Captured:**
```
Event: edit_cycle_started
Data: {
  field: "amount",
  cycle_number: 1,
  timestamp: 1707238220000
}

Backend Impact:
→ Increments edit_cycle_count
→ Major component of hesitation_score
→ High cycle count = potential scam behavior
```

---

### Step 5: Capture Confirmation Timing

```javascript
const handleSubmitTransaction = async (e) => {
  e.preventDefault();
  
  // CAPTURE: Transaction submitted (for timing)
  if (signals) {
    const submissionTiming = signals.captureSubmission();
    console.log(`Total interaction time: ${submissionTiming.total_ms}ms`);
  }
  
  // Send to backend
  try {
    const response = await submitTransaction(formData);
    
    // After successful submission, before confirmation screen
    if (signals) {
      // Signals will now calculate confirmation_delay_ms from this point
      signals.markSubmissionPoint();
    }
    
    // Show review screen
    setShowReview(true);
  } catch (error) {
    console.error('Submission failed:', error);
  }
};

// In JSX
<button onClick={handleSubmitTransaction} type="submit">
  Review Transaction
</button>
```

**What Gets Captured:**
```
Event 1: submission_marked
Data: {
  total_interaction_time_ms: 30000,
  timestamp: 1707238218000
}

Event 2 (later on confirm): confirmation_clicked
Data: {
  confirmation_delay_ms: 5000,
  timestamp: 1707238223000
}

Backend Impact:
→ confirmation_delay_ms = time user took to review
→ total_interaction_time_ms = entire transaction time
→ Both used in hesitation scoring
```

---

### Step 6: Capture Confirmation Click

```javascript
const handleConfirmTransaction = async () => {
  // CAPTURE: User confirmed (timing + finalization)
  if (signals) {
    await signals.captureConfirmation();
    // This computes hesitation_score and final aggregates
  }
  
  // Send final transaction
  const result = await confirmTransaction(formData);
  
  // Show success
  setTransactionComplete(true);
};

// In JSX
<button onClick={handleConfirmTransaction} className="primary">
  Confirm & Send
</button>
```

**What Gets Captured:**
```
Event: confirmation_clicked
Data: {
  confirmation_delay_ms: 5000,
  hesitation_score: 0.35,
  hesitation_breakdown: {
    edit_count: 2,
    delay_seconds: 5,
    review_cycles: 1
  },
  timestamp: 1707238223000
}

Backend Impact:
→ Final hesitation_score computed
→ All signals prepared for backend
→ Ready for transmission
```

---

### Step 7: Send Signals to Backend

```javascript
const handleTransactionComplete = async () => {
  if (signals) {
    try {
      // Signals service batches and sends automatically
      // But you can force flush if needed
      const result = await signals.flushSignals();
      
      if (result.success) {
        console.log(`Sent ${result.eventsCount} behavioral signals`);
      } else {
        console.warn('Failed to send signals:', result.error);
        // Don't block transaction - signals are optional
      }
    } catch (error) {
      console.error('Signal transmission error:', error);
      // Continue anyway - not critical
    }
  }
};
```

**Backend Receives:**
```
POST /api/transaction/behavioral-signals

{
  transaction_id: "txn_1707238200000_abc123",
  timestamp: 1707238225000,
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
  events: [ /* all 8 events */ ]
}
```

---

## Complete Component Example

```javascript
import React, { useState, useEffect } from 'react';
import { BehavioralSignalCapture } from '../services/behavioralSignalCapture';

const TransactionForm = ({ transactionId, onComplete }) => {
  const [formData, setFormData] = useState({
    amount: '',
    payee: null,
    intent: ''
  });
  const [signals, setSignals] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [payeeSearchActive, setPayeeSearchActive] = useState(false);
  const [searchStart, setSearchStart] = useState(null);

  // Initialize signal capture
  useEffect(() => {
    const signalCapture = new BehavioralSignalCapture(transactionId);
    setSignals(signalCapture);
    
    return () => signalCapture.cleanup();
  }, [transactionId]);

  // Amount field
  const handleAmountChange = (e) => {
    const newAmount = parseFloat(e.target.value) || 0;
    if (signals && newAmount !== formData.amount) {
      signals.captureAmountChange(formData.amount, newAmount);
    }
    setFormData(prev => ({ ...prev, amount: newAmount }));
  };

  // Payee selection
  const handlePayeeSearchOpen = () => {
    setPayeeSearchActive(true);
    setSearchStart(Date.now());
  };

  const handlePayeeSelected = (payee) => {
    const duration = searchStart ? Date.now() - searchStart : 0;
    if (signals) {
      signals.capturePayeeSearch(
        formData.payee?.id,
        payee.id,
        duration
      );
    }
    setFormData(prev => ({ ...prev, payee }));
    setPayeeSearchActive(false);
    setSearchStart(null);
  };

  // Intent selection
  const handleIntentSelected = (intent) => {
    if (signals) {
      signals.captureIntentSelection(intent, formData.intent);
    }
    setFormData(prev => ({ ...prev, intent }));
  };

  // Back to edit
  const handleEditAmount = () => {
    if (signals) {
      signals.captureEditCycle('amount');
    }
    setShowReview(false);
  };

  // Submit for review
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (signals) {
      signals.captureSubmission();
    }
    
    setShowReview(true);
  };

  // Final confirmation
  const handleConfirm = async () => {
    if (signals) {
      await signals.captureConfirmation();
      await signals.flushSignals();
    }
    
    onComplete(formData);
  };

  if (showReview) {
    return (
      <div className="review-screen">
        <h2>Review Transaction</h2>
        <p>Amount: ${formData.amount}</p>
        <p>Payee: {formData.payee?.name}</p>
        <p>Purpose: {formData.intent}</p>
        
        <button onClick={handleEditAmount}>← Edit Amount</button>
        <button onClick={handleConfirm} className="primary">
          Confirm & Send
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      <h2>Send Money</h2>

      <div>
        <label>Amount (₹)</label>
        <input
          type="number"
          value={formData.amount}
          onChange={handleAmountChange}
          placeholder="Enter amount"
          required
        />
      </div>

      <div>
        <label>Recipient</label>
        {formData.payee ? (
          <div className="selected-payee">
            <span>{formData.payee.name}</span>
            <button
              type="button"
              onClick={handlePayeeSearchOpen}
            >
              Change
            </button>
          </div>
        ) : (
          <button type="button" onClick={handlePayeeSearchOpen}>
            Select Recipient
          </button>
        )}
        
        {payeeSearchActive && (
          <PayeeSearchModal onSelect={handlePayeeSelected} />
        )}
      </div>

      <div>
        <label>Purpose</label>
        <select
          value={formData.intent}
          onChange={(e) => handleIntentSelected(e.target.value)}
          required
        >
          <option value="">Select reason...</option>
          <option value="refund">Refund</option>
          <option value="bills">Bills & Utilities</option>
          <option value="personal">Personal Transfer</option>
          <option value="business">Business Payment</option>
        </select>
      </div>

      <button type="submit" className="primary">
        Review Transaction
      </button>
    </form>
  );
};

export default TransactionForm;
```

---

## Testing Signal Capture

```javascript
// In your test file
import { BehavioralSignalCapture } from '../services/behavioralSignalCapture';

describe('BehavioralSignalCapture', () => {
  let capture;

  beforeEach(() => {
    capture = new BehavioralSignalCapture('test-txn-123');
  });

  test('captures amount changes', () => {
    capture.captureAmountChange(0, 5000);
    capture.captureAmountChange(5000, 7000);
    
    const signals = capture.getSignals();
    expect(signals.amount_edit_count).toBe(2);
  });

  test('calculates hesitation score', async () => {
    capture.captureAmountChange(0, 5000);
    capture.captureAmountChange(5000, 7000);  // Edit
    capture.captureEditCycle('amount');       // Back-to-edit
    
    await capture.captureConfirmation();
    
    const signals = capture.getSignals();
    expect(signals.hesitation_score).toBeGreaterThan(0);
  });

  test('sends to backend', async () => {
    capture.captureAmountChange(0, 5000);
    const result = await capture.flushSignals();
    
    expect(result.success).toBe(true);
    expect(result.eventsCount).toBe(1);
  });
});
```

---

## Error Handling Best Practices

```javascript
const handleAmountChange = (e) => {
  try {
    const newAmount = parseFloat(e.target.value);
    
    // Validate before capturing
    if (isNaN(newAmount) || newAmount < 0) {
      console.warn('Invalid amount:', e.target.value);
      return;
    }
    
    if (signals) {
      signals.captureAmountChange(formData.amount, newAmount);
    }
    
    setFormData(prev => ({ ...prev, amount: newAmount }));
  } catch (error) {
    console.error('Error capturing amount change:', error);
    // Continue - signal capture shouldn't break transaction
  }
};

const handleConfirm = async () => {
  try {
    // Primary transaction
    const txnResult = await submitTransaction(formData);
    
    // Secondary: send signals (non-blocking)
    if (signals) {
      signals.flushSignals().catch(error => {
        console.warn('Failed to send signals:', error);
        // Log but don't fail transaction
      });
    }
    
    onComplete(txnResult);
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
};
```

---

## Debug Mode

```javascript
// Enable debug logging
const signalCapture = new BehavioralSignalCapture(transactionId, {
  debug: true,  // Log all captures
  logEvents: true,  // Log raw events
  logAggregates: true  // Log computed aggregates
});

// Output:
// [Signal] Amount changed: 0 → 5000
// [Signal] Amount changed: 5000 → 7000
// [Signal] Edit cycle started: amount
// [Signal] Confirmation clicked
// [Signal] Aggregates: amount_edit_count=2, hesitation_score=0.35
```

---

## Summary

| Task | Method | Timing |
|------|--------|--------|
| Capture amount edit | `captureAmountChange()` | On input change |
| Capture payee selection | `capturePayeeSearch()` | When payee picked |
| Capture intent | `captureIntentSelection()` | When intent selected |
| Capture back-to-edit | `captureEditCycle()` | When user edits |
| Capture submission | `captureSubmission()` | When clicking "Review" |
| Capture confirmation | `captureConfirmation()` | When clicking "Confirm" |
| Send to backend | `flushSignals()` | After confirmation |

All signals are optional - if capturing fails, the transaction continues normally.
