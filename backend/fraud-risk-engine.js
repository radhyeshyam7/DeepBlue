// ============================================================================
// PHASE-1 FRAUD RISK DECISIONING ENGINE
// Pure synchronous feature extraction + rule evaluation + risk mapping
// ============================================================================

// Configuration
const CONFIG = {
  MEDIUM_THRESHOLD: 20,
  HIGH_THRESHOLD: 40,
  AMOUNT_SPIKE_MULTIPLIER: 3,
  VELOCITY_HIGH_THRESHOLD: 5,
  NIGHT_HOURS: { start: 0, end: 6 },
  OFF_HOURS: { start: 22, end: 24 },
  MORNING_HOURS: { start: 6, end: 12 },
  EVENING_HOURS: { start: 18, end: 22 }
};

// ============================================================================
// DELIVERABLE 1: FEATURE VECTOR GENERATOR
// ============================================================================

function buildFeatureVector(transaction, userProfile) {
  const knownPayees = userProfile.known_payees || [];
  const isNewPayee = !knownPayees.includes(transaction.payee);
  
  const amountSpikeFactor = userProfile.avg_amount > 0 
    ? transaction.amount / userProfile.avg_amount 
    : 0;
  
  const intentMismatch = detectIntentMismatch(
    transaction.intent, 
    transaction.payee_type
  );
  
  const timeBucket = categorizeTimeBucket(transaction.timestamp);
  
  const velocity30m = userProfile.recent_txns_count_30m || 0;
  
  const userMaturityDays = userProfile.maturity_days || 0;
  
  const payeeRelationshipScore = calculateRelationshipScore(
    userProfile.payee_relationship_type
  );
  
  const txnType = categorizeTxnType(transaction.payee_type);
  
  return {
    is_new_payee: isNewPayee,
    amount_spike_factor: amountSpikeFactor,
    intent_mismatch: intentMismatch,
    time_bucket: timeBucket,
    velocity_30m: velocity30m,
    user_maturity_days: userMaturityDays,
    payee_relationship_score: payeeRelationshipScore,
    txn_type: txnType
  };
}

function detectIntentMismatch(intent, payeeType) {
  const intentMap = {
    'refund': ['merchant', 'business'],
    'payment': ['merchant', 'business', 'individual'],
    'transfer': ['individual', 'self'],
    'bill': ['merchant', 'business']
  };
  
  const expectedTypes = intentMap[intent?.toLowerCase()] || [];
  return expectedTypes.length > 0 && !expectedTypes.includes(payeeType);
}

function categorizeTimeBucket(timestamp) {
  const date = new Date(timestamp);
  const hour = date.getHours();
  
  if (hour >= CONFIG.NIGHT_HOURS.start && hour < CONFIG.NIGHT_HOURS.end) {
    return 'night';
  }
  if (hour >= CONFIG.OFF_HOURS.start || hour < CONFIG.NIGHT_HOURS.end) {
    return 'off_hours';
  }
  if (hour >= CONFIG.MORNING_HOURS.start && hour < CONFIG.MORNING_HOURS.end) {
    return 'morning';
  }
  if (hour >= CONFIG.EVENING_HOURS.start && hour < CONFIG.OFF_HOURS.start) {
    return 'evening';
  }
  return 'off_hours';
}

function calculateRelationshipScore(relationshipType) {
  const scoreMap = {
    'self': 0,
    'family': 2,
    'friend': 5,
    'known': 8,
    'unknown': 15,
    'new': 20
  };
  return scoreMap[relationshipType?.toLowerCase()] || 10;
}

function categorizeTxnType(payeeType) {
  const typeMap = {
    'individual': 'p2p',
    'merchant': 'merchant',
    'business': 'merchant',
    'self': 'transfer',
    'refund': 'refund'
  };
  return typeMap[payeeType?.toLowerCase()] || 'p2p';
}

// ============================================================================
// DELIVERABLE 2: RULE AMPLIFIER FUNCTIONS
// ============================================================================

function isNewPayee(featureVector) {
  const flag = featureVector.is_new_payee;
  const score = flag ? 10 : 0;
  const reason = flag ? 'new_payee_detected' : 'known_payee';
  
  return { flag, score, reason };
}

function isAmountSpike(featureVector) {
  const flag = featureVector.amount_spike_factor >= CONFIG.AMOUNT_SPIKE_MULTIPLIER;
  const score = flag ? 15 : 0;
  const reason = flag ? 'amount_spike_detected' : 'normal_amount';
  
  return { flag, score, reason };
}

function isIntentMismatch(featureVector) {
  const flag = featureVector.intent_mismatch;
  const score = flag ? 12 : 0;
  const reason = flag ? 'intent_mismatch_detected' : 'intent_aligned';
  
  return { flag, score, reason };
}

function isUnusualHour(featureVector) {
  const flag = featureVector.time_bucket === 'night' || 
                featureVector.time_bucket === 'off_hours';
  const score = flag ? 8 : 0;
  const reason = flag ? 'unusual_hour_detected' : 'normal_hour';
  
  return { flag, score, reason };
}

function isHighVelocity(featureVector) {
  const flag = featureVector.velocity_30m >= CONFIG.VELOCITY_HIGH_THRESHOLD;
  const score = flag ? 18 : 0;
  const reason = flag ? 'high_velocity_detected' : 'normal_velocity';
  
  return { flag, score, reason };
}

function isNewUser(featureVector) {
  const flag = featureVector.user_maturity_days < 7;
  const score = flag ? 10 : 0;
  const reason = flag ? 'new_user_account' : 'mature_user';
  
  return { flag, score, reason };
}

function isRiskyRelationship(featureVector) {
  const flag = featureVector.payee_relationship_score >= 15;
  const score = flag ? featureVector.payee_relationship_score : 0;
  const reason = flag ? 'risky_payee_relationship' : 'trusted_relationship';
  
  return { flag, score, reason };
}

// ============================================================================
// DELIVERABLE 3: RISK SIGNAL MAPPER
// ============================================================================

function mapRiskSignal(ruleOutputs) {
  const aggregateScore = ruleOutputs.reduce((sum, rule) => sum + rule.score, 0);
  
  const reasons = ruleOutputs
    .filter(rule => rule.flag)
    .map(rule => rule.reason);
  
  let riskLevel = 'LOW';
  
  if (aggregateScore >= CONFIG.HIGH_THRESHOLD) {
    riskLevel = 'HIGH';
  } else if (aggregateScore >= CONFIG.MEDIUM_THRESHOLD) {
    riskLevel = 'MEDIUM';
  }
  
  return {
    risk_level: riskLevel,
    reasons: reasons,
    aggregate_score: aggregateScore
  };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

function computeRisk(transaction, userProfile) {
  const features = buildFeatureVector(transaction, userProfile);
  
  const rules = [
    isNewPayee(features),
    isAmountSpike(features),
    isIntentMismatch(features),
    isUnusualHour(features),
    isHighVelocity(features),
    isNewUser(features),
    isRiskyRelationship(features)
  ];
  
  const risk = mapRiskSignal(rules);
  
  return {
    features,
    rules,
    risk
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  computeRisk,
  CONFIG,
  // Exposed for testing/debugging
  buildFeatureVector,
  isNewPayee,
  isAmountSpike,
  isIntentMismatch,
  isUnusualHour,
  isHighVelocity,
  isNewUser,
  isRiskyRelationship,
  mapRiskSignal
};
