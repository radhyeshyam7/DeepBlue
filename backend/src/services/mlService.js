/**
 * ML Service - Phase 2 Implementation
 * 
 * Replaces Phase 1 stub with real ML inference calls
 * Contract: docs/ML_CONTRACT_v1.md
 */

const { infer } = require('../ml/inferenceService');

/**
 * Get anomaly score from ML model
 * @param {Object} transactionData - Raw transaction data
 * @param {Object} features - Pre-extracted feature vector (v1)
 * @returns {Object} ML inference result
 */
const getAnomalyScore = async (transactionData, features = null) => {
  try {
    // If features are provided, use them directly
    // Otherwise, this will be called from riskEngine after feature extraction
    if (!features) {
      // Fallback: return low score if features not provided
      // This should not happen in normal flow
      console.warn('ML service called without features, using fallback');
      return {
        anomaly_score: 0.2,
        top_contributing_features: [],
        feature_version: 'v1',
        model_version: 'v1.0.0'
      };
    }

    // Call ML inference (which routes to FastAPI or fallback)
    const result = await infer(features);
    return result;

  } catch (error) {
    console.error('ML inference error:', error);
    
    // Fallback: return medium risk if ML fails
    // This ensures system continues to work even if ML is down
    return {
      anomaly_score: 0.5, // Medium risk as fallback
      top_contributing_features: [],
      feature_version: 'v1',
      model_version: 'v1.0.0',
      error: error.message
    };
  }
};

module.exports = {
  getAnomalyScore
};
