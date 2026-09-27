/**
 * ==========================================
 * INTEGRATION GUIDE: Adding Baselines to Transaction Route
 * ==========================================
 * 
 * This shows exactly how to integrate baseline updates
 * into the existing transaction processing pipeline.
 * 
 * Location: src/routes/transaction.js (or similar)
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const {
  updateBehavioralProfile,
  getBehavioralBaseline
} = require('../services/behavioralProfile');
const {
  scoreTransactionWithBaseline,
  updateBaselineAfterTransaction
} = require('../services/baselineIntegration');
const { extractFeaturesV1 } = require('../ml/featureExtractor');

/**
 * ==========================================
 * EXAMPLE 1: SIMPLE INTEGRATION
 * ==========================================
 * 
 * Minimal changes to existing transaction processing:
 * 1. Before decision: Get baseline
 * 2. Score with deviation info
 * 3. After transaction: Update baseline
 */

router.post('/transaction/decide', async (req, res) => {
  try {
    const { user_id, amount, payee_id, intent_type, behavioral_signals } = req.body;

    // STEP 1: Get user and baseline
    const user = await User.findOne({ user_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const baseline = await getBehavioralBaseline(user_id);

    // STEP 2: Prepare transaction data
    const transactionData = { amount, payee_id, intent_type };

    // STEP 3: Score with baseline info
    const riskScore = await scoreTransactionWithBaseline(
      user_id,
      transactionData,
      behavioral_signals
    );

    if (!riskScore) {
      return res.status(500).json({ error: 'Risk scoring failed' });
    }

    // STEP 4: Make decision based on risk
    let decision = 'APPROVED';
    if (riskScore.adjusted_risk_level === 'CRITICAL') {
      decision = 'BLOCK';
    } else if (riskScore.adjusted_risk_level === 'HIGH') {
      decision = 'WARN';  // Additional verification
    }

    // STEP 5: Save transaction
    const transaction = new Transaction({
      user_id,
      amount,
      payee_id,
      intent_type,
      decision,
      risk_score: riskScore.base_features.hesitation_score,
      behavioral_deviation: riskScore.behavioral_deviations.overall_deviation_score,
      baseline_sample_count: baseline ? baseline.sample_count : 0
    });
    await transaction.save();

    // ============================================
    // KEY ADDITION: Update baseline after decision
    // ============================================
    // NOTE: Only update AFTER user confirms transaction
    // (This happens in a separate endpoint - see EXAMPLE 2)

    res.json({
      decision,
      risk_level: riskScore.adjusted_risk_level,
      deviations: riskScore.behavioral_deviations,
      baseline_confidence: baseline ? 
        (baseline.sample_count >= 20 ? 'HIGH' : 'MEDIUM') : 'LOW'
    });

  } catch (error) {
    console.error('Error deciding transaction:', error);
    res.status(500).json({ error: 'Transaction decision failed' });
  }
});

/**
 * ==========================================
 * EXAMPLE 2: POST-TRANSACTION UPDATE
 * ==========================================
 * 
 * Called AFTER user confirms and transaction completes.
 * This is where baseline gets updated.
 */

router.post('/transaction/confirm', async (req, res) => {
  try {
    const { user_id, transaction_id, behavioral_signals } = req.body;

    // Validate signals
    if (!behavioral_signals || !behavioral_signals.confirmation_delay_ms) {
      return res.status(400).json({ error: 'Behavioral signals required' });
    }

    // STEP 1: Update user's behavioral baseline
    const baselineUpdate = await updateBehavioralProfile(user_id, behavioral_signals);

    if (!baselineUpdate) {
      console.warn(`Failed to update baseline for ${user_id}`);
      // Don't fail the request - baseline update is secondary
    }

    // STEP 2: Update transaction record with actual baseline
    const transaction = await Transaction.findById(transaction_id);
    if (transaction) {
      transaction.behavioral_signals = behavioral_signals;
      transaction.baseline_updated = true;
      await transaction.save();
    }

    // STEP 3: Return confirmation with new baseline info
    res.json({
      success: true,
      baseline_updated: !!baselineUpdate,
      new_baseline: baselineUpdate ? {
        confirmation_time_avg_ms: baselineUpdate.baselines.confirmation_time_avg_ms,
        hesitation_baseline: baselineUpdate.baselines.hesitation_score_baseline,
        sample_count: baselineUpdate.sample_count,
        confidence: baselineUpdate.sample_count >= 20 ? 'HIGH' : 'MEDIUM'
      } : null
    });

  } catch (error) {
    console.error('Error confirming transaction:', error);
    res.status(500).json({ error: 'Confirmation failed' });
  }
});

/**
 * ==========================================
 * EXAMPLE 3: DIAGNOSTIC ENDPOINT
 * ==========================================
 * 
 * For testing and debugging:
 * GET /api/user/:user_id/baseline
 */

router.get('/user/:user_id/baseline', async (req, res) => {
  try {
    const { user_id } = req.params;

    const baseline = await getBehavioralBaseline(user_id);

    if (!baseline) {
      return res.json({
        user_id,
        status: 'NO_BASELINE',
        message: 'User has no baseline yet (new account or no transactions)'
      });
    }

    // Calculate confidence
    let confidence = 'LOW';
    if (baseline.sample_count >= 20) confidence = 'HIGH';
    else if (baseline.sample_count >= 5) confidence = 'MEDIUM';

    res.json({
      user_id,
      status: 'BASELINE_AVAILABLE',
      confidence,
      baselines: {
        confirmation_time_ms: {
          avg: Math.round(baseline.confirmation_time_avg_ms),
          p75: Math.round(baseline.confirmation_time_p75_ms)
        },
        amount_edit_count: {
          avg: baseline.amount_edit_count_avg.toFixed(2)
        },
        hesitation_score: {
          baseline: baseline.hesitation_score_baseline.toFixed(3),
          high_transaction_count: baseline.high_hesitation_transactions
        },
        interaction_time_ms: {
          avg: Math.round(baseline.avg_interaction_time_ms)
        }
      },
      sample_count: baseline.sample_count,
      last_update: baseline.last_update_at
    });

  } catch (error) {
    console.error('Error getting baseline:', error);
    res.status(500).json({ error: 'Failed to get baseline' });
  }
});

/**
 * ==========================================
 * EXAMPLE 4: FULL WORKFLOW (Recommended)
 * ==========================================
 * 
 * Single endpoint handling full transaction flow
 * with baseline integration
 */

router.post('/transaction/full-workflow', async (req, res) => {
  try {
    const { user_id, amount, payee_id, intent_type, behavioral_signals } = req.body;

    console.log(`\n[${user_id}] Starting transaction workflow...`);

    // ============================================
    // PART 1: PRE-DECISION (Get baseline)
    // ============================================
    const user = await User.findOne({ user_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const baseline = await getBehavioralBaseline(user_id);
    console.log(`[${user_id}] Baseline confidence: ${
      baseline ? (baseline.sample_count >= 20 ? 'HIGH' : 'MEDIUM') : 'LOW'
    }`);

    // ============================================
    // PART 2: RISK SCORING
    // ============================================
    const transactionData = { amount, payee_id, intent_type };
    const riskScore = await scoreTransactionWithBaseline(
      user_id,
      transactionData,
      behavioral_signals
    );

    // ============================================
    // PART 3: DECISION
    // ============================================
    let decision = 'APPROVED';
    if (riskScore.adjusted_risk_level === 'CRITICAL') {
      decision = 'BLOCK';
    } else if (riskScore.adjusted_risk_level === 'HIGH') {
      decision = 'WARN';
    }

    console.log(`[${user_id}] Decision: ${decision} (${riskScore.adjusted_risk_level})`);

    // ============================================
    // PART 4: SAVE TRANSACTION
    // ============================================
    const transaction = new Transaction({
      user_id,
      amount,
      payee_id,
      intent_type,
      decision,
      risk_score: riskScore.base_features.hesitation_score,
      behavioral_deviation: riskScore.behavioral_deviations.overall_deviation_score,
      baseline_sample_count: baseline ? baseline.sample_count : 0,
      behavioral_signals: behavioral_signals
    });
    await transaction.save();

    // ============================================
    // PART 5: UPDATE BASELINE (for next transaction)
    // ============================================
    const baselineUpdate = await updateBehavioralProfile(user_id, behavioral_signals);
    console.log(`[${user_id}] Baseline updated: samples=${baselineUpdate?.sample_count}`);

    // ============================================
    // PART 6: RETURN RESPONSE
    // ============================================
    res.json({
      transaction_id: transaction._id,
      decision,
      risk_assessment: {
        risk_level: riskScore.adjusted_risk_level,
        hesitation_score: riskScore.base_features.hesitation_score.toFixed(3),
        deviation_from_baseline: riskScore.behavioral_deviations.overall_deviation_score.toFixed(3)
      },
      baseline_info: {
        is_new_user: !baseline,
        sample_count: baselineUpdate?.sample_count || 1,
        confidence: baselineUpdate?.sample_count >= 20 ? 'HIGH' : 'MEDIUM'
      }
    });

  } catch (error) {
    console.error('Error in full workflow:', error);
    res.status(500).json({ error: 'Transaction workflow failed' });
  }
});

/**
 * ==========================================
 * EXAMPLE 5: BATCH ANALYSIS
 * ==========================================
 * 
 * For analyzing multiple users' baselines
 * Useful for monitoring and reporting
 */

router.get('/analytics/baselines', async (req, res) => {
  try {
    const users = await User.find({ 'behavioral_profile.sample_count': { $gt: 0 } });

    const stats = {
      total_users_with_baseline: users.length,
      confidence_distribution: {
        high: 0,
        medium: 0,
        low: 0
      },
      avg_confirmation_time: 0,
      avg_hesitation_score: 0,
      patterns: []
    };

    let totalConfirmation = 0;
    let totalHesitation = 0;

    for (const user of users) {
      const profile = user.behavioral_profile;
      if (!profile) continue;

      // Confidence calculation
      if (profile.sample_count >= 20) {
        stats.confidence_distribution.high++;
      } else if (profile.sample_count >= 5) {
        stats.confidence_distribution.medium++;
      } else {
        stats.confidence_distribution.low++;
      }

      totalConfirmation += profile.confirmation_time_avg_ms;
      totalHesitation += profile.hesitation_score_baseline;

      // Pattern detection
      if (profile.hesitation_score_baseline > 0.6) {
        stats.patterns.push({
          user_id: user.user_id,
          pattern: 'HIGH_HESITATION',
          value: profile.hesitation_score_baseline
        });
      }
    }

    stats.avg_confirmation_time = Math.round(totalConfirmation / users.length);
    stats.avg_hesitation_score = (totalHesitation / users.length).toFixed(3);

    res.json(stats);

  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Analytics failed' });
  }
});

module.exports = router;

/**
 * ==========================================
 * IMPLEMENTATION CHECKLIST
 * ==========================================
 * 
 * [ ] 1. Add behavioral_profile schema to User model
 * [ ] 2. Run schema migration on production database
 * [ ] 3. Add updateBehavioralProfile to behavioralProfile.js
 * [ ] 4. Add scoreTransactionWithBaseline to baselineIntegration.js
 * [ ] 5. Update transaction route with POST /transaction/confirm
 * [ ] 6. Test with baseline-evolution.test.js
 * [ ] 7. Monitor baseline stability (GET /api/user/:id/baseline)
 * [ ] 8. Enable deviation-based risk adjustments (Phase 2B)
 * [ ] 9. A/B test with production traffic
 * [ ] 10. Observe false positive rate and tune thresholds
 */
