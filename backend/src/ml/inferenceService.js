/**
 * ML Inference Service
 * 
 * Provides anomaly detection using trained Autoencoder model
 * Contract: docs/ML_CONTRACT_v1.md
 */

const { loadModel } = require('./training');

let cachedModel = null;
let cachedFeatureNames = null;

/**
 * Initialize ML model (load from disk or train)
 */
async function initializeModel() {
  if (!cachedModel) {
    const { model, featureNames } = await loadModel();
    cachedModel = model;
    cachedFeatureNames = featureNames;
  }
  return { model: cachedModel, featureNames: cachedFeatureNames };
}

/**
 * Run ML inference on feature vector
 * @param {Object} features - Feature vector object (v1 format)
 * @returns {Object} Inference result with anomaly score and top features
 */
async function infer(features) {
  // 1. Try FastAPI ML Service (Port 8001)
  const fastApiUrl = process.env.FASTAPI_ML_URL || 'http://localhost:8001';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const payload = {
      amount: features.amount_ratio ? features.amount_ratio * 1000 : 1000,
      user_avg_amount: 1000,
      is_new_payee: features.is_new_payee ? 1 : 0,
      payee_trust_score: features.payee_trust_score !== undefined ? features.payee_trust_score : 0.8,
      transaction_velocity: features.txn_frequency_recent || features.transaction_velocity || 1,
      hesitation_score: features.hesitation_score !== undefined ? features.hesitation_score : 0.1,
      edit_count: features.amount_edit_count_ratio || 0,
      intent_mismatch_score: features.intent_risk_score || 0.0,
      vulnerability_score: features.user_maturity_flag === 0 ? 0.7 : 0.2,
      features: features
    };

    const response = await fetch(`${fastApiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        anomaly_score: data.anomaly_score,
        risk_score_100: data.risk_score_100 !== undefined ? data.risk_score_100 : Math.round((data.anomaly_score || 0) * 100),
        fraud_reasons: data.fraud_reasons || [],
        shap_percentage_bars: data.shap_percentage_bars || [],
        risk_level: data.risk_level,
        recommended_action: data.recommended_action,
        top_contributing_features: data.top_contributing_features || [],
        feature_version: 'v1-mlops',
        model_version: data.model_version || 'v1.0.0',
        engine: 'FastAPI-IsolationForest'
      };
    }
  } catch (apiError) {
    // FastAPI ML service offline or timed out; seamlessly proceed to internal model
  }

  // 2. Local Model Inference (Fallback)
  try {
    const { model, featureNames } = await initializeModel();

    // Convert feature object to array in correct order
    const featureArray = featureNames.map(name => {
      const value = features[name];
      if (value === undefined || value === null) {
        throw new Error(`Missing required feature: ${name}`);
      }
      return typeof value === 'boolean' ? (value ? 1 : 0) : parseFloat(value);
    });

    // Get anomaly score
    const anomalyScore = model.predictAnomalyScore(featureArray);
    
    // Get top contributing features
    const topFeatures = model.getTopContributingFeatures(featureArray, featureNames);
    const score100 = Math.round(Math.max(0, Math.min(1, anomalyScore)) * 100);

    // Build fallback SHAP percentage bars from top features
    const shapBars = (topFeatures || []).map((feat, idx) => ({
      feature: feat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      weight_pct: Math.max(10, Math.round(40 / (idx + 1))),
      direction: 'RISK_INCREASING'
    }));

    return {
      anomaly_score: Math.max(0, Math.min(1, parseFloat(anomalyScore.toFixed(4)))),
      risk_score_100: score100,
      fraud_reasons: topFeatures.slice(0, 3).map(f => `Unusual pattern in ${f.replace(/_/g, ' ')}`),
      shap_percentage_bars: shapBars,
      top_contributing_features: topFeatures,
      feature_version: 'v1',
      model_version: 'v1.0.0',
      engine: 'Internal-Local'
    };
  } catch (error) {
    console.error('ML inference error:', error);
    throw error;
  }
}

/**
 * Validate feature vector against v1 contract
 */
function validateFeatureVector(features) {
  const requiredFeatures = [
    'amount_ratio', 'amount_zscore', 'is_new_payee', 'payee_trust_score',
    'payee_payment_count', 'txn_frequency_recent', 'velocity_spike',
    'time_deviation_score', 'is_unusual_hour', 'confirmation_time_ratio',
    'hesitation_score', 'amount_edit_count_ratio', 'intent_risk_score',
    'intent_direction_mismatch', 'user_maturity_flag', 'cooling_off_active',
    'recent_warning_ignored', 'device_change_flag', 'account_age_days',
    'transaction_count'
  ];

  const missing = requiredFeatures.filter(name => features[name] === undefined);
  if (missing.length > 0) {
    throw new Error(`Missing required features: ${missing.join(', ')}`);
  }

  return true;
}

module.exports = {
  infer,
  validateFeatureVector,
  initializeModel
};
