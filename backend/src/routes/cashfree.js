const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const cashfreeService = require('../services/cashfreeService');
const riskHistoryService = require('../services/riskHistoryService');

/**
 * POST /preRisk
 * Pre-risk check before payment
 * This should return the SAME risk score as the transaction/decision endpoint
 * to ensure consistency across screens
 * 
 * Input: { userId, vpa, amount, timestamp, transactionId }
 * Output: { score, label, reasons }
 */
router.post('/preRisk', async (req, res) => {
  try {
    const { userId, vpa, amount, timestamp, transactionId } = req.body;

    // Validate required fields
    if (!userId || !vpa || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: userId, vpa, amount'
      });
    }

    // If transactionId is provided, fetch the existing risk score from that transaction
    if (transactionId) {
      const Transaction = require('../models/Transaction');
      const transaction = await Transaction.findOne({ transaction_id: transactionId });
      
      if (transaction) {
        // Return the SAME risk score that was calculated during transaction/decision
        const score = transaction.risk_score / 10; // Convert 0-10 to 0-1 scale
        const label = transaction.risk_level;
        const reasons = transaction.reason_codes || [];
        
        console.log(`[PRE-RISK] Using existing transaction risk: userId=${userId}, transactionId=${transactionId}, score=${score.toFixed(2)}, label=${label}`);
        
        return res.status(200).json({
          score: parseFloat(score.toFixed(2)),
          label,
          reasons,
          risk_score_100: transaction.risk_score_100 !== undefined ? transaction.risk_score_100 : Math.round(score * 100),
          fraud_reasons: transaction.fraud_reasons || [],
          shap_percentage_bars: transaction.shap_percentage_bars || [],
          behavioral_comparison: transaction.behavioral_comparison || null
        });
      }
    }

    // Fallback: If no transactionId or transaction not found, use simple rules
    const transactionAmount = parseFloat(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount. Must be a positive number'
      });
    }

    const transactionTime = timestamp ? new Date(timestamp) : new Date();
    const reasons = [];
    let score = 0;

    // Rule 1: New merchant detection
    const isNewMerchant = await riskHistoryService.isNewMerchant(userId, vpa);
    if (isNewMerchant) {
      reasons.push('New merchant');
      score += 0.3;
    }

    // Rule 2: Late-night detection (>= 20:00 or <= 02:00)
    const hour = transactionTime.getHours();
    const isLateNight = hour >= 20 || hour <= 2;
    if (isLateNight) {
      reasons.push('Nighttime');
      score += 0.25;
    }

    // Rule 3: High amount detection (>= 5000)
    if (transactionAmount >= 5000) {
      reasons.push('High amount');
      score += 0.3;
    }

    // Rule 4: Frequency detection (multiple recent transactions)
    const recentCount = await riskHistoryService.getRecentTransactionCount(userId, 3600000); // Last hour
    if (recentCount >= 3) {
      reasons.push('Multiple recent transactions');
      score += 0.2;
    }

    // Cap score at 1.0
    score = Math.min(score, 1.0);

    // Determine label
    let label;
    if (score >= 0.7) {
      label = 'HIGH';
    } else if (score >= 0.4) {
      label = 'MEDIUM';
    } else {
      label = 'LOW';
    }

    // Store transaction in history
    await riskHistoryService.addTransaction({
      userId,
      vpa,
      amount: transactionAmount,
      timestamp: transactionTime
    });

    // Log request
    console.log(`[PRE-RISK] userId=${userId}, vpa=${vpa}, amount=${transactionAmount}, score=${score.toFixed(2)}, label=${label}`);

    const score100 = Math.round(score * 100);
    const fraudReasons = reasons.length > 0 
      ? reasons.map(r => `Risk indicator: ${r}`)
      : ['Amount is within typical baseline range', 'Normal daytime transaction window'];

    const shapBars = [
      { feature: 'Amount Magnitude', weight_pct: 45, direction: 'RISK_INCREASING' },
      { feature: 'Payee Trust History', weight_pct: 30, direction: 'RISK_INCREASING' },
      { feature: 'Transaction Urgency & Time', weight_pct: 25, direction: 'RISK_INCREASING' }
    ];

    res.status(200).json({
      score: parseFloat(score.toFixed(2)),
      label,
      reasons,
      risk_score_100: score100,
      fraud_reasons: fraudReasons,
      shap_percentage_bars: shapBars,
      behavioral_comparison: null
    });

  } catch (error) {
    console.error('Error in /preRisk:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /createOrder
 * Create Cashfree order and get payment session
 * Input: { orderId (optional), amount, vpa, customerName, customerEmail, customerPhone }
 * Output: { orderId, paymentSessionId }
 */
router.post('/createOrder', async (req, res) => {
  // This endpoint creates a Cashfree order and returns a payment session id.
  // Cashfree is only called after the user confirms from the UI. The risk engine runs earlier
  // on the Review & Confirm screen and does NOT get modified here.
  try {
    const { orderId, amount, vpa, customerName, customerEmail, customerPhone } = req.body;

    // Validate required fields
    if (!amount || !vpa) {
      return res.status(400).json({
        error: 'Missing required fields: amount, vpa'
      });
    }

    const orderAmount = parseFloat(amount);
    if (isNaN(orderAmount) || orderAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount. Must be a positive number'
      });
    }

    // Generate orderId if not provided
    const finalOrderId = orderId || `order_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Cashfree requires customer_id to be alphanumeric and may include _ or -
    // (cannot contain spaces). We'll generate a safe id for demo.
    const safeCustomerId = `cust_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Create order via Cashfree API
    const cashfreeResponse = await cashfreeService.createOrder({
      orderId: finalOrderId,
      orderAmount: orderAmount,
      orderCurrency: 'INR',
      customerDetails: {
        customerId: safeCustomerId,
        customerName: customerName || 'Test Customer',
        customerEmail: customerEmail || 'test@example.com',
        customerPhone: customerPhone || '9999999999'
      },
      orderMeta: {
        returnUrl: 'http://localhost:5173/payment-callback',
        notifyUrl: 'http://localhost:3000/cashfree/webhook' // Not used in sandbox but required
      }
    });

    // Log request
    console.log(`[CREATE-ORDER] orderId=${finalOrderId}, amount=${orderAmount}, paymentSessionId=${cashfreeResponse.payment_session_id}`);

    res.status(200).json({
      orderId: finalOrderId,
      paymentSessionId: cashfreeResponse.payment_session_id
    });

  } catch (error) {
    console.error('Error in /createOrder:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /orderStatus
 * Get order status from Cashfree
 * Query params: orderId
 * Output: { status, orderId, amount, vpa, timestamp }
 */
router.get('/orderStatus', async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({
        error: 'Missing required query parameter: orderId'
      });
    }

    // Get order status from Cashfree API
    const orderStatus = await cashfreeService.getOrderStatus(orderId);

    // Map Cashfree status to our status format
    // Cashfree returns: order_status (e.g., "PAYMENT_SUCCESS", "PAYMENT_PENDING", "PAYMENT_FAILED")
    let mappedStatus = orderStatus.order_status || 'UNKNOWN';
    
    // Normalize status values
    if (mappedStatus === 'PAYMENT_SUCCESS') {
      mappedStatus = 'SUCCESS';
    } else if (mappedStatus === 'PAYMENT_FAILED') {
      mappedStatus = 'FAILED';
    }

    // Log request
    console.log(`[ORDER-STATUS] orderId=${orderId}, status=${mappedStatus} (original: ${orderStatus.order_status})`);

    res.status(200).json({
      status: mappedStatus,
      orderId: orderStatus.order_id || orderId,
      amount: orderStatus.order_amount || 0,
      vpa: orderStatus.payment_details?.upi?.upi || orderStatus.payment_details?.payment_method?.upi || null,
      timestamp: orderStatus.order_expiry_time || orderStatus.created_at || new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /orderStatus:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
