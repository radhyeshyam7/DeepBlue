import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppStore } from './state/appStore';
import { useAuthStore } from './state/authStore';
import { useTransactionStore } from './state/transactionStore';
import { analyzeTransaction } from './api/transactionApi';

// Components
import { BootSequence } from './components/BootSequence';
import { AuthPage } from './components/AuthPage';
import { IntelligentBackground } from './components/IntelligentBackground';
import { AmbientBackground } from './components/AmbientBackground';
import { Header } from './components/Header';
import { TransactionForm } from './components/TransactionForm';
import { AnalysisState } from './components/AnalysisState';
import { RiskDial } from './components/RiskDial';
import { RiskCards } from './components/RiskCards';
import { SecurityBoundary } from './components/SecurityBoundary';
import { DecisionPanel } from './components/DecisionPanel';
import { PinModal } from './components/PinModal';
import { SettingsPage } from './components/SettingsPage';

export default function App() {
  const { bootComplete, currentPage, setCurrentPage, setAmbientRisk, currentTheme } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const {
    phase,
    setPhase,
    transaction,
    setRiskAnalysis,
    isKnownPayee,
    amountChangeCount,
    hasHesitation,
    reset,
    riskAnalysis,
  } = useTransactionStore();

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Update ambient risk based on transaction risk analysis
  useEffect(() => {
    if (riskAnalysis) {
      setAmbientRisk(riskAnalysis.riskLevel);
    } else {
      setAmbientRisk('LOW');
    }
  }, [riskAnalysis, setAmbientRisk]);

  const handleContinue = async () => {
    // Transition to analyzing state
    setPhase('ANALYZING');

    // Call backend API
    const analysis = await analyzeTransaction(
      transaction,
      isKnownPayee(transaction.payee),
      amountChangeCount,
      hasHesitation
    );

    setRiskAnalysis(analysis);
    setPhase('RESULT');
  };

  const handleProceed = () => {
    // Move to PIN entry
    setPhase('PIN');
  };

  const handlePinSubmit = (pin: string) => {
    // In production, verify PIN and execute transaction
    alert(`Transaction confirmed!\n\nPIN: ${pin}\nPayee: ${transaction.payee}\nAmount: $${transaction.amount}\n\nTransaction would be executed here.`);
    
    // Reset to start new transaction
    reset();
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this transaction?')) {
      reset();
    }
  };

  // Show boot sequence first
  if (!bootComplete) {
    return <BootSequence />;
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Layered background system */}
      <IntelligentBackground />
      <AmbientBackground />

      {/* Main content */}
      <div className="relative z-10">
        <Header onSettingsClick={() => setCurrentPage('settings')} />

        {/* Main content area */}
        <div className="flex items-center justify-center px-4 py-8">
          <motion.div
            className="w-full max-w-2xl glass rounded-2xl p-8 relative"
            animate={{
              scale: phase === 'ANALYZING' ? 0.96 : 1,
              filter: phase === 'ANALYZING' ? 'blur(2px)' : 'blur(0px)',
            }}
            transition={{ duration: 0.4 }}
          >
            <AnimatePresence mode="wait">
              {/* Settings Page */}
              {currentPage === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <SettingsPage onBack={() => setCurrentPage('transaction')} />
                </motion.div>
              )}

              {/* Transaction Flow */}
              {currentPage === 'transaction' && (
                <>
                  {/* IDLE STATE - Transaction Input */}
                  {phase === 'IDLE' && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
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

                  {/* RESULT STATE - Risk visualization and decision */}
                  {phase === 'RESULT' && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="space-y-6">
                        {/* Transaction summary */}
                        <motion.div
                          className="glass-light rounded-lg p-4 space-y-2"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-blue-300/60 tracking-wide">Payee</span>
                            <span className="tracking-wide">{transaction.payee}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-blue-300/60 tracking-wide text-sm">Amount</span>
                            <span className="text-2xl tracking-wide">
                              ${parseFloat(transaction.amount).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-blue-300/60 tracking-wide">Type</span>
                            <span className="tracking-wide capitalize">{transaction.intent}</span>
                          </div>
                        </motion.div>

                        {/* Risk dial visualization */}
                        <RiskDial />

                        {/* Risk explanation cards */}
                        <RiskCards />

                        {/* Security boundary */}
                        <SecurityBoundary />

                        {/* Decision panel */}
                        <DecisionPanel onProceed={handleProceed} onCancel={handleCancel} />
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* PIN Modal - appears over everything */}
      <PinModal
        isOpen={phase === 'PIN'}
        onClose={handleCancel}
        onSubmit={handlePinSubmit}
      />
    </div>
  );
}