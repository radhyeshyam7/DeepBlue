/**
 * Validation Script for Isolation Forest Anomaly Scoring
 * 
 * Tests diverse transaction scenarios and validates score distribution
 * 
 * Usage: node scripts/validate-scoring.js
 */

require('dotenv').config();
const { loadModel } = require('../src/ml/training');
const { infer } = require('../src/ml/inferenceService');

/**
 * Test case definitions
 */
const testCases = [
  {
    name: 'Normal Transaction',
    description: 'Regular user, known payee, normal amount',
    features: {
      amount_ratio: 1.2,
      amount_zscore: 0.1,
      is_new_payee: 0,
      payee_trust_score: 0.8,
      payee_payment_count: 15,
      txn_frequency_recent: 1.0,
      velocity_spike: 0,
      time_deviation_score: 0.1,
      is_unusual_hour: 0,
      confirmation_time_ratio: 1.0,
      hesitation_score: 0.1,
      amount_edit_count_ratio: 1.0,
      intent_risk_score: 0.5,
      intent_direction_mismatch: 0,
      user_maturity_flag: 1, // REGULAR
      cooling_off_active: 0,
      recent_warning_ignored: 0,
      device_change_flag: 0,
      account_age_days: 180,
      transaction_count: 50
    },
    expectedRange: [0.05, 0.2], // Should be low (normal) - CALIBRATED
    expectedLabel: 'NORMAL'
  },
  {
    name: 'New Payee, Normal Amount',
    description: 'Regular user trying new payee with normal amount',
    features: {
      amount_ratio: 1.1,
      amount_zscore: 0.05,
      is_new_payee: 1, // NEW PAYEE
      payee_trust_score: 0.0,
      payee_payment_count: 0,
      txn_frequency_recent: 1.2,
      velocity_spike: 0,
      time_deviation_score: 0.15,
      is_unusual_hour: 0,
      confirmation_time_ratio: 1.1,
      hesitation_score: 0.15,
      amount_edit_count_ratio: 1.2,
      intent_risk_score: 0.5,
      intent_direction_mismatch: 0,
      user_maturity_flag: 1, // REGULAR
      cooling_off_active: 0,
      recent_warning_ignored: 0,
      device_change_flag: 0,
      account_age_days: 150,
      transaction_count: 40
    },
    expectedRange: [0.25, 0.4], // Should be moderate (suspicious) - CALIBRATED
    expectedLabel: 'SUSPICIOUS'
  },
  {
    name: 'New Payee, High Amount',
    description: 'New user with new payee and large amount',
    features: {
      amount_ratio: 5.0, // HIGH AMOUNT
      amount_zscore: 3.5,
      is_new_payee: 1, // NEW PAYEE
      payee_trust_score: 0.0,
      payee_payment_count: 0,
      txn_frequency_recent: 0.5,
      velocity_spike: 0,
      time_deviation_score: 0.3,
      is_unusual_hour: 0,
      confirmation_time_ratio: 1.5,
      hesitation_score: 0.3,
      amount_edit_count_ratio: 2.0,
      intent_risk_score: 0.5,
      intent_direction_mismatch: 0,
      user_maturity_flag: 0, // NEW USER
      cooling_off_active: 0,
      recent_warning_ignored: 0,
      device_change_flag: 0,
      account_age_days: 5,
      transaction_count: 2
    },
    expectedRange: [0.6, 0.75], // Should be high (anomalous) - CALIBRATED
    expectedLabel: 'ANOMALOUS'
  },
  {
    name: 'High Velocity Burst',
    description: 'Multiple rapid transactions (velocity spike)',
    features: {
      amount_ratio: 1.5,
      amount_zscore: 0.5,
      is_new_payee: 0,
      payee_trust_score: 0.7,
      payee_payment_count: 8,
      txn_frequency_recent: 8.0, // HIGH FREQUENCY
      velocity_spike: 1, // VELOCITY SPIKE
      time_deviation_score: 0.2,
      is_unusual_hour: 0,
      confirmation_time_ratio: 0.8, // Fast (suspicious)
      hesitation_score: 0.1,
      amount_edit_count_ratio: 0.9,
      intent_risk_score: 0.5,
      intent_direction_mismatch: 0,
      user_maturity_flag: 1,
      cooling_off_active: 0,
      recent_warning_ignored: 0,
      device_change_flag: 0,
      account_age_days: 100,
      transaction_count: 30
    },
    expectedRange: [0.4, 0.6], // Should be moderate-high - CALIBRATED
    expectedLabel: 'SUSPICIOUS'
  },
  {
    name: 'Intent Mismatch at Night',
    description: 'Unusual transaction pattern: large purchase at night',
    features: {
      amount_ratio: 4.0,
      amount_zscore: 2.5,
      is_new_payee: 1,
      payee_trust_score: 0.2,
      payee_payment_count: 1,
      txn_frequency_recent: 0.3,
      velocity_spike: 0,
      time_deviation_score: 0.8, // HIGH TIME DEVIATION
      is_unusual_hour: 1, // UNUSUAL HOUR
      confirmation_time_ratio: 2.5,
      hesitation_score: 0.6, // HIGH HESITATION
      amount_edit_count_ratio: 4.0, // MANY EDITS
      intent_risk_score: 0.7,
      intent_direction_mismatch: 1, // MISMATCH
      user_maturity_flag: 0,
      cooling_off_active: 0,
      recent_warning_ignored: 0,
      device_change_flag: 0,
      account_age_days: 10,
      transaction_count: 3
    },
    expectedRange: [0.7, 0.85], // Should be very high (highly anomalous) - CALIBRATED
    expectedLabel: 'HIGHLY ANOMALOUS'
  },
  {
    name: 'Extreme Anomaly',
    description: 'All red flags: new user, new payee, huge amount, high hesitation, night time',
    features: {
      amount_ratio: 10.0, // EXTREME
      amount_zscore: 8.0,
      is_new_payee: 1,
      payee_trust_score: 0.0,
      payee_payment_count: 0,
      txn_frequency_recent: 0.1,
      velocity_spike: 1,
      time_deviation_score: 1.0, // MAXIMUM
      is_unusual_hour: 1,
      confirmation_time_ratio: 5.0, // VERY SLOW
      hesitation_score: 1.0, // MAXIMUM HESITATION
      amount_edit_count_ratio: 10.0, // MANY EDITS
      intent_risk_score: 0.9,
      intent_direction_mismatch: 1,
      user_maturity_flag: 0,
      cooling_off_active: 1,
      recent_warning_ignored: 1,
      device_change_flag: 0,
      account_age_days: 1,
      transaction_count: 1
    },
    expectedRange: [0.85, 1.0], // Should be very high - CALIBRATED
    expectedLabel: 'EXTREME ANOMALY'
  }
];

/**
 * Run validation tests
 */
async function runValidation() {
  console.log('🧪 Isolation Forest Anomaly Scoring Validation');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Load model
    console.log('📦 Loading model...');
    const { model, featureNames } = await loadModel();
    console.log(`✅ Model loaded: ${model.nEstimators} trees, sample size: ${model.trainingSampleSize}`);
    console.log(`📊 Calibration constant c(n): ${model.c_n?.toFixed(4) || 'N/A'}`);
    console.log('');

    // Test each case
    const results = [];
    
    for (const testCase of testCases) {
      console.log(`\n🔍 Test: ${testCase.name}`);
      console.log(`   ${testCase.description}`);
      
      try {
        const result = await infer(testCase.features);
        const score = result.anomaly_score;
        
        // Check if score is in expected range
        const inRange = score >= testCase.expectedRange[0] && score <= testCase.expectedRange[1];
        const status = inRange ? '✅' : '⚠️';
        
        console.log(`   Score: ${score.toFixed(4)} (expected: ${testCase.expectedRange[0]}-${testCase.expectedRange[1]}) ${status}`);
        console.log(`   Label: ${testCase.expectedLabel}`);
        console.log(`   Top Features: ${result.top_contributing_features.join(', ')}`);
        
        results.push({
          name: testCase.name,
          score,
          expectedRange: testCase.expectedRange,
          inRange,
          topFeatures: result.top_contributing_features
        });
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        results.push({
          name: testCase.name,
          error: error.message
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    const scores = results.filter(r => r.score !== undefined).map(r => r.score);
    const inRangeCount = results.filter(r => r.inRange === true).length;
    const totalTests = results.filter(r => r.score !== undefined).length;
    
    console.log(`\n✅ Tests Passed: ${inRangeCount}/${totalTests}`);
    console.log(`📈 Score Range: ${Math.min(...scores).toFixed(4)} - ${Math.max(...scores).toFixed(4)}`);
    console.log(`📊 Score Spread: ${(Math.max(...scores) - Math.min(...scores)).toFixed(4)}`);
    console.log(`📉 Mean Score: ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(4)}`);
    
    // Show score distribution
    console.log('\n📋 Score Distribution:');
    results.forEach(r => {
      if (r.score !== undefined) {
        const bar = '█'.repeat(Math.floor(r.score * 20));
        console.log(`   ${r.name.padEnd(30)} ${r.score.toFixed(4)} ${bar}`);
      }
    });
    
    // Expected output example (CALIBRATED)
    console.log('\n🎯 Expected Score Spread (CALIBRATED):');
    console.log('   Normal:        0.05 - 0.20');
    console.log('   Suspicious:    0.25 - 0.40');
    console.log('   Anomalous:     0.60 - 0.75');
    console.log('   Highly Anom:   0.70 - 0.85');
    console.log('   Extreme:       0.85 - 1.00');
    
    // Validation result
    const allInRange = inRangeCount === totalTests;
    const hasSpread = (Math.max(...scores) - Math.min(...scores)) > 0.3;
    
    console.log('\n' + '='.repeat(60));
    if (allInRange && hasSpread) {
      console.log('✅ VALIDATION PASSED: Scores are meaningful and properly distributed');
    } else {
      console.log('⚠️  VALIDATION WARNING:');
      if (!allInRange) {
        console.log('   - Some scores outside expected ranges');
      }
      if (!hasSpread) {
        console.log('   - Score spread too narrow (< 0.3)');
      }
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation
runValidation();
