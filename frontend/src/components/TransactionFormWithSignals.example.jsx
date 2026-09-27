/**
 * TransactionForm Integration with Behavioral Signal Capture
 * 
 * Example showing how to use the BehavioralSignalCapture service
 * in a React transaction form component
 * 
 * This integrates signal capture throughout the transaction flow:
 * 1. Form opens → onTransactionStart
 * 2. User interacts → onAmountChange, onPayeeSelected, etc.
 * 3. User submits → onTransactionSubmitted
 * 4. User confirms → onTransactionConfirmed
 */

import React, { useState, useEffect } from 'react';
import behavioralSignalCapture from '../services/behavioralSignalCapture';
import { deviceService } from '../services/deviceService';

const TransactionForm = () => {
  const [transactionId] = useState(() => generateTransactionId());
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState(null);
  const [intent, setIntent] = useState('');
  const [isPayeeSearching, setIsPayeeSearching] = useState(false);
  const [payeeSearchStartTime, setPayeeSearchStartTime] = useState(null);
  
  // Initialize signal capture when component mounts
  useEffect(() => {
    const deviceId = deviceService.getDeviceId();
    behavioralSignalCapture.onSessionStart(deviceId);
    behavioralSignalCapture.onTransactionStart(transactionId);
    
    return () => {
      // Cleanup on unmount
    };
  }, [transactionId]);
  
  // ============================================================================
  // AMOUNT FIELD SIGNALS
  // ============================================================================
  
  const handleAmountFocus = () => {
    behavioralSignalCapture.onAmountFocus();
  };
  
  const handleAmountChange = (e) => {
    const newAmount = e.target.value;
    const previousAmount = amount;
    
    setAmount(newAmount);
    
    // Send signal to behavioral capture
    // Only send if value actually changed (not just intermediate state)
    if (newAmount !== previousAmount) {
      behavioralSignalCapture.onAmountChange(
        parseFloat(newAmount) || 0,
        parseFloat(previousAmount) || 0
      );
    }
  };
  
  const handleAmountBlur = () => {
    behavioralSignalCapture.onAmountBlur();
  };
  
  // ============================================================================
  // PAYEE SELECTION SIGNALS
  // ============================================================================
  
  const handlePayeeSearchOpen = () => {
    setIsPayeeSearching(true);
    setPayeeSearchStartTime(Date.now());
    behavioralSignalCapture.onPayeeSearchStart();
  };
  
  const handlePayeeSelect = (selectedPayee) => {
    // Calculate time spent searching
    const searchDuration = Date.now() - payeeSearchStartTime;
    
    // Record signal with exact payee details
    behavioralSignalCapture.onPayeeSelected(
      selectedPayee.id,           // Exact payee ID
      selectedPayee.name,         // Exact payee name
      searchDuration              // Time spent searching
    );
    
    // Update local state
    const oldPayeeId = payee ? payee.id : null;
    if (oldPayeeId && oldPayeeId !== selectedPayee.id) {
      behavioralSignalCapture.onPayeeChanged(oldPayeeId, selectedPayee.id);
    }
    
    setPayee(selectedPayee);
    setIsPayeeSearching(false);
  };
  
  // ============================================================================
  // INTENT SELECTION SIGNALS
  // ============================================================================
  
  const handleIntentSelect = (newIntent) => {
    const previousIntent = intent;
    
    setIntent(newIntent);
    
    // Record signal with exact intent values
    behavioralSignalCapture.onIntentSelected(
      newIntent,        // Exact intent selected
      previousIntent    // What it was before
    );
  };
  
  const handleIntentExplanationClick = (selectedIntent) => {
    // User is viewing explanation = uncertainty signal
    behavioralSignalCapture.onIntentExplanationViewed(selectedIntent);
  };
  
  // ============================================================================
  // FORM REVIEW & CONFIRMATION SIGNALS
  // ============================================================================
  
  const handleReviewClick = () => {
    // User is reviewing before submitting
    behavioralSignalCapture.onReviewStart();
  };
  
  const handleBackToEditClick = (field) => {
    // User going back to edit something = hesitation signal
    behavioralSignalCapture.onBackToEdit(field);
  };
  
  // ============================================================================
  // SUBMISSION & CONFIRMATION
  // ============================================================================
  
  const handleSubmitTransaction = async () => {
    // Record that form was submitted
    behavioralSignalCapture.onTransactionSubmitted({
      amount: parseFloat(amount),
      payee_id: payee ? payee.id : null,
      intent: intent
    });
    
    // Now show review/confirmation screen
    // (Implementation depends on your flow)
  };
  
  const handleConfirmTransaction = async () => {
    // Record confirmation click (exact timing from submission)
    behavioralSignalCapture.onConfirmationClick();
    
    try {
      // Send actual transaction to backend
      const response = await fetch('/api/transaction/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId,
          amount: parseFloat(amount),
          payee_id: payee.id,
          intent: intent
        })
      });
      
      // Whether success or not, record the confirmation
      behavioralSignalCapture.onTransactionConfirmed(response.ok);
      
    } catch (error) {
      behavioralSignalCapture.onTransactionConfirmed(false);
      console.error('Transaction error:', error);
    }
  };
  
  const handleCancelTransaction = () => {
    // Record cancellation (confirms false)
    behavioralSignalCapture.onTransactionConfirmed(false);
  };
  
  // ============================================================================
  // WARNING HANDLING SIGNALS
  // ============================================================================
  
  const handleWarningDisplay = (warningCode) => {
    behavioralSignalCapture.onWarningDisplayed(warningCode);
  };
  
  const handleWarningResponse = (warningCode, response) => {
    // 'response' can be: 'confirmed', 'cancelled', 'ignored', 'closed'
    behavioralSignalCapture.onWarningResponse(warningCode, response);
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="transaction-form">
      
      {/* AMOUNT FIELD */}
      <div className="form-group">
        <label>Amount</label>
        <input
          type="number"
          value={amount}
          onChange={handleAmountChange}
          onFocus={handleAmountFocus}
          onBlur={handleAmountBlur}
          placeholder="Enter amount"
        />
      </div>
      
      {/* PAYEE FIELD */}
      <div className="form-group">
        <label>Pay to</label>
        <button onClick={handlePayeeSearchOpen}>
          {payee ? payee.name : 'Select payee'}
        </button>
        {isPayeeSearching && (
          <PayeeSelector
            onSelect={handlePayeeSelect}
            onCancel={() => setIsPayeeSearching(false)}
          />
        )}
      </div>
      
      {/* INTENT FIELD */}
      <div className="form-group">
        <label>What for?</label>
        <select value={intent} onChange={(e) => handleIntentSelect(e.target.value)}>
          <option value="">Select reason</option>
          <option value="bills">Bills & utilities</option>
          <option value="salary">Salary</option>
          <option value="rent">Rent</option>
          <option value="loan">Loan repayment</option>
          <option value="refund">Refund</option>
          <option value="emergency">Emergency</option>
          <option value="other">Other</option>
        </select>
        <button 
          className="info-btn"
          onClick={() => handleIntentExplanationClick(intent)}
        >
          Why?
        </button>
      </div>
      
      {/* REVIEW BUTTON */}
      <button
        className="btn-review"
        onClick={handleReviewClick}
        disabled={!amount || !payee || !intent}
      >
        Review
      </button>
      
      {/* REVIEW SCREEN (conditional) */}
      {/* When user clicks Review, show confirmation screen... */}
      
    </div>
  );
};

/**
 * Example: How signals integrate into feature extraction
 * 
 * When transaction arrives at backend:
 * 1. featureExtractor.js reads stored behavioral_signals
 * 2. Extracts: amount_edit_count, confirmation_delay_ms, hesitation_score
 * 3. These become features in the feature vector
 * 4. Risk engine uses them to compute risk scores
 * 
 * Example feature extraction:
 * {
 *   hesitation: {
 *     edit_count: signals.amount_edit_count,
 *     excessive_edits: signals.amount_edit_count > 2,
 *     delay_ms: signals.confirmation_delay_ms,
 *     unusual_hesitation: signals.hesitation_score > 0.5,
 *     score: signals.hesitation_score
 *   }
 * }
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateTransactionId() {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const PayeeSelector = ({ onSelect, onCancel }) => {
  // Simple payee selector component
  const [recentPayees] = useState([
    { id: 'payee_1', name: 'John Smith' },
    { id: 'payee_2', name: 'Jane Doe' }
  ]);
  
  return (
    <div className="payee-selector">
      {recentPayees.map(p => (
        <div key={p.id} onClick={() => onSelect(p)}>
          {p.name}
        </div>
      ))}
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default TransactionForm;
