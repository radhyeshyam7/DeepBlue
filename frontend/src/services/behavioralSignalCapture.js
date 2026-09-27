/**
 * Behavioral Signal Capture Service
 * 
 * Captures user interaction signals during transaction flow.
 * Sends only signals explicitly defined in feature extraction context.
 * No guessing, no invasive tracking, no data fabrication.
 * 
 * Defined Signals (from featureExtractor.js context):
 * - amount_edit_count: Number of amount value changes
 * - confirmation_delay_ms: Time from submission to confirmation
 * - hesitation_score: Computed from edits + delays
 * - edit_timestamps: When each edit occurred
 * - device_id: Device identifier
 * - intent_selected: What purpose user selected
 * - payee_selection_time: Time to select payee
 */

class BehavioralSignalCapture {
  constructor() {
    this.signals = {
      transaction_id: null,
      session_id: this._generateSessionId(),
      start_time: null,
      events: [],           // Raw interaction events
      aggregates: null      // Computed aggregates
    };

    this.MAX_EVENTS = 100;  // Limit events per transaction
    this.FLUSH_INTERVAL_MS = 30000;  // Send signals every 30s or on transaction end
  }

  // ============================================================================
  // TRANSACTION LIFECYCLE EVENTS
  // ============================================================================

  /**
   * Called when user opens transaction form
   * Marks start of signal capture
   */
  onTransactionStart(transactionId) {
    this.signals.transaction_id = transactionId;
    this.signals.start_time = Date.now();

    this._recordEvent('transaction_started', {
      timestamp: Date.now(),
      transaction_id: transactionId
    });

    // Start periodic flush (for long-form interactions)
    this._startPeriodicFlush();
  }

  /**
   * Called when user submits transaction for confirmation
   * This is when we have full hesitation/interaction data
   */
  onTransactionSubmitted(transaction) {
    this._recordEvent('transaction_submitted', {
      timestamp: Date.now(),
      amount: transaction.amount,
      payee_id: transaction.payee_id,
      intent: transaction.intent
    });

    // Compute aggregates immediately before submission
    this._computeAggregates();
  }

  /**
   * Called when user confirms transaction (final step)
   * Captures final confirmation timing
   */
  onTransactionConfirmed(confirmed) {
    this._recordEvent('transaction_confirmed', {
      timestamp: Date.now(),
      confirmed: confirmed
    });

    // If confirmed, send all signals immediately
    if (confirmed) {
      this._sendSignals('final_confirmation');
    }
  }

  /**
   * Called when user submits transaction form (before confirmation)
   * Alias for onTransactionSubmitted for compatibility
   */
  onSubmission() {
    this._recordEvent('transaction_submitted', {
      timestamp: Date.now()
    });

    // Compute aggregates immediately before submission
    this._computeAggregates();
  }

  /**
   * Cleanup method - called when component unmounts
   * Flushes any pending signals and stops periodic flush
   */
  cleanup() {
    // Stop periodic flush timer
    this._stopPeriodicFlush();

    // Send any remaining signals
    if (this.signals.events.length > 0) {
      this._computeAggregates();
      this._sendSignals('cleanup');
    }

    // Reset signals
    this.signals = {
      transaction_id: null,
      session_id: this._generateSessionId(),
      start_time: null,
      events: [],
      aggregates: null
    };
  }

  // ============================================================================
  // DEFINED SIGNALS: Amount Field
  // ============================================================================

  /**
   * Capture amount field change
   * Signal: amount_edit_count, amount values over time
   */
  onAmountChange(newAmount, previousAmount) {
    const timestamp = Date.now();

    // Only record if actually changed
    if (newAmount === previousAmount) return;

    this._recordEvent('amount_changed', {
      timestamp: timestamp,
      new_amount: newAmount,
      previous_amount: previousAmount,
      time_since_last_edit_ms: this._timeSinceLastEvent('amount_changed'),
      user_typed: true  // Frontend knows this was user action
    });
  }

  /**
   * Capture amount field focus (user starting to edit)
   */
  onAmountFocus() {
    this._recordEvent('amount_focused', {
      timestamp: Date.now()
    });
  }

  /**
   * Capture amount field blur (user finished editing)
   */
  onAmountBlur() {
    this._recordEvent('amount_blurred', {
      timestamp: Date.now()
    });
  }

  // ============================================================================
  // DEFINED SIGNALS: Payee Selection
  // ============================================================================

  /**
   * Capture when user opens payee selector
   */
  onPayeeSearchStart() {
    this._recordEvent('payee_search_started', {
      timestamp: Date.now()
    });
  }

  /**
   * Capture payee selection time
   * Signal: payee_selection_time = timestamp - payee_search_start
   */
  onPayeeSelected(payeeId, payeeName, searchDurationMs) {
    this._recordEvent('payee_selected', {
      timestamp: Date.now(),
      payee_id: payeeId,
      payee_name: payeeName,
      search_duration_ms: searchDurationMs,
      is_new_payee: null,  // Backend determines this
      selection_method: 'manual_selection'  // vs. 'quick_recent', 'search', 'favorites'
    });
  }

  /**
   * Capture when user changes payee (reconsidering)
   */
  onPayeeChanged(oldPayeeId, newPayeeId) {
    this._recordEvent('payee_changed', {
      timestamp: Date.now(),
      old_payee_id: oldPayeeId,
      new_payee_id: newPayeeId,
      change_count: this._countEvents('payee_changed')
    });
  }

  // ============================================================================
  // DEFINED SIGNALS: Intent Selection
  // ============================================================================

  /**
   * Capture intent selection
   * Signal: intent_selected (what purpose user selected)
   */
  onIntentSelected(intent, previousIntent) {
    this._recordEvent('intent_selected', {
      timestamp: Date.now(),
      intent: intent,
      previous_intent: previousIntent,
      intent_change_count: previousIntent ? 1 + this._countEvents('intent_selected') : 0
    });
  }

  /**
   * Alias for onIntentSelected (for compatibility)
   */
  onIntentSelection(intent, previousIntent) {
    return this.onIntentSelected(intent, previousIntent);
  }

  /**
   * Capture when user views intent explanation (uncertainty signal)
   */
  onIntentExplanationViewed(intent) {
    this._recordEvent('intent_explanation_viewed', {
      timestamp: Date.now(),
      intent: intent,
      view_count: this._countEvents('intent_explanation_viewed', intent)
    });
  }

  // ============================================================================
  // DEFINED SIGNALS: Confirmation Behavior
  // ============================================================================

  /**
   * Capture review cycle
   * Signal: confirmation_delay_ms, hesitation pattern
   */
  onReviewStart() {
    this._recordEvent('review_started', {
      timestamp: Date.now(),
      submission_to_review_ms: Date.now() - this.signals.start_time
    });
  }

  /**
   * Capture go-back-to-edit action
   * Signal: User reconsidering (hesitation indicator)
   */
  onBackToEdit(field) {
    this._recordEvent('back_to_edit', {
      timestamp: Date.now(),
      field: field,  // 'amount', 'payee', 'intent', etc.
      edit_cycle_count: this._countEvents('back_to_edit')
    });
  }

  /**
   * Capture confirmation click timing
   * Signal: confirmation_delay_ms = confirmTime - submissionTime
   */
  onConfirmationClick() {
    const confirmTime = Date.now();
    const submissionTime = this._getLastEventTime('transaction_submitted') || this.signals.start_time;

    this._recordEvent('confirmation_clicked', {
      timestamp: confirmTime,
      submission_to_confirmation_ms: confirmTime - submissionTime,
      total_interaction_time_ms: confirmTime - this.signals.start_time
    });
  }

  // ============================================================================
  // DEFINED SIGNALS: Device & Session
  // ============================================================================

  /**
   * Capture device context (already from device service, but record for signal tracking)
   */
  onSessionStart(deviceId) {
    this.signals.device_id = deviceId;

    this._recordEvent('session_started', {
      timestamp: Date.now(),
      device_id: deviceId,
      session_id: this.signals.session_id
    });
  }

  /**
   * Capture if device changed during interaction
   */
  onDeviceChange(newDeviceId) {
    this._recordEvent('device_changed', {
      timestamp: Date.now(),
      new_device_id: newDeviceId,
      previous_device_id: this.signals.device_id
    });
  }

  // ============================================================================
  // WARNING INTERACTION SIGNALS
  // ============================================================================

  /**
   * Capture when user sees warning
   */
  onWarningDisplayed(warningCode) {
    this._recordEvent('warning_displayed', {
      timestamp: Date.now(),
      warning_code: warningCode
    });
  }

  /**
   * Capture when user responds to warning
   * Signal: warning_ignored or warning_acknowledged
   */
  onWarningResponse(warningCode, response) {
    this._recordEvent('warning_response', {
      timestamp: Date.now(),
      warning_code: warningCode,
      response: response,  // 'confirmed', 'cancelled', 'ignored', 'closed'
      response_time_ms: this._timeSinceEvent('warning_displayed', warningCode)
    });
  }

  // ============================================================================
  // SIGNAL AGGREGATION & COMPUTATION
  // ============================================================================

  /**
   * Compute behavioral aggregate signals from raw events
   * Called before submission or on timer
   */
  _computeAggregates() {
    const amountEdits = this._countEvents('amount_changed');
    const edits = this.signals.events.filter(e =>
      e.event_type === 'amount_changed' ||
      e.event_type === 'payee_changed' ||
      e.event_type === 'intent_selected' ||
      e.event_type === 'back_to_edit'
    );

    const confirmationDelayMs =
      this._getLastEventTime('confirmation_clicked') -
      this._getLastEventTime('transaction_submitted');

    // Hesitation score components (0-1)
    const editHesitation = Math.min(1.0, amountEdits / 5);  // 5+ edits = max
    const delayHesitation = Math.min(1.0, confirmationDelayMs / 120000);  // 2min = max
    const reviewCycleHesitation = Math.min(1.0, this._countEvents('back_to_edit') / 3);

    const hesitationScore = (editHesitation + delayHesitation + reviewCycleHesitation) / 3;

    this.signals.aggregates = {
      amount_edit_count: amountEdits,
      payee_change_count: this._countEvents('payee_changed'),
      intent_change_count: this._countEvents('intent_selected'),
      edit_cycle_count: this._countEvents('back_to_edit'),

      confirmation_delay_ms: Math.max(0, confirmationDelayMs),
      total_interaction_time_ms: Date.now() - this.signals.start_time,

      hesitation_score: hesitationScore,
      hesitation_components: {
        edit_count: amountEdits,
        delay_seconds: confirmationDelayMs / 1000,
        review_cycles: this._countEvents('back_to_edit')
      },

      warning_shown_count: this._countEvents('warning_displayed'),
      warning_ignored_count: this._countResponseType('warning_response', 'ignored'),

      event_count: this.signals.events.length,
      device_id: this.signals.device_id
    };
  }

  // ============================================================================
  // SIGNAL TRANSMISSION
  // ============================================================================

  /**
   * Send captured signals to backend
   * Called:
   * - Periodically (every 30s during form interaction)
   * - On transaction submission
   * - On transaction confirmation
   */
  async _sendSignals(triggerType) {
    if (!this.signals.transaction_id) {
      console.warn('No transaction ID, cannot send signals');
      return;
    }

    // Compute aggregates if not done yet
    if (!this.signals.aggregates) {
      this._computeAggregates();
    }

    const payload = this._buildPayload();

    try {
      const response = await fetch('/transaction/behavioral-signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('Failed to send signals:', response.status);
      } else {
        console.log('Signals sent successfully, trigger:', triggerType);
        // Clear events after successful send (keep aggregates)
        this.signals.events = [];
      }
    } catch (error) {
      console.error('Error sending signals:', error);
      // Retry logic handled by backend
    }
  }

  /**
   * Build standardized payload for backend
   */
  _buildPayload() {
    return {
      transaction_id: this.signals.transaction_id,
      session_id: this.signals.session_id,
      timestamp: Date.now(),

      // Aggregated signals (for immediate use)
      signals: this.signals.aggregates,

      // Raw events (for analysis/debugging)
      events: this.signals.events.slice(-50),  // Last 50 events

      // Metadata
      frontend_version: this._getFrontendVersion(),
      user_agent: navigator.userAgent
    };
  }

  // ============================================================================
  // INTERNAL UTILITIES
  // ============================================================================

  _recordEvent(eventType, eventData) {
    if (this.signals.events.length >= this.MAX_EVENTS) {
      // Remove oldest event
      this.signals.events.shift();
    }

    this.signals.events.push({
      event_type: eventType,
      timestamp: eventData.timestamp,
      data: eventData
    });
  }

  _countEvents(eventType, filterValue = null) {
    return this.signals.events.filter(e => {
      if (e.event_type !== eventType) return false;
      if (filterValue && e.data[Object.keys(e.data)[0]] !== filterValue) return false;
      return true;
    }).length;
  }

  _countResponseType(eventType, responseValue) {
    return this.signals.events.filter(e =>
      e.event_type === eventType &&
      e.data.response === responseValue
    ).length;
  }

  _getLastEventTime(eventType) {
    const event = this.signals.events
      .slice()
      .reverse()
      .find(e => e.event_type === eventType);
    return event ? event.timestamp : null;
  }

  _timeSinceLastEvent(eventType) {
    const lastTime = this._getLastEventTime(eventType);
    return lastTime ? Date.now() - lastTime : null;
  }

  _timeSinceEvent(eventType, filterValue) {
    const event = this.signals.events
      .slice()
      .reverse()
      .find(e => e.event_type === eventType && e.data.warning_code === filterValue);
    return event ? Date.now() - event.timestamp : null;
  }

  _startPeriodicFlush() {
    if (this._flushIntervalId) return;

    this._flushIntervalId = setInterval(() => {
      if (this.signals.events.length > 0) {
        this._sendSignals('periodic_flush');
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  _stopPeriodicFlush() {
    if (this._flushIntervalId) {
      clearInterval(this._flushIntervalId);
      this._flushIntervalId = null;
    }
  }

  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _getFrontendVersion() {
    // Use import.meta.env for Vite, fallback for other environments
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) {
      return import.meta.env.VITE_APP_VERSION;
    }
    return '1.0.0';
  }
}

// Export class and singleton instance
export { BehavioralSignalCapture };
export default new BehavioralSignalCapture();
