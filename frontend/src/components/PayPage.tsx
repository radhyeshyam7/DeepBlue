import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useTransactionStore } from '../state/transactionStore';
import { useAuthStore } from '../state/authStore';
import { TransactionForm } from './TransactionForm';
import { AnalysisState } from './AnalysisState';
import { RiskDial } from './RiskDial';
import { RiskCards } from './RiskCards';
import { SecurityBoundary } from './SecurityBoundary';
import { DecisionPanel } from './DecisionPanel';
import { PaymentFlow } from './PaymentFlow';
import { analyzeTransaction, type BehavioralSignals } from '../api/transactionApi';

interface PayPageProps {
  onBack: () => void;
  onProceed: () => void;
  onCancel: () => void;
}

export function PayPage({ onBack, onProceed, onCancel }: PayPageProps) {
  const { user } = useAuthStore();
  const {
    phase,
    setPhase,
    transaction,
    setRiskAnalysis,
    amountChangeCount,
    reset,
    firstInputTime,
    lastEditTime,
    confirmationStartTime,
    setPayeeTrustScore,
  } = useTransactionStore();

  const handleContinue = async () => {
    setPhase('ANALYZING');

    try {
      // Get user ID from auth store - REQUIRED for data isolation
      if (!user?.id) {
        console.error('PayPage: No authenticated user found');
        alert('Please log in to continue with the transaction');
        setPhase('IDLE');
        return;
      }

      const userId = user.id;

      const now = Date.now();
      const behavioralSignals: BehavioralSignals = {
        amount_edit_count: amountChangeCount,
        hesitation_time_ms:
          firstInputTime && confirmationStartTime
            ? confirmationStartTime - firstInputTime
            : undefined,
        confirmation_delay_ms: confirmationStartTime
          ? now - confirmationStartTime
          : undefined,
        first_input_time: firstInputTime || undefined,
        last_edit_time: lastEditTime || undefined,
      };

      const analysis = await analyzeTransaction(
        transaction,
        behavioralSignals,
        userId
      );

      if (analysis.trustScore !== undefined) {
        setPayeeTrustScore(analysis.trustScore);
      }

      setRiskAnalysis(analysis);
      // Skip RESULT phase, go directly to PRE_RISK (payment flow with risk meter)
      setPhase('PRE_RISK');
    } catch (error) {
      console.error('Error analyzing transaction:', error);
      setPhase('PRE_RISK');
    }
  };

  const handleCancelTransaction = () => {
    if (confirm('Are you sure you want to cancel this transaction?')) {
      reset();
      onCancel();
    }
  };

  const handleBackFromForm = () => {
    reset();
    onBack();
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        {/* IDLE STATE - Transaction Input */}
        {phase === 'IDLE' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Back Button */}
            <div className="flex items-center gap-4 mb-6">
              <motion.button
                onClick={handleBackFromForm}
                className="w-10 h-10 rounded-full glass-light flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              <div>
                <h2 className="text-xl tracking-wide">Send Money</h2>
                <p className="text-xs text-blue-300/60 tracking-wide">
                  Protected by Saarthi AI
                </p>
              </div>
            </div>

            <TransactionForm onSubmit={handleContinue} />
          </motion.div>
        )}

        {/* ANALYZING STATE - Loading animation */}
        {phase === 'ANALYZING' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnalysisState />
          </motion.div>
        )}

        {/* PRE_RISK STATE - Pre-risk check and payment flow with risk meter */}
        {(phase === 'PRE_RISK' ||
          phase === 'PAYMENT' ||
          phase === 'PAYMENT_POLLING' ||
          phase === 'PAYMENT_RESULT') && (
            <motion.div
              key="payment"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PaymentFlow
                onComplete={() => {
                  reset();
                  onProceed();
                }}
                onCancel={handleCancelTransaction}
              />
            </motion.div>
          )}
      </AnimatePresence>
    </motion.div>
  );
}
