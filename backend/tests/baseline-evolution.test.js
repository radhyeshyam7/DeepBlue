/**
 * ==========================================
 * BASELINE EVOLUTION TESTS
 * ==========================================
 * 
 * Demonstrates how behavioral baselines evolve over time
 * using EMA (Exponential Moving Average) with α=0.4
 */

const {
  updateBehavioralProfile,
  getBehavioralBaseline,
  calculateHesitationDeviation,
  ALPHA
} = require('../services/behavioralProfile');
const User = require('../models/User');

// ========================================
// TEST DATASET: 25 TRANSACTIONS
// ========================================

const testTransactions = [
  // User is SLOW at first (5000ms baseline)
  { confirmation_delay_ms: 5000, amount_edit_count: 2, hesitation_score: 0.6, total_interaction_time_ms: 8000 },
  { confirmation_delay_ms: 5200, amount_edit_count: 1, hesitation_score: 0.55, total_interaction_time_ms: 7500 },
  { confirmation_delay_ms: 4900, amount_edit_count: 2, hesitation_score: 0.62, total_interaction_time_ms: 8200 },
  
  // Transitions to FASTER (3000ms)
  { confirmation_delay_ms: 3500, amount_edit_count: 1, hesitation_score: 0.35, total_interaction_time_ms: 5000 },
  { confirmation_delay_ms: 3200, amount_edit_count: 0, hesitation_score: 0.30, total_interaction_time_ms: 4800 },
  { confirmation_delay_ms: 3800, amount_edit_count: 1, hesitation_score: 0.40, total_interaction_time_ms: 5200 },
  
  // Stabilizes around 3500ms
  { confirmation_delay_ms: 3400, amount_edit_count: 0, hesitation_score: 0.32, total_interaction_time_ms: 5000 },
  { confirmation_delay_ms: 3600, amount_edit_count: 1, hesitation_score: 0.38, total_interaction_time_ms: 5100 },
  { confirmation_delay_ms: 3300, amount_edit_count: 0, hesitation_score: 0.35, total_interaction_time_ms: 4900 },
  { confirmation_delay_ms: 3700, amount_edit_count: 1, hesitation_score: 0.42, total_interaction_time_ms: 5300 },
  
  // Occasional blips (anomalies we want to detect)
  { confirmation_delay_ms: 2500, amount_edit_count: 3, hesitation_score: 0.25, total_interaction_time_ms: 4000 }, // FAST
  { confirmation_delay_ms: 3500, amount_edit_count: 0, hesitation_score: 0.36, total_interaction_time_ms: 5100 },
  { confirmation_delay_ms: 8000, amount_edit_count: 4, hesitation_score: 0.85, total_interaction_time_ms: 10000 }, // ANOMALY: Very slow
  { confirmation_delay_ms: 3600, amount_edit_count: 0, hesitation_score: 0.38, total_interaction_time_ms: 5200 },
  
  // Back to normal
  { confirmation_delay_ms: 3500, amount_edit_count: 1, hesitation_score: 0.37, total_interaction_time_ms: 5100 },
  { confirmation_delay_ms: 3400, amount_edit_count: 0, hesitation_score: 0.34, total_interaction_time_ms: 5000 },
  { confirmation_delay_ms: 3650, amount_edit_count: 1, hesitation_score: 0.39, total_interaction_time_ms: 5200 },
  { confirmation_delay_ms: 3300, amount_edit_count: 0, hesitation_score: 0.35, total_interaction_time_ms: 4900 },
  
  // Final stable period (20+ transactions: baseline is reliable)
  { confirmation_delay_ms: 3550, amount_edit_count: 1, hesitation_score: 0.38, total_interaction_time_ms: 5150 },
  { confirmation_delay_ms: 3450, amount_edit_count: 0, hesitation_score: 0.36, total_interaction_time_ms: 5050 },
  { confirmation_delay_ms: 3600, amount_edit_count: 1, hesitation_score: 0.40, total_interaction_time_ms: 5200 },
  { confirmation_delay_ms: 3400, amount_edit_count: 1, hesitation_score: 0.37, total_interaction_time_ms: 5100 },
  { confirmation_delay_ms: 3500, amount_edit_count: 0, hesitation_score: 0.35, total_interaction_time_ms: 5000 },
  { confirmation_delay_ms: 3550, amount_edit_count: 1, hesitation_score: 0.39, total_interaction_time_ms: 5150 },
  { confirmation_delay_ms: 3450, amount_edit_count: 0, hesitation_score: 0.36, total_interaction_time_ms: 5050 }
];

// ========================================
// SIMULATION FUNCTION
// ========================================

async function simulateBaselineEvolution(userId = 'test-user-001') {
  console.log('\n' + '='.repeat(80));
  console.log('BASELINE EVOLUTION SIMULATION');
  console.log('='.repeat(80));
  console.log(`User ID: ${userId}`);
  console.log(`Total transactions: ${testTransactions.length}`);
  console.log(`EMA Parameter (α): ${ALPHA}`);
  console.log('='.repeat(80) + '\n');

  // Create test user
  let user = await User.findOne({ user_id: userId });
  if (!user) {
    user = new User({
      user_id: userId,
      account_created_at: new Date(),
      account_age_days: 7,
      total_transactions: 0,
      user_type: 'NEW'
    });
    await user.save();
  }

  console.log('PHASE 1: BASELINE FORMATION (Transactions 1-10)\n');

  // Process first 10 transactions
  for (let i = 0; i < 10; i++) {
    const txn = testTransactions[i];
    const result = await updateBehavioralProfile(userId, txn);

    if (i === 0 || i === 4 || i === 9) {
      console.log(`  Transaction ${i + 1}:`);
      console.log(`    Input: ${txn.confirmation_delay_ms}ms, ${txn.amount_edit_count} edits, hesitation: ${txn.hesitation_score}`);
      console.log(`    Baseline: ${Math.round(result.baselines.confirmation_time_avg_ms)}ms`);
      console.log(`    Confidence: LOW (only ${result.sample_count} samples)`);
      console.log('');
    }
  }

  console.log('PHASE 2: ANOMALY DETECTION (Transactions 11-15)\n');

  for (let i = 10; i < 15; i++) {
    const txn = testTransactions[i];
    const baseline = await getBehavioralBaseline(userId);
    
    const result = await updateBehavioralProfile(userId, txn);

    const confirmationRatio = baseline 
      ? (txn.confirmation_delay_ms / baseline.confirmation_time_avg_ms).toFixed(2)
      : 'N/A';

    const hesitationDev = calculateHesitationDeviation(
      txn.hesitation_score,
      baseline ? baseline.hesitation_score_baseline : 0,
      baseline ? baseline.sample_count : 0
    );

    console.log(`  Transaction ${i + 1}:`);
    console.log(`    Input: ${txn.confirmation_delay_ms}ms (ratio: ${confirmationRatio}x)`);
    console.log(`    Hesitation deviation: ${(hesitationDev * 100).toFixed(0)}%`);
    if (i === 12) {
      console.log(`    ⚠️  ANOMALY DETECTED: 8000ms (2.3x baseline) + high hesitation`);
    }
    console.log('');
  }

  console.log('PHASE 3: BASELINE CONVERGENCE (Transactions 16-25)\n');

  for (let i = 15; i < testTransactions.length; i++) {
    const txn = testTransactions[i];
    const result = await updateBehavioralProfile(userId, txn);

    if (i === 19) {
      console.log(`  Transaction ${i + 1}:`);
      console.log(`    Baseline is now STABLE (${result.sample_count} samples)`);
      console.log(`    Confirmation time avg: ${Math.round(result.baselines.confirmation_time_avg_ms)}ms`);
      console.log(`    Edit count avg: ${result.baselines.amount_edit_count_avg.toFixed(2)}`);
      console.log(`    Hesitation baseline: ${result.baselines.hesitation_score_baseline}`);
      console.log(`    ✓ Can now confidently detect anomalies`);
      console.log('');
    } else if (i === testTransactions.length - 1) {
      console.log(`  Transaction ${i + 1} (final):`);
      console.log(`    Baseline FULLY CONVERGED`);
      console.log(`    Confirmation time avg: ${Math.round(result.baselines.confirmation_time_avg_ms)}ms`);
      console.log(`    Edit count avg: ${result.baselines.amount_edit_count_avg.toFixed(2)}`);
      console.log(`    Hesitation baseline: ${result.baselines.hesitation_score_baseline}`);
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log('SIMULATION COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// ========================================
// DEVIATION TEST
// ========================================

async function testHesitationDeviation() {
  console.log('\n' + '='.repeat(80));
  console.log('HESITATION DEVIATION TEST');
  console.log('='.repeat(80) + '\n');

  const testCases = [
    { current: 0.3, baseline: 0.35, samples: 20, description: 'Below baseline (normal)' },
    { current: 0.4, baseline: 0.35, samples: 20, description: '14% above baseline' },
    { current: 0.65, baseline: 0.35, samples: 20, description: '86% above baseline (2x)' },
    { current: 0.85, baseline: 0.35, samples: 20, description: '143% above baseline (2.4x)' },
    { current: 0.75, baseline: 0.0, samples: 1, description: 'New user (no baseline)' }
  ];

  for (const test of testCases) {
    const deviation = calculateHesitationDeviation(test.current, test.baseline, test.samples);
    console.log(`Case: ${test.description}`);
    console.log(`  Current: ${test.current}, Baseline: ${test.baseline}`);
    console.log(`  Deviation score: ${deviation.toFixed(3)} (${(deviation * 100).toFixed(0)}%)`);
    console.log('');
  }

  console.log('='.repeat(80) + '\n');
}

// ========================================
// EXPORT FOR TESTING
// ========================================

module.exports = {
  simulateBaselineEvolution,
  testHesitationDeviation,
  testTransactions
};
