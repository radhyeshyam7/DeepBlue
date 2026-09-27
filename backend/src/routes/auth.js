/**
 * Authentication Routes
 * 
 * Handles user registration and login
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { setUserPin, hashPin } = require('../services/pinVerification');

/**
 * POST /auth/register
 * Register a new user with PIN
 */
router.post('/register', async (req, res) => {
  try {
    const { user_id, name, email, phone, pin, usageContext } = req.body;
    
    // Validate required fields
    if (!user_id || !name || !email || !pin) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, name, email, pin'
      });
    }
    
    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        error: 'PIN must be exactly 4 digits'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ user_id });
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists'
      });
    }
    
    // Create new user
    const user = new User({
      user_id,
      account_created_at: new Date(),
      account_age_days: 0,
      total_transactions: 0,
      user_type: 'NEW',
      pin_hash: hashPin(pin),
      pin_set_at: new Date(),
      // Additional fields from frontend
      name,
      email,
      phone,
      usage_context: usageContext || 'personal'
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        user_id: user.user_id,
        name,
        email,
        account_created_at: user.account_created_at
      }
    });
    
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      error: 'Failed to register user',
      message: error.message
    });
  }
});

/**
 * POST /auth/login
 * Login user (simplified - no password check for demo)
 */
router.post('/login', async (req, res) => {
  try {
    const { user_id, email } = req.body;
    
    if (!user_id && !email) {
      return res.status(400).json({
        error: 'user_id or email required'
      });
    }
    
    // Find user
    const query = user_id ? { user_id } : { email };
    const user = await User.findOne(query);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Update account age
    user.computeAccountAge();
    await user.save();
    
    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        account_created_at: user.account_created_at,
        account_age_days: user.account_age_days,
        total_transactions: user.total_transactions,
        user_type: user.user_type,
        usage_context: user.usage_context,
        has_pin: !!user.pin_hash
      }
    });
    
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({
      error: 'Failed to login',
      message: error.message
    });
  }
});

/**
 * GET /auth/user/:user_id
 * Get user profile
 */
router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const user = await User.findOne({ user_id });
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Update account age
    user.computeAccountAge();
    
    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        account_created_at: user.account_created_at,
        account_age_days: user.account_age_days,
        total_transactions: user.total_transactions,
        user_type: user.user_type,
        usage_context: user.usage_context,
        has_pin: !!user.pin_hash,
        pin_set_at: user.pin_set_at,
        // Security settings
        cooling_off_enabled: user.cooling_off_enabled,
        risk_sensitivity_level: user.risk_sensitivity_level,
        // Nominee info
        nominee: user.nominee ? {
          name: user.nominee.name,
          phone: user.nominee.phone,
          relationship: user.nominee.relationship,
          enabled: user.nominee.enabled,
          verified: user.nominee.verified
        } : null
      }
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error.message
    });
  }
});

/**
 * PUT /auth/user/:user_id
 * Update user profile
 */
router.put('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const updates = req.body;
    
    const user = await User.findOne({ user_id });
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Update allowed fields
    const allowedFields = ['name', 'email', 'phone', 'usage_context', 'cooling_off_enabled', 'risk_sensitivity_level'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    });
    
    await user.save();
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: error.message
    });
  }
});

/**
 * POST /auth/change-pin
 * Change user PIN
 */
router.post('/change-pin', async (req, res) => {
  try {
    const { user_id, old_pin, new_pin } = req.body;
    
    if (!user_id || !old_pin || !new_pin) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, old_pin, new_pin'
      });
    }
    
    // Validate new PIN format
    if (!/^\d{4}$/.test(new_pin)) {
      return res.status(400).json({
        error: 'New PIN must be exactly 4 digits'
      });
    }
    
    const user = await User.findOne({ user_id });
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Verify old PIN
    const oldPinHash = hashPin(old_pin);
    if (oldPinHash !== user.pin_hash) {
      return res.status(401).json({
        error: 'Incorrect current PIN'
      });
    }
    
    // Set new PIN
    user.pin_hash = hashPin(new_pin);
    user.pin_set_at = new Date();
    await user.save();
    
    res.json({
      success: true,
      message: 'PIN changed successfully'
    });
    
  } catch (error) {
    console.error('Error changing PIN:', error);
    res.status(500).json({
      error: 'Failed to change PIN',
      message: error.message
    });
  }
});

module.exports = router;
