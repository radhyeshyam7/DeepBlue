/**
 * Behavioral Signals Route Handler
 * 
 * Receives behavioral signals captured from frontend
 * Stores signals in transaction context for feature extraction
 * Validates that signals are within expected ranges
 */

const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { updateBehavioralProfile } = require('../services/behavioralProfile');

/**
 * POST /transaction/behavioral-signals
 * 
 * Receives raw behavioral signals from frontend
 * 
 * Payload Structure:
 * {
 *   transaction_id: string,
 *   session_id: string,
 *   timestamp: number,
 *   signals: {
 *     amount_edit_count: number,
 *     payee_change_count: number,
 *     intent_change_count: number,
 *     edit_cycle_count: number,
 *     confirmation_delay_ms: number,
 *     total_interaction_time_ms: number,
 *     hesitation_score: number (0-1),
 *     warning_shown_count: number,
 *     warning_ignored_count: number,
 *     device_id: string
 *   },
 *   events: [
 *     { event_type: string, timestamp: number, data: object },
 *     ...
 *   ],
 *   frontend_version: string,
 *   user_agent: string
 * }
 */
router.post('/behavioral-signals', async (req, res) => {
  try {
    const { transaction_id, session_id, timestamp, signals, events, frontend_version, user_agent } = req.body;
    
    // Validation
    if (!transaction_id) {
      return res.status(400).json({ error: 'Missing transaction_id' });
    }
    
    if (!signals || typeof signals !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid signals' });
    }
    
    // Validate signal values are within expected ranges
    const validation = validateSignals(signals);
    if (!validation.valid) {
      return res.status(400).json({ error: `Invalid signal: ${validation.error}` });
    }
    
    // Find or create transaction record
    let transaction = await Transaction.findOne({ transaction_id });
    if (!transaction) {
      return res.status(404).json({ error: `Transaction ${transaction_id} not found` });
    }
    
    // Store behavioral signals in transaction
    transaction.behavioral_signals = {
      session_id: session_id,
      received_at: new Date(),
      signals: signals,
      events_count: events ? events.length : 0,
      frontend_version: frontend_version,
      user_agent: user_agent
    };
    
    // Store raw events for analysis (last 50)
    if (events && Array.isArray(events)) {
      transaction.behavioral_events = events.slice(-50);
    }
    
    // Store timestamp this was received
    transaction.behavioral_signals_received_timestamp = timestamp;
    
    await transaction.save();
    
    // Update user behavioral baseline (EMA) if transaction is confirmed
    // This happens asynchronously - don't block signal receipt
    if (transaction.payment_status === 'CONFIRMED') {
      updateBehavioralProfile(transaction.user_id, signals)
        .then(result => {
          if (result) {
            console.log(`[${transaction.user_id}] Behavioral baseline updated:`, result.baselines);
          }
        })
        .catch(err => {
          console.error(`[${transaction.user_id}] Failed to update behavioral baseline:`, err);
        });
    }
    
    res.json({
      success: true,
      message: 'Behavioral signals received',
      transaction_id: transaction_id,
      signals_received: Object.keys(signals).length
    });
    
  } catch (error) {
    console.error('Error receiving behavioral signals:', error);
    res.status(500).json({ error: 'Failed to process signals' });
  }
});

/**
 * Validate that all signals are within expected ranges
 * Uses only values captured by frontend (no guessing)
 */
function validateSignals(signals) {
  const validations = [
    // Count signals: 0-100
    {
      field: 'amount_edit_count',
      check: (v) => Number.isInteger(v) && v >= 0 && v <= 100,
      error: 'amount_edit_count must be 0-100'
    },
    {
      field: 'payee_change_count',
      check: (v) => Number.isInteger(v) && v >= 0 && v <= 50,
      error: 'payee_change_count must be 0-50'
    },
    {
      field: 'intent_change_count',
      check: (v) => Number.isInteger(v) && v >= 0 && v <= 20,
      error: 'intent_change_count must be 0-20'
    },
    {
      field: 'edit_cycle_count',
      check: (v) => Number.isInteger(v) && v >= 0 && v <= 50,
      error: 'edit_cycle_count must be 0-50'
    },
    {
      field: 'warning_shown_count',
      check: (v) => Number.isInteger(v) && v >= 0 && v <= 20,
      error: 'warning_shown_count must be 0-20'
    },
    {
      field: 'warning_ignored_count',
      check: (v) => Number.isInteger(v) && v >= 0 && v <= 20,
      error: 'warning_ignored_count must be 0-20'
    },
    
    // Time signals: 0-10 minutes
    {
      field: 'confirmation_delay_ms',
      check: (v) => Number.isInteger(v) && v >= 0 && v <= 600000,
      error: 'confirmation_delay_ms must be 0-600000 (10 minutes)'
    },
    {
      field: 'total_interaction_time_ms',
      check: (v) => Number.isInteger(v) && v >= 0 && v <= 600000,
      error: 'total_interaction_time_ms must be 0-600000 (10 minutes)'
    },
    
    // Score signals: 0-1
    {
      field: 'hesitation_score',
      check: (v) => typeof v === 'number' && v >= 0 && v <= 1,
      error: 'hesitation_score must be 0-1'
    },
    
    // Device ID: non-empty string
    {
      field: 'device_id',
      check: (v) => typeof v === 'string' && v.length > 0,
      error: 'device_id must be non-empty string'
    }
  ];
  
  // Check each validation
  for (const validation of validations) {
    // Allow optional fields
    if (signals[validation.field] === undefined || signals[validation.field] === null) {
      continue;
    }
    
    if (!validation.check(signals[validation.field])) {
      return { valid: false, error: validation.error };
    }
  }
  
  return { valid: true };
}

module.exports = router;
