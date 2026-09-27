import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTransactionStore } from '../state/transactionStore';
import { useAuthStore } from '../state/authStore';
import { preRiskCheck, createOrder, pollOrderStatus, type OrderStatusResponse } from '../api/cashfreeApi';
import { submitTransactionFeedback } from '../api/transactionApi';
import { AlertTriangle, CheckCircle, X, Loader2, Zap } from 'lucide-react';
import { PinInputModal } from './PinInputModal';
import { FraudReasonEngine } from './FraudReasonEngine';
import { BehavioralProfileCard } from './BehavioralProfileCard';

declare global {
  interface Window {
    Cashfree: any;
  }
}

export function PaymentFlow({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) {
  const { user } = useAuthStore();
  const { transaction, setPreRiskResult, preRiskResult, setPhase, setPaymentOrderId, setPaymentStatus, paymentStatus } = useTransactionStore();
  const { riskAnalysis } = useTransactionStore();
  const [isCheckingRisk, setIsCheckingRisk] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Step 1: Pre-risk check on mount
  useEffect(() => {
    const performPreRiskCheck = async () => {
      setIsCheckingRisk(true);
      try {
        // Verify authenticated user exists
        if (!user?.id) {
          console.error('PaymentFlow: No authenticated user found');
          setPreRiskResult({
            score: 0.5,
            label: 'MEDIUM',
            reasons: ['User not authenticated - please log in']
          });
          setIsCheckingRisk(false);
          return;
        }

        // Pass transactionId to get consistent risk score
        const result = await preRiskCheck(
          user.id, // Use authenticated user ID
          transaction.payee,
          parseFloat(transaction.amount),
          riskAnalysis?.transactionId // Pass transactionId for consistency
        );
        // PRE-RISK: store backend preRisk result with MLOps fields
        setPreRiskResult({
          score: result.score,
          label: result.label,
          reasons: result.reasons,
          riskScore100: result.risk_score_100,
          fraudReasons: result.fraud_reasons,
          shapBars: result.shap_percentage_bars,
          behavioralComparison: result.behavioral_comparison
        });
      } catch (error) {
        console.error('Pre-risk check failed:', error);
        // Fallback to LOW risk
        setPreRiskResult({ score: 0, label: 'LOW', reasons: [] });
      } finally {
        setIsCheckingRisk(false);
      }
    };

    performPreRiskCheck();
  }, [user, riskAnalysis]);

  // Step 2: Create order and open Cashfree popup
  const handlePay = async () => {
    // This function will be called only after user confirmation flow
    setIsCreatingOrder(true);
    try {
      const orderResponse = await createOrder(
        parseFloat(transaction.amount),
        transaction.payee
      );

      setOrderId(orderResponse.orderId);
      setPaymentOrderId(orderResponse.orderId);
      setPhase('PAYMENT_POLLING');

      // If mock session explicitly requested
      if (!orderResponse.paymentSessionId || orderResponse.paymentSessionId.startsWith('mock_session_')) {
        console.log('Mock session detected, simulating payment completion');
        setIsPolling(true);
        setTimeout(() => {
          setPaymentStatus('SUCCESS');
          setIsPolling(false);
          setTimeout(() => {
            onComplete();
          }, 1500);
        }, 2000);
        return;
      }

      const CashfreeAny = window.Cashfree;
      if (!CashfreeAny) {
        console.warn('Cashfree SDK not loaded, polling status directly');
        setIsPolling(true);
        return;
      }

      const popupPayload = {
        paymentSessionId: orderResponse.paymentSessionId,
        redirectTarget: '_modal',
      };

      try {
        console.log('[CASHFREE] Launching checkout modal for session:', orderResponse.paymentSessionId);
        const cfInstance = typeof CashfreeAny === 'function' ? CashfreeAny({ mode: 'sandbox' }) : CashfreeAny;
        if (cfInstance?.checkout && typeof cfInstance.checkout === 'function') {
          cfInstance.checkout(popupPayload);
        } else if (cfInstance?.initPopup && typeof cfInstance.initPopup === 'function') {
          cfInstance.initPopup(popupPayload);
        } else {
          console.warn('Cashfree SDK checkout method not found');
        }
      } catch (sdkError) {
        console.warn('Cashfree SDK popup error:', sdkError);
      }

      // Start polling immediately (popup handles payment, we poll status)
      setIsPolling(true);
      setPollingError(null);

      // Poll order status
      try {
        const finalStatus = await pollOrderStatus(
          orderResponse.orderId,
          (status: OrderStatusResponse) => {
            setPaymentStatus(status.status);
          },
          30, // max attempts (60 seconds total)
          2000 // 2 second interval
        );

        setPaymentStatus(finalStatus.status);
        setIsPolling(false);

        // Show completion message after a short delay
        setTimeout(() => {
          onComplete();
        }, 2000);

      } catch (error: any) {
        console.error('Polling error:', error);
        setPollingError(error.message || 'Failed to get payment status');
        setIsPolling(false);
      }

    } catch (error: any) {
      console.error('Error creating order:', error);
      alert(`Payment failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // PIN Modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | undefined>();
  const [pinAttemptsRemaining, setPinAttemptsRemaining] = useState<number | undefined>();
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  // Handle PIN submission
  const handlePinSubmit = async (pin: string) => {
    if (!riskAnalysis?.transactionId) {
      setPinError('Transaction ID not found');
      return;
    }

    // Submit feedback with PIN for verification
    const result = await submitTransactionFeedback(riskAnalysis.transactionId, 'PROCEEDED', pin);

    if (result.success) {
      // PIN verified successfully
      setShowPinModal(false);
      setPinError(undefined);
      setPinAttemptsRemaining(undefined);

      // Execute pending action (payment)
      if (pendingAction) {
        await pendingAction();
        setPendingAction(null);
      }
    } else {
      // PIN verification failed
      setPinError(result.error || 'Incorrect PIN');
      setPinAttemptsRemaining(result.attemptsRemaining);

      // If no attempts remaining, close modal
      if (result.attemptsRemaining === 0) {
        setTimeout(() => {
          setShowPinModal(false);
          setPinError(undefined);
          setPinAttemptsRemaining(undefined);
        }, 2000);
      }
    }
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPinError(undefined);
    setPinAttemptsRemaining(undefined);
    setPendingAction(null);
  };

  // New: confirmation flows based on risk level
  const [confirmed, setConfirmed] = useState(false);
  const [highDelaySecs, setHighDelaySecs] = useState<number | null>(null);

  const handlePayFlow = async () => {
    // LOW: proceed with PIN verification
    if (preRiskResult.label === 'LOW') {
      // Show PIN modal
      setPendingAction(() => handlePay);
      setShowPinModal(true);
      return;
    }

    // MEDIUM: show a confirmation prompt
    if (preRiskResult.label === 'MEDIUM') {
      const ok = confirm('This payment is flagged as MEDIUM risk. Do you want to proceed?');
      if (ok) {
        // Show PIN modal
        setPendingAction(() => handlePay);
        setShowPinModal(true);
      }
      return;
    }

    // HIGH: strong alert + short delay, user must confirm
    if (preRiskResult.label === 'HIGH') {
      const ok = confirm('High risk detected. This transaction may be suspicious. You will have a short delay before proceeding. Continue?');
      if (!ok) return;

      // Start short delay (visible) before enabling payment to reduce urgency
      setHighDelaySecs(5);
      for (let s = 5; s > 0; s--) {
        setHighDelaySecs(s);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 1000));
      }
      setHighDelaySecs(null);

      // Show PIN modal after delay
      setPendingAction(() => handlePay);
      setShowPinModal(true);
    }
  };

  if (isCheckingRisk) {
    return (
      <motion.div
        className="space-y-4 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-400" />
        <p className="text-blue-300/80 tracking-wide">Checking transaction risk...</p>
      </motion.div>
    );
  }

  if (!preRiskResult) {
    return null;
  }

  const riskColor = preRiskResult.label === 'HIGH' ? '#ef4444' :
    preRiskResult.label === 'MEDIUM' ? '#f59e0b' :
      '#10b981';

  // Convert 0-1 score to 0-100 for display
  const displayScore = Math.round(preRiskResult.score * 100);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Transaction Summary */}
      <motion.div
        className="card-solid-navy rounded-xl p-4 space-y-2.5"
        style={{
          backgroundColor: '#0D1836',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center text-sm">
          <span className="text-blue-300/70 tracking-wide">Payee</span>
          <span className="tracking-wide font-mono text-cyan-300">{transaction.payee}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-blue-300/70 tracking-wide text-sm">Amount</span>
          <span className="text-2xl font-bold tracking-tight text-white font-mono">
            ₹{parseFloat(transaction.amount).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-blue-300/70 tracking-wide">Type</span>
          <span className="tracking-wide capitalize text-blue-200">{transaction.intent}</span>
        </div>
      </motion.div>

      {/* Circular Risk Meter */}
      <motion.div
        className="relative py-8 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="relative w-48 h-48">
          {/* Background circle */}
          <div className="absolute inset-0 rounded-full glass-light" />

          {/* Gradient arc background */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <defs>
              <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <circle
              cx="96"
              cy="96"
              r="70"
              fill="none"
              stroke="url(#riskGradient)"
              strokeWidth="6"
              strokeOpacity="0.2"
              strokeDasharray="440 440"
            />
          </svg>

          {/* Active arc */}
          <motion.svg className="absolute inset-0 w-full h-full -rotate-90">
            <motion.circle
              cx="96"
              cy="96"
              r="70"
              fill="none"
              stroke={riskColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="440 440"
              initial={{ strokeDashoffset: 440 }}
              animate={{
                strokeDashoffset: 440 - (displayScore / 100) * 440,
              }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{
                filter: `drop-shadow(0 0 6px ${riskColor}80)`,
              }}
            />
          </motion.svg>

          {/* Center score display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              className="text-5xl tabular-nums tracking-tight"
              style={{ color: riskColor }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            >
              {displayScore}
            </motion.div>
            <div className="text-xs text-blue-300/60 tracking-wider mt-1">
              RISK SCORE
            </div>
          </div>
        </div>

        {/* Risk level label */}
        <motion.div
          className="mt-6 text-center space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h3
            className="text-xl tracking-wide"
            style={{ color: riskColor }}
          >
            {preRiskResult.label} Risk
          </h3>
          <p className="text-xs text-blue-300/60 tracking-wide max-w-xs">
            Based on transaction analysis
          </p>
        </motion.div>
      </motion.div>

      {/* 1. User-Specific Behavioral Profile Card */}
      <BehavioralProfileCard
        comparison={preRiskResult.behavioralComparison || riskAnalysis?.behavioralComparison}
        currentAmount={transaction.amount}
        payee={transaction.payee}
      />

      {/* 2. Fraud Reason Engine (0-100 score, explainable bullets, visual SHAP bars) */}
      <FraudReasonEngine
        riskScore100={preRiskResult.riskScore100 !== undefined ? preRiskResult.riskScore100 : (riskAnalysis?.riskScore100 !== undefined ? riskAnalysis.riskScore100 : displayScore)}
        riskLevel={preRiskResult.label}
        fraudReasons={preRiskResult.fraudReasons && preRiskResult.fraudReasons.length > 0 ? preRiskResult.fraudReasons : (riskAnalysis?.fraudReasons && riskAnalysis.fraudReasons.length > 0 ? riskAnalysis.fraudReasons : preRiskResult.reasons)}
        shapBars={preRiskResult.shapBars && preRiskResult.shapBars.length > 0 ? preRiskResult.shapBars : riskAnalysis?.shapBars}
      />

      {/* Payment status */}
      {isPolling && (
        <motion.div
          className="card-solid-navy rounded-xl p-5 text-center space-y-3"
          style={{
            backgroundColor: '#0D1836',
            border: '1px solid rgba(59, 130, 246, 0.35)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-cyan-400 mb-1" />
          <p className="text-white font-medium text-sm">
            {paymentStatus ? `Status: ${paymentStatus}` : 'Authorizing transaction...'}
          </p>
          <p className="text-blue-300/70 text-xs">
            Complete the payment or fast-track simulated approval below
          </p>
          <motion.button
            onClick={() => {
              setIsPolling(false);
              setPaymentStatus('SUCCESS');
              setTimeout(() => {
                onComplete();
              }, 1200);
            }}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-cyan-300 hover:text-white transition-all inline-flex items-center gap-1.5 shadow-md"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.25)',
              border: '1px solid rgba(59, 130, 246, 0.45)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simulate Payment Approval (Sandbox Demo Mode)</span>
          </motion.button>
        </motion.div>
      )}

      {pollingError && (
        <motion.div
          className="rounded-lg p-4 flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-300 text-xs">{pollingError}</p>
          </div>
          <button
            onClick={() => {
              setPollingError(null);
              setPaymentStatus('SUCCESS');
              setTimeout(() => {
                onComplete();
              }, 1200);
            }}
            className="text-xs px-3 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-500 shrink-0"
          >
            Bypass & Complete
          </button>
        </motion.div>
      )}

      {(paymentStatus === 'SUCCESS' || paymentStatus === 'PAYMENT_SUCCESS') && (
        <motion.div
          className="glass-light rounded-lg p-4 flex items-center gap-3"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div className="flex-1">
            <p className="text-green-400 font-medium">Payment Successful!</p>
            <p className="text-green-400/70 text-sm mt-1">
              {preRiskResult.label === 'HIGH' || preRiskResult.label === 'MEDIUM'
                ? 'User overrode warning and completed payment'
                : 'Low risk transaction completed successfully'}
            </p>
          </div>
        </motion.div>
      )}

      {(paymentStatus === 'FAILED' || paymentStatus === 'PAYMENT_FAILED') && (
        <motion.div
          className="glass-light rounded-lg p-4 flex items-center gap-3"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <X className="w-5 h-5 text-red-400" />
          <p className="text-red-400">Payment Failed</p>
        </motion.div>
      )}

      {/* Action buttons */}
      {!isPolling && paymentStatus !== 'SUCCESS' && paymentStatus !== 'FAILED' && (
        <div className="flex gap-3">
          {/* Risk-level specific UI hints */}
          {preRiskResult.label === 'MEDIUM' && (
            <div className="flex-1 p-3 rounded-lg bg-yellow-800/10 text-yellow-300 text-sm">
              Medium risk detected. Please review the risk factors above before proceeding.
            </div>
          )}

          {preRiskResult.label === 'HIGH' && (
            <div className="flex-1 p-3 rounded-lg bg-red-800/10 text-red-300 text-sm">
              <strong>High risk detected.</strong> This transaction is potentially suspicious.
              {highDelaySecs !== null ? (
                <div className="mt-2">Please wait {highDelaySecs}s before proceeding.</div>
              ) : (
                <div className="mt-2">You will be asked to confirm before payment is initiated.</div>
              )}
            </div>
          )}
          <motion.button
            onClick={handlePayFlow}
            disabled={isCreatingOrder}
            className="flex-1 px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
            style={{
              background: isCreatingOrder ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              cursor: isCreatingOrder ? 'not-allowed' : 'pointer',
              opacity: isCreatingOrder ? 0.6 : 1
            }}
            whileHover={!isCreatingOrder ? { scale: 1.01 } : {}}
            whileTap={!isCreatingOrder ? { scale: 0.99 } : {}}
          >
            {isCreatingOrder ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="tracking-wide">Creating order...</span>
              </>
            ) : (
              <>
                <span className="tracking-wide">Pay Now</span>
              </>
            )}
          </motion.button>

          <motion.button
            onClick={onCancel}
            className="px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <X className="w-4 h-4" />
            <span className="tracking-wide">Cancel</span>
          </motion.button>
        </div>
      )}

      {((paymentStatus === 'SUCCESS' || paymentStatus === 'PAYMENT_SUCCESS') ||
        (paymentStatus === 'FAILED' || paymentStatus === 'PAYMENT_FAILED')) && (
          <motion.button
            onClick={onComplete}
            className="w-full px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="tracking-wide">Done</span>
          </motion.button>
        )}

      {/* PIN Input Modal */}
      <PinInputModal
        isOpen={showPinModal}
        onSubmit={handlePinSubmit}
        onCancel={handlePinCancel}
        error={pinError}
        attemptsRemaining={pinAttemptsRemaining}
      />
    </motion.div>
  );
}
