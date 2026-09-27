// ============================================================================
// TEST EXAMPLES FOR FRAUD RISK ENGINE
// ============================================================================

const { computeRisk } = require('./fraud-risk-engine');

// Example 1: Low Risk Transaction
console.log('=== Example 1: Low Risk Transaction ===');
const lowRiskResult = computeRisk(
  {
    amount: 50,
    payee: 'john_doe',
    intent: 'payment',
    timestamp: '2025-01-15T14:30:00Z',
    payee_type: 'individual'
  },
  {
    maturity_days: 365,
    avg_amount: 45,
    known_payees: ['john_doe', 'jane_smith'],
    recent_txns_count_30m: 2,
    payee_relationship_type: 'friend'
  }
);
console.log(JSON.stringify(lowRiskResult, null, 2));

// Example 2: Medium Risk Transaction
console.log('\n=== Example 2: Medium Risk Transaction ===');
const mediumRiskResult = computeRisk(
  {
    amount: 500,
    payee: 'unknown_merchant',
    intent: 'payment',
    timestamp: '2025-01-15T23:45:00Z',
    payee_type: 'merchant'
  },
  {
    maturity_days: 30,
    avg_amount: 100,
    known_payees: ['john_doe'],
    recent_txns_count_30m: 4,
    payee_relationship_type: 'unknown'
  }
);
console.log(JSON.stringify(mediumRiskResult, null, 2));

// Example 3: High Risk Transaction
console.log('\n=== Example 3: High Risk Transaction ===');
const highRiskResult = computeRisk(
  {
    amount: 2000,
    payee: 'suspicious_account',
    intent: 'refund',
    timestamp: '2025-01-15T03:00:00Z',
    payee_type: 'individual'
  },
  {
    maturity_days: 3,
    avg_amount: 50,
    known_payees: [],
    recent_txns_count_30m: 8,
    payee_relationship_type: 'new'
  }
);
console.log(JSON.stringify(highRiskResult, null, 2));
