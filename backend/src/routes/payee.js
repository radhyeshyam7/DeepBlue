/**
 * routes/payee.js
 * 
 * API endpoints for managing payee relationships
 */

const express = require('express');
const router = express.Router();
const {
  getPayeeRelationship,
  getUserPayees,
  extractPayeeFeatures
} = require('../services/payeeRelationshipService');

/**
 * GET /payee/:payeeId
 * Get relationship details for a specific payee
 */
router.get('/:payeeId', async (req, res) => {
  try {
    const { userId } = req.query;
    const { payeeId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }

    const payeeData = await getPayeeRelationship(userId, payeeId);

    if (!payeeData) {
      return res.status(404).json({
        error: 'Payee not found or is new',
        is_new_payee: true,
        trust_score: 0
      });
    }

    res.json(payeeData);
  } catch (error) {
    console.error('Error fetching payee:', error);
    res.status(500).json({
      error: 'Failed to fetch payee information',
      message: error.message
    });
  }
});

/**
 * GET /payee/user/:userId
 * Get all payees for a user with their trust levels
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const payees = await getUserPayees(userId, parseInt(limit));

    res.json({
      total_payees: payees.length,
      payees: payees.map(p => ({
        ...p,
        trust_level: p.trust_score <= 0 ? 'UNKNOWN' :
                     p.trust_score < 1 ? 'NEW' :
                     p.trust_score < 3 ? 'LOW_TRUST' :
                     p.trust_score < 6 ? 'MEDIUM_TRUST' : 'HIGH_TRUST'
      }))
    });
  } catch (error) {
    console.error('Error fetching user payees:', error);
    res.status(500).json({
      error: 'Failed to fetch payees',
      message: error.message
    });
  }
});

/**
 * GET /payee/features/:payeeId
 * Get risk features for a payee (used in feature extraction)
 */
router.get('/features/:payeeId', async (req, res) => {
  try {
    const { userId } = req.query;
    const { payeeId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }

    const features = await extractPayeeFeatures(userId, payeeId);

    res.json({
      payee_id: payeeId,
      features
    });
  } catch (error) {
    console.error('Error extracting payee features:', error);
    res.status(500).json({
      error: 'Failed to extract features',
      message: error.message
    });
  }
});

/**
 * GET /payee/summary/:userId
 * Get summary of payee relationships (new, recurring, high-risk)
 */
router.get('/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const payees = await getUserPayees(userId, 1000);

    const summary = {
      total_unique_payees: payees.length,
      new_payees: payees.filter(p => p.trust_score < 1).length,
      recurring_payees: payees.filter(p => p.is_recurring).length,
      one_time_payees: payees.filter(p => p.total_transactions === 1).length,
      trust_levels: {
        unknown: payees.filter(p => p.trust_score <= 0).length,
        new: payees.filter(p => p.trust_score > 0 && p.trust_score < 1).length,
        low_trust: payees.filter(p => p.trust_score >= 1 && p.trust_score < 3).length,
        medium_trust: payees.filter(p => p.trust_score >= 3 && p.trust_score < 6).length,
        high_trust: payees.filter(p => p.trust_score >= 6).length
      },
      top_payees_by_amount: payees
        .sort((a, b) => b.total_transactions - a.total_transactions)
        .slice(0, 10)
        .map(p => ({
          payee_id: p.payee_id,
          payee_name: p.payee_name,
          transactions: p.total_transactions,
          trust_level: p.trust_score <= 0 ? 'UNKNOWN' :
                       p.trust_score < 1 ? 'NEW' :
                       p.trust_score < 3 ? 'LOW_TRUST' :
                       p.trust_score < 6 ? 'MEDIUM_TRUST' : 'HIGH_TRUST'
        }))
    };

    res.json(summary);
  } catch (error) {
    console.error('Error getting payee summary:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      message: error.message
    });
  }
});

module.exports = router;
