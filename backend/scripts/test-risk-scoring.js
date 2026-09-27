/**
 * Test Risk Scoring
 * 
 * Quick test to verify risk scoring is working correctly for large amounts
 */

const mongoose = require('mongoose');
const { calculateRiskLevel } = require('../src/services/riskEngine');

async function testRiskScoring() {
  try {
    await mongoose.connect('mongodb://localhost:27017/upi_fraud_prevention');
    console.log('✅ Connected to MongoDB\n');

    // Test Case 1: ₹10,000 to new payee (should be HIGH risk, 60%+)
    console.log('📊 Test Case 1: ₹10,000 to new payee');
    console.log('Expected: HIGH risk (60%+)\n');
    
    const result1 = await calculateRiskLevel({
      user_id: 'kalp_1770736205188',
      amount: 10000,
      payee_id: 'newpayee@upi',
      intent_type: 'purchase',
      behavioral_signals: {
        amount_edit_count: 1
      }
    });

    console.log(`\n✅ Result:`);
    console.log(`   Risk Level: ${result1.risk_level}`);
    console.log(`   Risk Score: ${result1.risk_score}/10 (${result1.risk_score * 10}%)`);
    console.log(`   Action: ${result1.action}`);
    console.log(`   Composite Score: ${result1.composite_score?.toFixed(3)}`);
    console.log(`   Rule Score: ${result1.rule_score?.toFixed(3)}`);
    console.log(`   ML Score: ${result1.ml_anomaly_score?.toFixed(3)} (weight: ${result1.ml_weight})`);
    console.log(`   Category Scores:`, result1.category_scores);
    console.log(`   Reason Codes:`, result1.reason_codes);

    // Verify expectations
    if (result1.risk_level === 'HIGH' && result1.risk_score >= 6) {
      console.log('\n✅ TEST PASSED: ₹10,000 correctly shows HIGH risk (60%+)');
    } else {
      console.log(`\n❌ TEST FAILED: Expected HIGH risk (60%+), got ${result1.risk_level} (${result1.risk_score * 10}%)`);
    }

    // Test Case 2: ₹100 to new payee (should be MEDIUM risk, 30-40%)
    console.log('\n\n📊 Test Case 2: ₹100 to new payee');
    console.log('Expected: MEDIUM risk (30-40%)\n');
    
    const result2 = await calculateRiskLevel({
      user_id: 'kalp_1770736205188',
      amount: 100,
      payee_id: 'anothernew@upi',
      intent_type: 'purchase',
      behavioral_signals: {
        amount_edit_count: 1
      }
    });

    console.log(`\n✅ Result:`);
    console.log(`   Risk Level: ${result2.risk_level}`);
    console.log(`   Risk Score: ${result2.risk_score}/10 (${result2.risk_score * 10}%)`);
    console.log(`   Action: ${result2.action}`);

    if (result2.risk_level === 'MEDIUM' && result2.risk_score >= 3 && result2.risk_score <= 4) {
      console.log('\n✅ TEST PASSED: ₹100 correctly shows MEDIUM risk (30-40%)');
    } else {
      console.log(`\n⚠️ TEST WARNING: Expected MEDIUM risk (30-40%), got ${result2.risk_level} (${result2.risk_score * 10}%)`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testRiskScoring();
