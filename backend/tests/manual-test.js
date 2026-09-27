/**
 * Manual Test Script
 * 
 * Run this script to manually test the API endpoints
 * Make sure the server is running: npm start
 * 
 * Usage: node tests/manual-test.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Manual Tests\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Health Check
    console.log('\n1️⃣  Testing Health Check...');
    const health = await makeRequest('GET', '/health');
    console.log('Status:', health.status);
    console.log('Response:', JSON.stringify(health.data, null, 2));
    if (health.status === 200 && health.data.status === 'OK') {
      console.log('✅ Health check passed\n');
    } else {
      console.log('❌ Health check failed\n');
    }

    // Test 2: Submit Transaction Intent (High Risk)
    console.log('2️⃣  Testing Transaction Intent (High Risk)...');
    const intentData = {
      user_id: 'manual_test_user_' + Date.now(),
      amount: 50000,
      payee_id: 'unknown_payee',
      intent_type: 'purchase',
      behavioral_signals: {
        hesitation_time_ms: 4000,
        amount_edit_count: 5,
        confirmation_delay_ms: 6000
      }
    };
    const intent = await makeRequest('POST', '/transaction/intent', intentData);
    console.log('Status:', intent.status);
    console.log('Response:', JSON.stringify(intent.data, null, 2));
    
    if (intent.status === 200 && intent.data.transaction_id) {
      console.log('✅ Transaction intent created\n');
      const transactionId = intent.data.transaction_id;

      // Test 3: Get Risk Decision
      console.log('3️⃣  Testing Risk Decision...');
      const decision = await makeRequest('POST', '/transaction/decision', {
        transaction_id: transactionId
      });
      console.log('Status:', decision.status);
      console.log('Response:', JSON.stringify(decision.data, null, 2));
      
      if (decision.status === 200 && decision.data.risk_level) {
        console.log('✅ Risk decision retrieved\n');
        console.log(`   Risk Level: ${decision.data.risk_level}`);
        console.log(`   Action: ${decision.data.action}`);
        console.log(`   Reason Codes: ${decision.data.reason_codes.join(', ') || 'None'}\n`);

        // Test 4: Submit Feedback
        console.log('4️⃣  Testing User Feedback...');
        const feedback = await makeRequest('POST', '/transaction/feedback', {
          transaction_id: transactionId,
          user_action: 'PROCEEDED'
        });
        console.log('Status:', feedback.status);
        console.log('Response:', JSON.stringify(feedback.data, null, 2));
        
        if (feedback.status === 200 && feedback.data.status === 'ACKNOWLEDGED') {
          console.log('✅ Feedback submitted\n');
        } else {
          console.log('❌ Feedback submission failed\n');
        }
      } else {
        console.log('❌ Risk decision failed\n');
      }
    } else {
      console.log('❌ Transaction intent failed\n');
    }

    // Test 5: Low Risk Transaction
    console.log('5️⃣  Testing Low Risk Transaction...');
    const lowRiskData = {
      user_id: 'low_risk_user_' + Date.now(),
      amount: 500,
      payee_id: 'known_payee',
      intent_type: 'purchase'
    };
    const lowRiskIntent = await makeRequest('POST', '/transaction/intent', lowRiskData);
    console.log('Status:', lowRiskIntent.status);
    
    if (lowRiskIntent.status === 200) {
      const lowRiskDecision = await makeRequest('POST', '/transaction/decision', {
        transaction_id: lowRiskIntent.data.transaction_id
      });
      console.log('Risk Level:', lowRiskDecision.data.risk_level);
      console.log('Action:', lowRiskDecision.data.action);
      console.log('✅ Low risk transaction test completed\n');
    }

    // Test 6: Error Handling - Missing Fields
    console.log('6️⃣  Testing Error Handling (Missing Fields)...');
    const errorTest = await makeRequest('POST', '/transaction/intent', {
      user_id: 'test',
      amount: 1000
      // Missing payee_id and intent_type
    });
    console.log('Status:', errorTest.status);
    console.log('Response:', JSON.stringify(errorTest.data, null, 2));
    
    if (errorTest.status === 400) {
      console.log('✅ Error handling works correctly\n');
    } else {
      console.log('❌ Error handling test failed\n');
    }

    console.log('='.repeat(50));
    console.log('\n✨ Manual tests completed!\n');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error('\nMake sure the server is running: npm start');
    process.exit(1);
  }
}

// Run tests
runTests();
