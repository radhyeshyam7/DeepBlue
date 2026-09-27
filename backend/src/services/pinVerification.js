/**
 * PIN Verification Service
 * 
 * Handles secure PIN verification for transactions.
 * 
 * SECURITY NOTES:
 * - PINs are hashed using SHA-256 (never stored in plaintext)
 * - Retry limits enforced per transaction
 * - Rate limiting prevents brute force attacks
 * - Always checks against MongoDB stored PIN
 */

const crypto = require('crypto');

// Retry tracking (in-memory for demo, use Redis in production)
const retryAttempts = new Map(); // transaction_id -> { attempts, lockedUntil }

// Configuration
const MAX_RETRY_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hash a PIN using SHA-256 (simplified for demo)
 * In production, use bcrypt or argon2
 */
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

/**
 * Verify PIN for a transaction
 * 
 * @param {string} transactionId - Transaction ID
 * @param {string} userId - User ID
 * @param {string} pin - PIN entered by user
 * @returns {object} { valid: boolean, error?: string, attemptsRemaining?: number }
 */
async function verifyPin(transactionId, userId, pin) {
  try {
    // Check if transaction is locked due to too many attempts
    const lockStatus = checkLockStatus(transactionId);
    if (lockStatus.locked) {
      return {
        valid: false,
        error: 'Too many incorrect attempts. Please try again later.',
        lockedUntil: lockStatus.lockedUntil,
        attemptsRemaining: 0
      };
    }

    // Get user's stored PIN hash from MongoDB
    const User = require('../models/User');
    const user = await User.findOne({ user_id: userId });
    
    if (!user) {
      return {
        valid: false,
        error: 'User not found'
      };
    }
    
    if (!user.pin_hash) {
      return {
        valid: false,
        error: 'PIN not set for this user. Please set up your PIN in settings.'
      };
    }

    // Hash entered PIN and compare with stored hash
    const enteredPinHash = hashPin(pin);
    const isValid = enteredPinHash === user.pin_hash;

    if (isValid) {
      // Clear retry attempts on success
      retryAttempts.delete(transactionId);
      
      return {
        valid: true,
        message: 'PIN verified successfully'
      };
    } else {
      // Increment retry attempts
      const attempts = incrementRetryAttempts(transactionId);
      const remaining = MAX_RETRY_ATTEMPTS - attempts;

      if (remaining <= 0) {
        // Lock transaction
        lockTransaction(transactionId);
        
        return {
          valid: false,
          error: 'Maximum attempts exceeded. Transaction locked for 5 minutes.',
          attemptsRemaining: 0,
          locked: true
        };
      }

      return {
        valid: false,
        error: `Incorrect PIN. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
        attemptsRemaining: remaining
      };
    }
  } catch (error) {
    console.error('PIN verification error:', error);
    return {
      valid: false,
      error: 'PIN verification failed'
    };
  }
}

/**
 * Check if transaction is locked due to too many attempts
 */
function checkLockStatus(transactionId) {
  const record = retryAttempts.get(transactionId);
  
  if (!record || !record.lockedUntil) {
    return { locked: false };
  }

  const now = Date.now();
  if (now < record.lockedUntil) {
    return {
      locked: true,
      lockedUntil: record.lockedUntil,
      remainingMs: record.lockedUntil - now
    };
  }

  // Lock expired, clear it
  retryAttempts.delete(transactionId);
  return { locked: false };
}

/**
 * Increment retry attempts for a transaction
 */
function incrementRetryAttempts(transactionId) {
  const record = retryAttempts.get(transactionId) || { attempts: 0 };
  record.attempts += 1;
  record.lastAttempt = Date.now();
  retryAttempts.set(transactionId, record);
  return record.attempts;
}

/**
 * Lock transaction after max attempts
 */
function lockTransaction(transactionId) {
  const record = retryAttempts.get(transactionId) || { attempts: MAX_RETRY_ATTEMPTS };
  record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  retryAttempts.set(transactionId, record);
}

/**
 * Get retry status for a transaction
 */
function getRetryStatus(transactionId) {
  const lockStatus = checkLockStatus(transactionId);
  if (lockStatus.locked) {
    return {
      locked: true,
      lockedUntil: lockStatus.lockedUntil,
      attemptsRemaining: 0
    };
  }

  const record = retryAttempts.get(transactionId);
  const attempts = record ? record.attempts : 0;
  const remaining = MAX_RETRY_ATTEMPTS - attempts;

  return {
    locked: false,
    attempts,
    attemptsRemaining: Math.max(0, remaining)
  };
}

/**
 * Clear retry attempts (for testing or admin override)
 */
function clearRetryAttempts(transactionId) {
  retryAttempts.delete(transactionId);
}

/**
 * Set user PIN (during signup or PIN change)
 * 
 * @param {string} userId - User ID
 * @param {string} pin - New PIN (4 digits)
 * @returns {object} { success: boolean, error?: string }
 */
async function setUserPin(userId, pin) {
  try {
    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      return {
        success: false,
        error: 'PIN must be exactly 4 digits'
      };
    }

    // Hash PIN
    const pinHash = hashPin(pin);

    // Store in database
    const User = require('../models/User');
    const user = await User.findOne({ user_id: userId });
    
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    user.pin_hash = pinHash;
    user.pin_set_at = new Date();
    await user.save();

    return {
      success: true,
      message: 'PIN set successfully'
    };
  } catch (error) {
    console.error('Error setting PIN:', error);
    return {
      success: false,
      error: 'Failed to set PIN'
    };
  }
}

/**
 * Verify PIN strength (basic validation)
 */
function validatePinStrength(pin) {
  const errors = [];

  if (!/^\d{4}$/.test(pin)) {
    errors.push('PIN must be exactly 4 digits');
  }

  // Check for weak patterns
  if (/^(\d)\1{3}$/.test(pin)) {
    errors.push('PIN cannot be all same digits (e.g., 1111)');
  }

  if (pin === '1234' || pin === '4321' || pin === '0000') {
    errors.push('PIN is too common. Choose a more secure PIN.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  verifyPin,
  setUserPin,
  validatePinStrength,
  getRetryStatus,
  clearRetryAttempts,
  hashPin,
  
  // Configuration
  MAX_RETRY_ATTEMPTS,
  LOCKOUT_DURATION_MS
};
