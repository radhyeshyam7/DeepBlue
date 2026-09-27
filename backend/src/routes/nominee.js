const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * POST /user/nominee
 * Save or update trusted contact
 * Body: { user_id, name, phone, relationship }
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, name, phone, relationship } = req.body;
    
    // Validation
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

    // Find user
    let user = await User.findOne({ user_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Set nominee details
    user.nominee = user.nominee || {};
    user.nominee.name = name;
    user.nominee.phone = phone;
    user.nominee.relationship = relationship || '';
    user.nominee.enabled = true;
    user.nominee.verified = true; // Auto-verified (no OTP required)

    await user.save();

    console.log(`✅ Nominee registered for ${user_id}: ${name} (${phone})`);

    res.json({
      status: 'OK',
      nominee: {
        name: user.nominee.name,
        phone: user.nominee.phone,
        relationship: user.nominee.relationship,
        enabled: user.nominee.enabled,
        verified: user.nominee.verified
      }
    });
  } catch (error) {
    console.error('Error in /user/nominee:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /user/nominee
 * Remove trusted contact
 * Body: { user_id }
 */
router.delete('/', async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    let user = await User.findOne({ user_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear nominee
    user.nominee = {
      enabled: false,
      verified: false
    };

    await user.save();

    console.log(`🗑️ Nominee removed for ${user_id}`);

    res.json({ status: 'OK', message: 'Nominee removed' });
  } catch (error) {
    console.error('Error in DELETE /user/nominee:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /user/nominee?user_id=...
 * Retrieve trusted contact
 */
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    const user = await User.findOne({ user_id });
    if (!user || !user.nominee || !user.nominee.enabled) {
      return res.json({ nominee: null });
    }

    res.json({ nominee: user.nominee });
  } catch (error) {
    console.error('Error in GET /user/nominee:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
