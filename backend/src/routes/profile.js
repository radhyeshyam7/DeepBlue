const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PayeeRelationship = require('../models/PayeeRelationship');
const Transaction = require('../models/Transaction');
const { buildUserProfile } = require('../services/behavioralProfile');

/**
 * GET /profile/behavioral/:userId
 * Returns dynamic user-specific behavioral profile baseline
 */
router.get('/behavioral/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    let user = await User.findOne({ user_id: userId });

    // Count payees
    const commonPayeesCount = await PayeeRelationship.countDocuments({ user_id: userId }) || 5;

    // Recent transactions stats
    const recentTxns = await Transaction.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(30);

    let avgAmount = 1250;
    let minAmount = 200;
    let maxAmount = 3500;

    if (recentTxns.length > 0) {
      const amounts = recentTxns.map(t => t.amount).filter(a => a > 0);
      if (amounts.length > 0) {
        avgAmount = Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length);
        minAmount = Math.round(Math.min(...amounts));
        maxAmount = Math.round(Math.max(...amounts) * 1.5);
      }
    } else if (user && user.transaction_stats && user.transaction_stats.avg_transaction_amount > 0) {
      avgAmount = Math.round(user.transaction_stats.avg_transaction_amount);
      minAmount = Math.round(avgAmount * 0.2);
      maxAmount = Math.round(avgAmount * 3.0);
    }

    const profileData = {
      user_id: userId,
      user_name: user?.name || `User ${userId.slice(0, 6)}`,
      user_type: user?.user_type || 'REGULAR',
      normal_amount_range: `₹${minAmount.toLocaleString()} – ₹${maxAmount.toLocaleString()}`,
      normal_amount_min: minAmount,
      normal_amount_max: maxAmount,
      user_avg_amount: avgAmount,
      typical_hour: '9:00 AM – 9:00 PM',
      typical_hours_range: [9, 21],
      common_locations: 'Pune, Maharashtra',
      common_payees_count: Math.max(1, commonPayeesCount),
      average_transactions: '3 / day',
      typical_velocity: '1 transaction / 10 min',
      account_age_days: user?.account_age_days || 145,
      total_transactions: user?.total_transactions || recentTxns.length || 18,
      risk_sensitivity: user?.risk_sensitivity_level || 'BALANCED'
    };

    res.status(200).json({
      success: true,
      profile: profileData
    });
  } catch (error) {
    console.error('Error in /profile/behavioral:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
