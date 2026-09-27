/**
 * ==========================================
 * BASELINE INTEGRATION EXAMPLE
 * ==========================================
 * 
 * Shows how to integrate behavioral baselines into the feature extractor
 * and how to use them for deviation detection and scoring.
 * 
 * This is the complete workflow for Gap 1: User Behavioral Baselines
 */

const User = require('../models/User');
const {
  getBehavioralBaseline,
  calculateHesitationDeviation,
  updateBehavioralProfile
} = require('./behavioralProfile');
const { extractFeaturesV1 } = require('../ml/featureExtractor');

// ========================================
// WORKFLOW: Process Transaction with Baselines
// ========================================

/**
 * STEP 1: Extract behavioral signals from user interaction
 * Called from frontend when transaction form is submitted
 */
function captureBehavioralSignals(formInteractionData) {
  const {
    start_time_ms,
    confirmation_time_ms,
    final_amount,
    amount_edits,
    hesitation_time_ms,
    field_focus_shifts,
    total_interaction_time_ms
  } = formInteractionData;

  return {
    confirmation_delay_ms: confirmation_time_ms,
    amount_edit_count: amount_edits,
    hesitation_time_ms,
    field_focus_shifts,
    total_interaction_time_ms,
    final_amount
  };
}

/**
 * STEP 2: Get user baseline for comparison
 */
async function getUserBaseline(userId) {
  const baseline = await getBehavioralBaseline(userId);
  
  if (!baseline) {
    console.log(`[${userId}] No baseline yet (new user)`);
    return null;
  }

  console.log(`[${userId}] Loaded baseline:`);
  console.log(`  - Confirmation time: ${Math.round(baseline.confirmation_time_avg_ms)}ms (p75: ${Math.round(baseline.confirmation_time_p75_ms)}ms)`);
  console.log(`  - Edit count: ${baseline.amount_edit_count_avg.toFixed(2)}`);
  console.log(`  - Hesitation baseline: ${baseline.hesitation_score_baseline.toFixed(3)}`);
  console.log(`  - Samples: ${baseline.sample_count}\n`);

  return baseline;
}

/**
 * STEP 3: Calculate feature deviations
 */
function calculateFeatureDeviations(signals, baseline) {
  if (!baseline || baseline.sample_count === 0) {
    return {
      confirmation_time_deviation: 0,
      edit_count_deviation: 0,
      hesitation_deviation: 0,
      overall_deviation_score: 0
    };
  }

  // ========================================
  // CONFIRMATION TIME DEVIATION
  // ========================================
  const confirmationTime = signals.confirmation_delay_ms || 2000;
  const baselineConfirmation = baseline.confirmation_time_avg_ms;
  const confirmationRatio = baselineConfirmation > 0 
    ? confirmationTime / baselineConfirmation 
    : 1.0;

  let confirmationDeviation = 0;
  if (confirmationRatio < 0.5) {
    confirmationDeviation = 0.1;  // Much faster - suspicious
  } else if (confirmationRatio < 1.0) {
    confirmationDeviation = 0.0;  // Faster - normal
  } else if (confirmationRatio < 1.5) {
    confirmationDeviation = 0.2;  // Slightly slower
  } else if (confirmationRatio < 2.0) {
    confirmationDeviation = 0.4;  // Much slower - moderate concern
  } else {
    confirmationDeviation = 0.7;  // Way slower - significant concern
  }

  // ========================================
  // EDIT COUNT DEVIATION
  // ========================================
  const editCount = signals.amount_edit_count || 0;
  const baselineEdits = baseline.amount_edit_count_avg;
  const editRatio = baselineEdits > 0
    ? editCount / baselineEdits
    : (editCount > 0 ? 5 : 0);

  let editDeviation = 0;
  if (editRatio < 0.5) {
    editDeviation = 0.1;  // Fewer edits
  } else if (editRatio < 1.0) {
    editDeviation = 0.0;  // Normal range
  } else if (editRatio < 2.0) {
    editDeviation = 0.3;  // Some extra edits
  } else if (editRatio < 3.0) {
    editDeviation = 0.6;  // Many extra edits
  } else {
    editDeviation = 0.8;  // Excessive edits
  }

  // ========================================
  // HESITATION DEVIATION (relative to baseline)
  // ========================================
  const currentHesitation = signals.hesitation_time_ms 
    ? Math.min(signals.hesitation_time_ms / 10000, 1.0)
    : 0;

  const hesitationDeviation = calculateHesitationDeviation(
    currentHesitation,
    baseline.hesitation_score_baseline,
    baseline.sample_count
  );

  // ========================================
  // OVERALL DEVIATION SCORE
  // ========================================
  const overallDeviation = (
    (confirmationDeviation * 0.35) +  // Confirmation time: 35% weight
    (editDeviation * 0.30) +           // Edit count: 30% weight
    (hesitationDeviation * 0.35)       // Hesitation: 35% weight
  );

  return {
    confirmation_time_deviation: confirmationDeviation,
    edit_count_deviation: editDeviation,
    hesitation_deviation: hesitationDeviation,
    overall_deviation_score: Math.round(overallDeviation * 100) / 100,
    ratios: {
      confirmation_ratio: confirmationRatio,
      edit_ratio: editRatio
    }
  };
}

/**
 * STEP 4: Use deviation in risk scoring
 */
async function scoreTransactionWithBaseline(userId, transactionData, signals) {
  try {
    const user = await User.findOne({ user_id: userId });
    if (!user) {
      console.error(`User ${userId} not found`);
      return null;
    }

    // Get baseline
    const baseline = await getUserBaseline(userId);

    // Calculate deviations
    const deviations = calculateFeatureDeviations(signals, baseline);

    // Extract features (existing v1 extraction)
    const features = await extractFeaturesV1(transactionData, user, null, signals);

    // Combine with deviation score
    const riskScore = {
      base_features: features,
      behavioral_deviations: deviations,
      adjusted_risk_level: adjustRiskLevel(features.hesitation_score, deviations)
    };

    console.log(`\n[${userId}] RISK ASSESSMENT:`);
    console.log(`  Base hesitation: ${features.hesitation_score.toFixed(3)}`);
    console.log(`  Behavioral deviation: ${deviations.overall_deviation_score.toFixed(3)}`);
    console.log(`  Adjusted risk level: ${riskScore.adjusted_risk_level}`);
    console.log('');

    return riskScore;
  } catch (error) {
    console.error('Error scoring transaction:', error);
    return null;
  }
}

/**
 * STEP 5: Update baseline after transaction
 */
async function updateBaselineAfterTransaction(userId, signals) {
  try {
    const result = await updateBehavioralProfile(userId, signals);
    
    if (result) {
      console.log(`\n[${userId}] BASELINE UPDATED`);
      console.log(`  New confirmation avg: ${result.baselines.confirmation_time_avg_ms}ms`);
      console.log(`  New hesitation baseline: ${result.baselines.hesitation_score_baseline}`);
      console.log(`  Total samples: ${result.sample_count}`);
      
      // Check if baseline is stable
      const isStable = result.sample_count >= 20;
      if (isStable) {
        console.log(`  ✓ Baseline STABLE (${result.sample_count} samples)`);
      } else {
        console.log(`  ⟳ Building baseline (${result.sample_count}/20)`);
      }
      console.log('');
    }

    return result;
  } catch (error) {
    console.error('Error updating baseline:', error);
    return null;
  }
}

/**
 * HELPER: Adjust risk level based on deviation
 */
function adjustRiskLevel(baseHesitation, deviations) {
  const totalScore = baseHesitation + (deviations.overall_deviation_score * 0.5);

  if (totalScore > 0.75) return 'CRITICAL';
  if (totalScore > 0.6) return 'HIGH';
  if (totalScore > 0.4) return 'MEDIUM';
  if (totalScore > 0.2) return 'LOW';
  return 'MINIMAL';
}

// ========================================
// COMPLETE WORKFLOW EXAMPLE
// ========================================

async function processTransactionWithBaselines(userId, transactionData, formInteractionData) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Transaction Processing: User ${userId}`);
  console.log(`${'='.repeat(60)}\n`);

  // STEP 1: Capture signals
  const signals = captureBehavioralSignals(formInteractionData);
  console.log('Captured signals:');
  console.log(`  - Confirmation time: ${signals.confirmation_delay_ms}ms`);
  console.log(`  - Amount edits: ${signals.amount_edit_count}`);
  console.log(`  - Hesitation time: ${signals.hesitation_time_ms}ms\n`);

  // STEP 2: Get baseline
  const baseline = await getUserBaseline(userId);

  // STEP 3: Calculate deviations
  const deviations = calculateFeatureDeviations(signals, baseline);
  if (baseline) {
    console.log('Feature deviations:');
    console.log(`  - Confirmation: ${(deviations.confirmation_time_deviation * 100).toFixed(0)}%`);
    console.log(`  - Edit count: ${(deviations.edit_count_deviation * 100).toFixed(0)}%`);
    console.log(`  - Hesitation: ${(deviations.hesitation_deviation * 100).toFixed(0)}%`);
    console.log(`  - Overall: ${(deviations.overall_deviation_score * 100).toFixed(0)}%\n`);
  }

  // STEP 4: Score transaction
  const riskScore = await scoreTransactionWithBaseline(userId, transactionData, signals);

  // STEP 5: Update baseline
  await updateBaselineAfterTransaction(userId, signals);

  return {
    signals,
    baseline,
    deviations,
    riskScore
  };
}

// ========================================
// EXPORT
// ========================================

module.exports = {
  captureBehavioralSignals,
  getUserBaseline,
  calculateFeatureDeviations,
  scoreTransactionWithBaseline,
  updateBaselineAfterTransaction,
  processTransactionWithBaselines,
  adjustRiskLevel
};
