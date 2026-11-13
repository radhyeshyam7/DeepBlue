/**
 * PIN Verification Service
 * 
 * Handles secure PIN verification for transactions.
 * 
 * SECURITY NOTES:
 * - Maximum 3 PIN attempts enforced per user & transaction (UPI / NPCI standard)
 * - 5-minute lockout upon exceeding 3 failed attempts
 * - PINs are hashed using SHA-256 (never stored in plaintext)
 * - Persisted in MongoDB and synchronized with real-time memory cache
 */

const crypto = require('crypto');

// Retry tracking (key: userId or transactionId -> { attempts, lockedUntil })
const retryAttempts = new Map();

// Configuration: strictly 3 attempts before lockout
const MAX_RETRY_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hash a PIN using SHA-256
 */
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

/**
 * Check if a key (userId or transactionId) is locked
 */
function checkLockStatus(key) {
  const record = retryAttempts.get(key);
  
  if (!record || !record.lockedUntil) {
    return { locked: false };
  }

  const now = Date.now();
  if (now < record.lockedUntil) {
    return {
      locked: true,
      lockedUntil: record.lockedUntil,
      remainingMs: record.lockedUntil - now,
      remainingSeconds: Math.ceil((record.lockedUntil - now) / 1000)
    };
  }

  // Lock expired, clear it
  retryAttempts.delete(key);
  return { locked: false };
}

/**
 * Increment retry attempts for a key
 */
function incrementRetryAttempts(key) {
  const record = retryAttempts.get(key) || { attempts: 0 };
  record.attempts += 1;
  record.lastAttempt = Date.now();
  retryAttempts.set(key, record);
  return record.attempts;
}

/**
 * Lock key after max attempts
 */
function lockKey(key) {
  const record = retryAttempts.get(key) || { attempts: MAX_RETRY_ATTEMPTS };
  record.attempts = MAX_RETRY_ATTEMPTS;
  record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  retryAttempts.set(key, record);
}

/**
 * Verify PIN for a transaction with strict 3-attempt limit
 * 
 * @param {string} transactionId - Transaction ID
 * @param {string} userId - User ID
 * @param {string} pin - PIN entered by user
 * @returns {object} { valid: boolean, error?: string, attemptsRemaining?: number, locked?: boolean }
 */
async function verifyPin(transactionId, userId, pin) {
  try {
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

    const now = new Date();

    // 1. Check user-level persistent lock in MongoDB
    if (user.pin_locked_until && user.pin_locked_until > now) {
      const remainingSecs = Math.ceil((user.pin_locked_until.getTime() - now.getTime()) / 1000);
      const remainingMins = Math.max(1, Math.ceil(remainingSecs / 60));
      return {
        valid: false,
        error: `Maximum 3 PIN attempts exceeded. Account locked for ${remainingMins} minute(s).`,
        lockedUntil: user.pin_locked_until,
        attemptsRemaining: 0,
        locked: true
      };
    }

    // 2. Check memory locks
    const userLock = checkLockStatus(userId);
    if (userLock.locked) {
      const remainingMins = Math.max(1, Math.ceil(userLock.remainingSeconds / 60));
      return {
        valid: false,
        error: `Maximum 3 PIN attempts exceeded. Account locked for ${remainingMins} minute(s).`,
        lockedUntil: userLock.lockedUntil,
        attemptsRemaining: 0,
        locked: true
      };
    }

    const txLock = checkLockStatus(transactionId);
    if (txLock.locked) {
      return {
        valid: false,
        error: 'Maximum 3 PIN attempts exceeded. Transaction locked for 5 minutes.',
        lockedUntil: txLock.lockedUntil,
        attemptsRemaining: 0,
        locked: true
      };
    }

    // Reset expired lock if any
    if (user.pin_locked_until && user.pin_locked_until <= now) {
      user.pin_locked_until = null;
      user.pin_failed_attempts = 0;
      await user.save();
    }

    // 3. Compare PIN hash
    const enteredPinHash = hashPin(pin);
    const isValid = enteredPinHash === user.pin_hash;

    if (isValid) {
      // Clear attempts on successful entry
      retryAttempts.delete(transactionId);
      retryAttempts.delete(userId);
      user.pin_failed_attempts = 0;
      user.pin_locked_until = null;
      await user.save();
      
      return {
        valid: true,
        message: 'PIN verified successfully'
      };
    } else {
      // Increment attempt count on transaction and user
      const txAttempts = incrementRetryAttempts(transactionId);
      const userAttempts = incrementRetryAttempts(userId);
      const totalAttempts = Math.max(txAttempts, userAttempts, (user.pin_failed_attempts || 0) + 1);

      user.pin_failed_attempts = totalAttempts;
      const remaining = Math.max(0, MAX_RETRY_ATTEMPTS - totalAttempts);

      if (remaining <= 0) {
        // Enforce 5-minute lockout
        lockKey(transactionId);
        lockKey(userId);
        user.pin_locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await user.save();
        
        return {
          valid: false,
          error: 'Maximum 3 PIN attempts exceeded. In accordance with UPI security, account is locked for 5 minutes.',
          attemptsRemaining: 0,
          locked: true,
          lockedUntil: user.pin_locked_until
        };
      }

      await user.save();

      return {
        valid: false,
        error: `Incorrect PIN. Only ${remaining} of ${MAX_RETRY_ATTEMPTS} attempts remaining.`,
        attemptsRemaining: remaining,
        locked: false
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
 * Get retry status for a transaction or user
 */
function getRetryStatus(key) {
  const lockStatus = checkLockStatus(key);
  if (lockStatus.locked) {
    return {
      locked: true,
      lockedUntil: lockStatus.lockedUntil,
      attemptsRemaining: 0
    };
  }

  const record = retryAttempts.get(key);
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
function clearRetryAttempts(key) {
  retryAttempts.delete(key);
}

/**
 * Set user PIN (during signup or PIN change)
 */
async function setUserPin(userId, pin) {
  try {
    if (!/^\d{4}$/.test(pin)) {
      return {
        success: false,
        error: 'PIN must be exactly 4 digits'
      };
    }

    const pinHash = hashPin(pin);
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
    user.pin_failed_attempts = 0;
    user.pin_locked_until = null;
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
