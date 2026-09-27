/**
 * ML Routes
 * 
 * Endpoints for ML model management and monitoring
 */

const express = require('express');
const router = express.Router();
const { infer, initializeModel } = require('../ml/inferenceService');
const { manualRetrain, getRetrainingStatus } = require('../services/autoRetraining');

/**
 * GET /ml/health
 * Check ML model health
 */
router.get('/health', async (req, res) => {
  try {
    await initializeModel();
    res.json({
      status: 'OK',
      message: 'ML model loaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /ml/infer
 * Run ML inference on feature vector
 */
router.post('/infer', async (req, res) => {
  try {
    const { features } = req.body;
    
    if (!features) {
      return res.status(400).json({
        error: 'Missing required field: features'
      });
    }

    const result = await infer(features);
    res.json(result);
  } catch (error) {
    console.error('ML inference error:', error);
    res.status(500).json({
      error: 'ML inference failed',
      message: error.message
    });
  }
});

/**
 * POST /ml/retrain
 * Manually trigger model retraining
 */
router.post('/retrain', async (req, res) => {
  try {
    console.log('🔄 Manual retraining requested via API...');
    const result = await manualRetrain();
    
    if (result.retrained) {
      res.json({
        success: true,
        message: 'Model retrained successfully',
        ...result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Retraining failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Retraining error:', error);
    res.status(500).json({
      success: false,
      error: 'Retraining failed',
      message: error.message
    });
  }
});

/**
 * GET /ml/status
 * Get retraining status and configuration
 */
router.get('/status', (req, res) => {
  try {
    const status = getRetrainingStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
});

module.exports = router;
