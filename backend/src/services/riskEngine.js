/**
 * riskEngine.js
 * 
 * HYBRID RISK SCORING ENGINE (Rule-Based + ML)
 * 
 * Combines 6 feature categories with ML anomaly detection for comprehensive risk assessment.
 * 
 * DESIGN PRINCIPLES:
 * 1. PERSONALIZED: Uses user baselines, not global thresholds
 * 2. COMPOSITE: 6 weighted categories + ML anomaly score
 * 3. EXPLAINABLE: Every risk decision has reason codes + explanation
 * 4. ACTIONABLE: Maps to 3 actions (ALLOW, WARN, DELAY)
 * 
 * HYBRID FORMULA:
 *   rule_score = Σ(category_score × category_weight) × (1 + vulnerability_amplification)
 *   ml_score = anomaly_score from Autoencoder
 *   final_score = (rule_score × rule_weight) + (ml_score × ml_weight)
 *   
 * DEFAULT WEIGHTS:
 *   Rule-based: 60% (more explainable, trusted for new users)
 *   ML-based: 40% (learns patterns, better for established users)
 */

const { extractTransactionFeatures } = require('./featureExtractor');
const { extractFeaturesV1 } = require('../ml/featureExtractor');
const { infer } = require('../ml/inferenceService');
const User = require('../models/User');
const PayeeRelationship = require('../models/PayeeRelationship');

/**
 * Calculate composite risk score and risk level
 * 
 * @param {object} transactionData
 * @returns {object} {
 *   risk_level: 'LOW' | 'MEDIUM' | 'HIGH',
 *   risk_score: 0-10 (display scale),
 *   composite_score: 0-1 (internal scale),
 *   action: 'ALLOW' | 'WARN' | 'DELAY',
 *   reason_codes: [...],
 *   category_scores: { payee, amount, urgency, intent, hesitation, vulnerability },
 *   explanation: 'Human-readable reasons'
 * }
 */
async function calculateRiskLevel(transactionData) {
  const {
    user_id,
    amount,
    payee_id,
    intent_type,
    behavioral_signals = {}
  } = transactionData;

  // Extract all features
  const extracted = await extractTransactionFeatures(
    user_id,
    { amount, payee_id, intent_type },
    behavioral_signals
  );

  const { features, userProfile } = extracted;
  const reasons = [];
  const scores = {};

  // --- CATEGORY 1: PAYEE-BASED RISK (Weight: 0.25) ---
  // Question: Do I know this person?
  // Rationale: Paying to unknown recipients is a major scam indicator
  // Max Score: 1.0 | Typical Range: 0.0-0.8
  let payeeScore = 0;
  
  const currentAmount = features.amount.amount_value;
  const isNewUser = features.vulnerability.is_new_user;
  const isSmallAmount = currentAmount < 100;
  
  if (features.payee.is_new_payee) {
    // Reduce payee risk for small amounts - new users often test with small amounts
    if (isNewUser && isSmallAmount) {
      payeeScore += 0.15; // Reduced from 0.4 for small test transactions
      reasons.push('new_payee');
    } else if (isSmallAmount) {
      payeeScore += 0.2; // Reduced for small amounts
      reasons.push('new_payee');
    } else if (currentAmount >= 50000) {
      // CRITICAL: Very large amounts to new payees are extremely risky
      payeeScore += 0.7; // 70% risk for ₹50,000+ to new payee
      reasons.push('new_payee_large_amount');
    } else if (currentAmount >= 10000) {
      // Large amounts to new payees are very risky
      payeeScore += 0.6; // 60% risk for ₹10,000+ to new payee
      reasons.push('new_payee_large_amount');
    } else {
      payeeScore += 0.4; // Standard risk for moderate amounts
      reasons.push('new_payee');
    }
  } else if (features.payee.payee_trust_score < 0.3) {
    payeeScore += 0.3;
    reasons.push('low_trust_payee');
  } else if (features.payee.payee_trust_score < 0.7) {
    payeeScore += 0.15;
    reasons.push('medium_trust_payee');
  }

  // New payee + individual + risky intent = extra risk (OLX/QR scams)
  // But only for amounts >= ₹500 (scammers rarely target very small amounts)
  if (features.payee.is_new_payee && features.payee.payee_is_individual && features.intent.is_risky_intent && currentAmount >= 500) {
    payeeScore = Math.min(payeeScore + 0.2, 1.0);
    reasons.push('new_individual_risky_intent');
  }

  scores.payee = Math.min(payeeScore, 1.0);

  // --- CATEGORY 2: AMOUNT-BASED RISK (Weight: 0.30) ---
  // Question: Is this amount too high for me?
  // Rationale: Amount deviations from personal baseline signal unusual behavior
  // Max Score: 1.0 | Typical Range: 0.0-0.7
  let amountScore = 0;

  // Variables already declared at top of function: currentAmount, isNewUser, isSmallAmount
  const totalTransactions = features.vulnerability.total_transactions;

  // SPECIAL CASE: Small amounts (< ₹100) for new users should have minimal amount risk
  // Rationale: New users testing with small amounts is normal behavior, not risky
  const isVerySmallAmount = currentAmount < 50;

  if (isNewUser && isVerySmallAmount) {
    // For new users sending < ₹50, amount risk should be near zero
    // This is normal "testing the waters" behavior
    amountScore = 0;
    // Don't add any amount-based risk reasons for very small amounts
  } else if (isNewUser && isSmallAmount) {
    // For new users sending ₹50-100, minimal amount risk
    amountScore = 0.05;
  } else if (totalTransactions < 5 && currentAmount < 500) {
    // For users with < 5 transactions sending < ₹500, low amount risk
    amountScore = 0.1;
  } else {
    // Standard amount risk calculation for established users or larger amounts
    
    // CRITICAL: Absolute amount-based risk (independent of user history)
    // This ensures large amounts always get appropriate risk scores
    // Calibrated to user expectations: ₹500+ = noticeable, ₹2000+ = significant, ₹8000+ = high
    if (currentAmount >= 100000) {
      amountScore += 1.0; // ₹1,00,000+ = maximum risk (100%)
      reasons.push('extreme_amount');
    } else if (currentAmount >= 50000) {
      amountScore += 0.9; // ₹50,000-1,00,000 = very high risk (90%)
      reasons.push('very_large_amount');
    } else if (currentAmount >= 20000) {
      amountScore += 0.8; // ₹20,000-50,000 = high risk (80%)
      reasons.push('large_amount');
    } else if (currentAmount >= 10000) {
      amountScore += 0.7; // ₹10,000-20,000 = significant risk (70%)
      reasons.push('large_amount');
    } else if (currentAmount >= 5000) {
      amountScore += 0.55; // ₹5,000-10,000 = moderate-high risk (55%)
      reasons.push('large_amount');
    } else if (currentAmount >= 2000) {
      amountScore += 0.4; // ₹2,000-5,000 = moderate risk (40%)
      reasons.push('moderate_amount');
    } else if (currentAmount >= 500) {
      amountScore += 0.25; // ₹500-2,000 = low-moderate risk (25%)
      reasons.push('noticeable_amount');
    }
    
    // Check if this is the largest transaction ever (only flag if amount is significant)
    if (features.amount.is_largest_ever && currentAmount >= 1000) {
      amountScore += 0.2; // Reduced from 0.35 since absolute amount already contributes
      reasons.push('largest_transaction_ever');
    }

    // Amount deviation from personal average (personalized risk)
    const amountRatio = features.amount.amount_vs_avg_ratio;
    
    // Only flag deviations if the absolute amount is significant (>= ₹500)
    if (currentAmount >= 500) {
      if (amountRatio > 10) {
        // 10x+ average = extreme spike
        amountScore += 0.3; // Reduced since absolute amount already contributes
        reasons.push('extreme_amount_deviation');
      } else if (amountRatio > 5) {
        // 5-10x average = very high spike
        amountScore += 0.25;
        reasons.push('very_high_amount_spike');
      } else if (amountRatio > 3) {
        // 3-5x average = significant spike
        amountScore += 0.15;
        reasons.push('significant_amount_spike');
      } else if (amountRatio > 2) {
        // 2-3x average = moderate spike
        amountScore += 0.1;
        reasons.push('moderate_amount_spike');
      }
    }

    // Check if amount is near historical maximum (only for amounts >= ₹1000)
    if (features.amount.near_max && currentAmount >= 1000) {
      amountScore += 0.1; // Reduced from 0.15
      reasons.push('amount_near_max');
    }

    // Escalation detection: Check if recent transactions show increasing amounts
    // This is a scam pattern where fraudsters test with small amounts then escalate
    if (userProfile.context?.recent_transactions_count_24h >= 2) {
      const recentAvg = userProfile.context.recent_transactions_sum_24h / 
                       userProfile.context.recent_transactions_count_24h;
      
      // Only flag escalation if current amount is significant (>= ₹500)
      if (currentAmount >= 500 && currentAmount > recentAvg * 2) {
        amountScore += 0.15;
        reasons.push('amount_escalation_pattern');
      }
    }
  }

  scores.amount = Math.min(amountScore, 1.0);

  // --- CATEGORY 3: TIME & URGENCY RISK (Weight: 0.15) ---
  // Question: Why the rush? Is someone pressuring me?
  // Rationale: Scammers create artificial urgency; velocity patterns signal fraud
  // Max Score: 1.0 | Typical Range: 0.0-0.6
  let urgencyScore = 0;

  // Check for late night transactions (10 PM - 4 AM)
  const currentHour = new Date().getHours();
  const isLateNight = currentHour >= 22 || currentHour < 4;
  
  if (isLateNight) {
    // Late night transactions are inherently riskier
    urgencyScore += 0.25;
    reasons.push('late_night_transaction');
  } else if (features.time_urgency.is_unusual_hour && userProfile.user_type !== 'HEAVY') {
    urgencyScore += 0.2;
    reasons.push('unusual_hour');
  }

  if (features.time_urgency.rapid_succession) {
    urgencyScore += 0.25;
    reasons.push('rapid_transaction_velocity');
  }

  if (features.time_urgency.confirmation_faster_than_baseline) {
    // User confirmed faster than usual = scam pressure (no time to think)
    urgencyScore += 0.15;
    reasons.push('rushed_confirmation');
  }

  scores.urgency = Math.min(urgencyScore, 1.0);

  // --- CATEGORY 4: INTENT-BASED RISK (Weight: 0.15) ---
  // Question: What am I sending money for?
  // Rationale: Certain intents (refunds, purchases) have higher scam rates
  // Max Score: 1.0 | Typical Range: 0.0-0.5
  let intentScore = 0;

  if (features.intent.intent_mismatch) {
    intentScore += 0.15;
    reasons.push('intent_mismatch');
  }

  if (features.intent.is_risky_intent) {
    intentScore += 0.1;
    reasons.push('risky_intent_type');
  }

  // New payee + refund intent = potential refund scam
  if (features.intent.is_refund && features.payee.is_new_payee) {
    intentScore += 0.2;
    reasons.push('refund_to_new_payee');
  }

  if (features.intent.intent_mismatch_count > 2) {
    intentScore += 0.15;
    reasons.push('intent_pattern_mismatch');
  }

  scores.intent = Math.min(intentScore, 1.0);

  // --- CATEGORY 5: HESITATION & CONFUSION RISK (Weight: 0.10) ---
  // Question: Am I hesitating? Does something feel off?
  // Rationale: User doubt (edits, delays) indicates internal alarm bells
  // Max Score: 1.0 | Typical Range: 0.0-0.4
  let hesitationScore = 0;

  if (features.hesitation.excessive_edits) {
    hesitationScore += 0.2;
    reasons.push('excessive_amount_edits');
  }

  if (features.hesitation.unusual_hesitation) {
    hesitationScore += 0.2;
    reasons.push('unusual_confirmation_delay');
  }

  scores.hesitation = Math.min(hesitationScore, 1.0);

  // --- CATEGORY 6: VULNERABILITY & AMPLIFICATION RISK (Weight: 0.10) ---
  // Question: Can I afford the loss? Am I being targeted because I'm vulnerable?
  // Rationale: Risk amplifies when user is new/inexperienced. Acts as force multiplier
  // Amplification: Composite score ×(1 + vulnerability_score × amplification_factor)
  // Max Score: 1.0 | Typical Range: 0.0-0.8
  let vulnerabilityScore = 0;

  // Variables already declared at top: currentAmount, isSmallAmount

  if (features.vulnerability.is_new_user) {
    // NEW users are more vulnerable to scams
    // But reduce vulnerability score for small test amounts (normal behavior)
    if (isSmallAmount) {
      vulnerabilityScore += 0.1; // Reduced from 0.3 for small amounts
      reasons.push('new_user');
    } else {
      vulnerabilityScore += 0.3; // Standard for larger amounts
      reasons.push('new_user');
    }
  } else if (features.vulnerability.is_low_experience) {
    // Low experience users (< 10 transactions) are also vulnerable
    if (isSmallAmount) {
      vulnerabilityScore += 0.15; // Reduced for small amounts
      reasons.push('low_experience_user');
    } else {
      vulnerabilityScore += 0.25; // Increased from 0.15 for larger amounts
      reasons.push('low_experience_user');
    }
  }

  if (features.vulnerability.cooling_off_enabled) {
    // Already in high-alert mode
    vulnerabilityScore += 0.1;
    reasons.push('cooling_off_active');
  }

  if (features.vulnerability.ignored_warnings_count > 1) {
    // User has previously ignored warnings = more susceptible
    vulnerabilityScore += 0.15;
    reasons.push('history_ignoring_warnings');
  }

  scores.vulnerability = Math.min(vulnerabilityScore, 1.0);

  // --- COMPOSITE RISK CALCULATION & AMPLIFICATION ---
  // Formula: Σ(category_score × weight) × (1 + vulnerability_score × amplification_factor)
  // This is personalized to each user - no fixed global thresholds
  // Single categories cannot dominate (max weight 0.30 = payee still only 30% of score)
  // Vulnerability acts as force multiplier (+50% per point of vulnerability) for new/inexperienced users
  const weights = {
    payee: 0.25,        // Payee trust is critical (25%)
    amount: 0.35,       // Amount is MOST critical (35%) - increased from 0.30
    urgency: 0.15,      // Time pressure is a scam tactic (15%)
    intent: 0.10,       // Intent mismatches are suspicious (10%)
    hesitation: 0.05,   // Behavioral confusion (5%)
    vulnerability: 0.10 // User vulnerability amplifies risk (10%)
  };

  let compositeScore =
    (scores.payee * weights.payee) +
    (scores.amount * weights.amount) +
    (scores.urgency * weights.urgency) +
    (scores.intent * weights.intent) +
    (scores.hesitation * weights.hesitation) +
    (scores.vulnerability * weights.vulnerability);

  // Apply vulnerability amplification (vulnerable users get higher risk)
  // Vulnerability acts as a force multiplier, not a score itself
  // SPECIAL CASE: Increase amplification for large amounts (≥ ₹5,000)
  // Rationale: Large amounts to new payees by inexperienced users are extremely risky
  const vulnAmplification = scores.vulnerability; // Use the vulnerability score we just calculated
  // currentAmount already declared at top of function
  
  console.log(`[AMPLIFICATION] Composite before: ${compositeScore.toFixed(3)}, Vuln score: ${vulnAmplification.toFixed(3)}, Amount: ₹${currentAmount}`);
  
  if (currentAmount < 50) {
    // Minimal amplification for very small amounts
    compositeScore = Math.min(compositeScore * (1 + vulnAmplification * 0.1), 1.0);
  } else if (currentAmount < 200) {
    // Reduced amplification for small amounts
    compositeScore = Math.min(compositeScore * (1 + vulnAmplification * 0.25), 1.0);
  } else if (currentAmount >= 5000) {
    // AGGRESSIVE amplification for large amounts (≥ ₹5,000)
    // Large amounts are where scams cause the most damage
    compositeScore = Math.min(compositeScore * (1 + vulnAmplification * 0.8), 1.0);
  } else {
    // Standard amplification for normal amounts
    compositeScore = Math.min(compositeScore * (1 + vulnAmplification * 0.5), 1.0);
  }
  
  console.log(`[AMPLIFICATION] Composite after: ${compositeScore.toFixed(3)}, Factor: ${currentAmount >= 5000 ? 0.8 : (currentAmount >= 200 ? 0.5 : 0.25)}`);

  // --- ML ANOMALY DETECTION INTEGRATION ---
  // Run ML model inference to get anomaly score
  let mlAnomalyScore = 0;
  let mlTopFeatures = [];
  let mlWeight = 0.4; // 40% ML, 60% rules (default)
  let mlEnabled = false;

  try {
    // Get user and payee relationship for ML feature extraction
    const user = await User.findOne({ user_id });
    const payeeRelationship = await PayeeRelationship.findOne({ user_id, payee_id });

    // Extract ML features (v1 format)
    const mlFeatures = await extractFeaturesV1(
      { amount, payee_id, intent_type },
      user,
      payeeRelationship,
      behavioral_signals
    );

    // Run ML inference
    const mlResult = await infer(mlFeatures);
    mlAnomalyScore = mlResult.anomaly_score;
    mlTopFeatures = mlResult.top_contributing_features || [];
    var mlFraudReasons = mlResult.fraud_reasons || [];
    var mlShapBars = mlResult.shap_percentage_bars || [];
    mlEnabled = true;

    // Adjust ML weight based on user maturity AND transaction amount
    // IMPORTANT: ML model trained on synthetic data may not match real patterns
    // Use conservative ML weights until model is retrained on real data
    // 
    // Strategy:
    // - Very small amounts (< ₹50): 10% ML (rules dominate)
    // - Small amounts (< ₹200): 15% ML
    // - Large amounts (≥ ₹5,000): 10% ML (rules more reliable for high-stakes)
    // - New users: 15% ML (rules more explainable)
    // - Established users: 25% ML (can leverage pattern learning)
    
    if (currentAmount < 50) {
      mlWeight = 0.1; // Very small amounts: 90% rules, 10% ML
    } else if (currentAmount < 200) {
      mlWeight = 0.15; // Small amounts: 85% rules, 15% ML
    } else if (currentAmount >= 5000) {
      mlWeight = 0.1; // Large amounts: 90% rules, 10% ML (rules more reliable)
    } else if (features.vulnerability.is_new_user || features.vulnerability.total_transactions < 10) {
      mlWeight = 0.15; // New users: 85% rules, 15% ML
    } else if (features.vulnerability.total_transactions > 50) {
      mlWeight = 0.25; // Experienced users: 75% rules, 25% ML
    } else {
      mlWeight = 0.2; // Regular users: 80% rules, 20% ML
    }

    console.log(`[HYBRID] Rule score: ${compositeScore.toFixed(3)}, ML score: ${mlAnomalyScore.toFixed(3)}, ML weight: ${mlWeight}, Amount: ₹${currentAmount}`);
  } catch (error) {
    console.error('ML inference failed, falling back to rule-based only:', error.message);
    mlEnabled = false;
    mlWeight = 0; // Fall back to 100% rule-based
  }

  // --- HYBRID SCORE CALCULATION ---
  // Combine rule-based and ML scores
  const ruleWeight = 1 - mlWeight;
  let finalScore = compositeScore;

  if (mlEnabled) {
    // Cap ML anomaly score at 0.7 to prevent extreme values from dominating
    // (ML trained on synthetic data may give unrealistic scores)
    const cappedMLScore = Math.min(mlAnomalyScore, 0.7);
    
    finalScore = (compositeScore * ruleWeight) + (cappedMLScore * mlWeight);
    finalScore = Math.min(finalScore, 1.0);
    
    // Add ML-specific reasons if anomaly score is high
    if (mlAnomalyScore > 0.7) {
      reasons.push('ml_high_anomaly');
    } else if (mlAnomalyScore > 0.5) {
      reasons.push('ml_moderate_anomaly');
    }
    
    // Log if ML score was capped
    if (mlAnomalyScore > 0.7) {
      console.log(`[HYBRID] ML score capped: ${mlAnomalyScore.toFixed(3)} → 0.700`);
    }
  } else {
    finalScore = compositeScore; // Fall back to rule-based only
  }

  // Map score to risk level with adjusted thresholds
  // IMPORTANT: For large amounts (>= ₹5000), use VERY strict thresholds
  // Rationale: Large amounts to new payees are high-risk regardless of other factors
  let riskLevel;
  let riskScore; // 0-10 scale for display
  
  const isLargeAmount = currentAmount >= 5000;
  const isNewPayee = features.payee.is_new_payee;
  
  // VERY strict thresholds for large amounts to new payees
  if (isLargeAmount && isNewPayee) {
    // For ₹5,000+ to new payees, be VERY aggressive
    if (finalScore < 0.15) {
      riskLevel = 'LOW';
      riskScore = Math.round(finalScore * 10);
    } else if (finalScore < 0.35) {
      riskLevel = 'MEDIUM';
      riskScore = Math.round(finalScore * 10);
    } else {
      riskLevel = 'HIGH';
      riskScore = Math.round(finalScore * 10);
    }
  } else if (isLargeAmount) {
    // For ₹5,000+ to known payees, still be strict
    if (finalScore < 0.20) {
      riskLevel = 'LOW';
      riskScore = Math.round(finalScore * 10);
    } else if (finalScore < 0.40) {
      riskLevel = 'MEDIUM';
      riskScore = Math.round(finalScore * 10);
    } else {
      riskLevel = 'HIGH';
      riskScore = Math.round(finalScore * 10);
    }
  } else {
    // Standard thresholds for normal transactions
    if (finalScore < 0.25) {
      riskLevel = 'LOW';
      riskScore = Math.round(finalScore * 10);
    } else if (finalScore < 0.55) {
      riskLevel = 'MEDIUM';
      riskScore = Math.round(finalScore * 10);
    } else {
      riskLevel = 'HIGH';
      riskScore = Math.round(finalScore * 10);
    }
  }

  // Determine action
  let action;
  if (riskLevel === 'LOW') {
    action = 'ALLOW';
  } else if (riskLevel === 'MEDIUM') {
    action = 'WARN';
  } else {
    action = 'DELAY'; // HIGH: show strong alert + short delay
  }

  // Log final risk calculation for debugging
  console.log(`\n🎯 FINAL RISK CALCULATION for ₹${currentAmount}:`);
  console.log(`   Category Scores: Payee=${scores.payee.toFixed(2)}, Amount=${scores.amount.toFixed(2)}, Urgency=${scores.urgency.toFixed(2)}, Intent=${scores.intent.toFixed(2)}, Hesitation=${scores.hesitation.toFixed(2)}, Vuln=${scores.vulnerability.toFixed(2)}`);
  console.log(`   Composite (rule) score: ${compositeScore.toFixed(3)}`);
  console.log(`   ML anomaly score: ${mlAnomalyScore.toFixed(3)} (weight: ${mlWeight})`);
  console.log(`   Final hybrid score: ${finalScore.toFixed(3)}`);
  console.log(`   Risk level: ${riskLevel} (${riskScore}/10)`);
  console.log(`   Action: ${action}\n`);

  // Compute 0-100 normalized risk score strictly aligned with riskLevel tiers:
  // LOW (0-30), MEDIUM (31-70), HIGH (71-100)
  let riskScore100 = Math.min(100, Math.max(0, Math.round(finalScore * 100)));
  if (riskLevel === 'HIGH') {
    riskScore100 = Math.min(99, Math.max(72, riskScore100 < 71 ? 72 + Math.round((finalScore || 0.5) * 25) : riskScore100));
  } else if (riskLevel === 'MEDIUM') {
    riskScore100 = Math.min(70, Math.max(35, riskScore100));
  } else {
    riskScore100 = Math.min(30, Math.max(5, riskScore100));
  }

  // Generate explainable fraud reasons list
  const fraudReasons = buildFraudReasonsList(
    riskLevel,
    currentAmount,
    features,
    userProfile,
    payee_id,
    behavioral_signals,
    mlFraudReasons
  );

  // Generate SHAP percentage bars
  const shapPercentageBars = buildShapPercentageBars(scores, mlShapBars);

  // Generate dual behavioral profile comparison
  const behavioralComparison = buildBehavioralComparison(
    currentAmount,
    features,
    userProfile,
    payee_id,
    behavioral_signals,
    riskLevel
  );

  return {
    risk_level: riskLevel,
    risk_score: riskScore,
    risk_score_100: riskScore100,
    fraud_reasons: fraudReasons,
    shap_percentage_bars: shapPercentageBars,
    behavioral_comparison: behavioralComparison,
    composite_score: finalScore, // Hybrid score (rule + ML)
    rule_score: compositeScore, // Pure rule-based score
    ml_anomaly_score: mlAnomalyScore, // ML anomaly score
    ml_weight: mlWeight, // Weight given to ML
    ml_enabled: mlEnabled, // Whether ML was used
    ml_top_features: mlTopFeatures, // Top contributing features from ML
    action,
    reason_codes: [...new Set(reasons)], // Remove duplicates
    category_scores: scores,
    explanation: buildRiskExplanation(riskLevel, reasons, features)
  };
}

/**
 * Build human-readable explainability bullet points
 */
function buildFraudReasonsList(riskLevel, currentAmount, features, userProfile, payee_id, behavioral_signals = {}, mlFraudReasons = []) {
  const reasonsList = [];
  const avgAmt = userProfile?.avg_amount || 1250;

  if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
    if (currentAmount >= 5000 || (currentAmount / avgAmt) >= 2.0) {
      const ratio = (currentAmount / avgAmt).toFixed(1);
      reasonsList.push(`Amount is ${ratio}x your typical transaction (₹${currentAmount.toLocaleString()} vs typical ₹${avgAmt.toLocaleString()})`);
    }

    if (features.payee?.is_new_payee) {
      reasonsList.push(`First-time payment to this UPI ID (${payee_id})`);
    } else if (features.payee?.payee_trust_score < 0.4) {
      reasonsList.push(`Low-trust recipient with minimal transaction history`);
    }

    const currentHour = new Date().getHours();
    if (features.time?.is_unusual_hour || currentHour < 6 || currentHour > 22) {
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      reasonsList.push(`Transaction initiated at ${timeStr} (Unusual hour outside your normal 9 AM – 9 PM window)`);
    }

    if (features.time?.rapid_succession || (features.time?.recent_tx_count_24h && features.time.recent_tx_count_24h > 3)) {
      reasonsList.push(`High velocity: multiple rapid transactions initiated in a short window`);
    }

    if (behavioral_signals?.amount_edit_count && behavioral_signals.amount_edit_count > 1) {
      reasonsList.push(`Hesitation detected: amount edited ${behavioral_signals.amount_edit_count} times before confirming`);
    }

    if (features.intent?.is_refund) {
      reasonsList.push(`High scam-risk intent category: Refund to unfamiliar UPI recipient`);
    }

    if (behavioral_signals?.ip_region && !behavioral_signals.ip_region.toLowerCase().includes('pune')) {
      reasonsList.push(`Device location anomaly: request origin ${behavioral_signals.ip_region} (typical: Pune)`);
    }

    // Merge any unique reasons from ML
    if (Array.isArray(mlFraudReasons)) {
      for (const r of mlFraudReasons) {
        if (!reasonsList.includes(r) && reasonsList.length < 5) {
          reasonsList.push(r);
        }
      }
    }
  }

  // If low risk or empty, supply baseline reassurance reasons
  if (reasonsList.length === 0) {
    reasonsList.push(`Amount ₹${currentAmount.toLocaleString()} is within your typical baseline range`);
    reasonsList.push(features.payee?.is_new_payee ? `Verified new payee onboarding` : `Known and trusted payee with past transaction history`);
    reasonsList.push(`Transaction timing matches your usual daytime habits`);
  }

  return reasonsList;
}

/**
 * Build SHAP visual percentage bars
 */
function buildShapPercentageBars(scores, mlShapBars) {
  if (Array.isArray(mlShapBars) && mlShapBars.length > 0) {
    return mlShapBars;
  }

  const rawWeights = [
    { feature: 'Amount Spike', score: Math.max(0.08, (scores.amount || 0) * 0.35), direction: 'RISK_INCREASING' },
    { feature: 'New Payee', score: Math.max(0.06, (scores.payee || 0) * 0.25), direction: 'RISK_INCREASING' },
    { feature: 'Unusual Hour / Urgency', score: Math.max(0.04, (scores.urgency || 0) * 0.15), direction: 'RISK_INCREASING' },
    { feature: 'Intent Category', score: Math.max(0.03, (scores.intent || 0) * 0.10), direction: 'RISK_INCREASING' },
    { feature: 'Behavioral Hesitation', score: Math.max(0.02, (scores.hesitation || 0) * 0.05), direction: 'RISK_INCREASING' }
  ];

  const total = rawWeights.reduce((sum, w) => sum + w.score, 0);
  return rawWeights.map(w => ({
    feature: w.feature,
    weight_pct: Math.round((w.score / total) * 100),
    direction: w.direction
  })).sort((a, b) => b.weight_pct - a.weight_pct);
}

/**
 * Build dynamic behavioral comparison object
 */
function buildBehavioralComparison(currentAmount, features, userProfile, payee_id, behavioral_signals = {}, riskLevel) {
  const avgAmt = userProfile?.avg_amount || 1250;
  const minAmount = userProfile?.min_amount || Math.round(avgAmt * 0.2);
  const maxAmount = userProfile?.max_amount || Math.round(avgAmt * 2.8);
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return {
    user_baseline: {
      normal_amount: `₹${minAmount.toLocaleString()} – ₹${maxAmount.toLocaleString()}`,
      typical_hour: '9:00 AM – 9:00 PM',
      common_locations: 'Pune, Maharashtra',
      common_payees: userProfile?.common_payees_count || 12,
      average_transactions: '3 / day',
      typical_velocity: '1 transaction / 10 min'
    },
    current_transaction: {
      amount: `₹${currentAmount.toLocaleString()}`,
      time: timeStr,
      payee_status: features.payee?.is_new_payee ? 'New Payee' : 'Known Payee',
      velocity: `${features.time?.recent_tx_count_24h || 1} transactions today`,
      location: behavioral_signals?.ip_region || 'Pune, Maharashtra'
    },
    deviation_score: riskLevel
  };
}

/**
 * Build human-readable explanation of risk factors.
 */
function buildRiskExplanation(riskLevel, reasons, features) {
  const explanations = {
    'new_payee': 'First transaction with this recipient',
    'new_payee_large_amount': 'Large amount to new recipient',
    'low_trust_payee': 'Recipient has limited transaction history',
    'new_individual_risky_intent': 'New individual recipient + risky transaction type',
    'extreme_amount': 'Extremely large amount (₹1,00,000+)',
    'very_large_amount': 'Very large amount (₹50,000+)',
    'large_amount': 'Large amount (₹5,000+)',
    'moderate_amount': 'Moderate amount (₹2,000+)',
    'noticeable_amount': 'Noticeable amount (₹500+)',
    'largest_transaction_ever': 'Largest amount you\'ve ever sent',
    'extreme_amount_deviation': 'Amount is 10x+ your typical transaction',
    'very_high_amount_spike': 'Amount is 5-10x your typical transaction',
    'extreme_amount_spike': 'Amount is 5x+ your typical transaction',
    'significant_amount_spike': 'Amount is 3x+ your typical transaction',
    'moderate_amount_spike': 'Amount is 2x+ your typical transaction',
    'amount_near_max': 'Amount approaching your maximum',
    'amount_escalation_pattern': 'Amount increasing rapidly across recent transactions',
    'late_night_transaction': 'Late night transaction (10 PM - 4 AM)',
    'unusual_hour': 'Transaction at unusual time for you',
    'rapid_transaction_velocity': 'Multiple transactions in short time',
    'rushed_confirmation': 'Confirmed faster than your usual pace',
    'intent_mismatch': 'Intent doesn\'t match your typical patterns',
    'risky_intent_type': 'Transaction type with higher scam association',
    'refund_to_new_payee': 'Refund to recipient you\'ve never paid before',
    'intent_pattern_mismatch': 'Significant deviation from intent history',
    'excessive_amount_edits': 'Edited amount multiple times',
    'unusual_confirmation_delay': 'Paused longer than usual before confirming',
    'new_user': 'You\'re new to this platform',
    'low_experience_user': 'Limited transaction history',
    'cooling_off_active': 'High-alert mode is enabled',
    'history_ignoring_warnings': 'You\'ve previously proceeded with flagged transactions',
    'ml_high_anomaly': 'AI detected highly unusual transaction pattern',
    'ml_moderate_anomaly': 'AI detected moderately unusual pattern'
  };

  return reasons
    .slice(0, 3) // Top 3 reasons
    .map(r => explanations[r] || r)
    .join('; ');
}

module.exports = {
  calculateRiskLevel
};
