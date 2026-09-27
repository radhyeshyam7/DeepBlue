import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppStore } from './state/appStore';
import { useAuthStore } from './state/authStore';
import { useTransactionStore } from './state/transactionStore';
import { submitTransactionFeedback } from './api/transactionApi';

// Components
import { BootSequence } from './components/BootSequence';
import { AuthPage } from './components/AuthPage';
import { IntelligentBackground } from './components/IntelligentBackground';
import { AmbientBackground } from './components/AmbientBackground';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { PayPage } from './components/PayPage';
import { TransactionHistory } from './components/TransactionHistory';
import { ProfilePage } from './components/ProfilePage';
import { PinModal } from './components/PinModal';
import { BottomNavigation } from './components/BottomNavigation';
import { FraudCenterPage } from './components/FraudCenterPage';
import { TransactionFeedbackModal } from './components/TransactionFeedbackModal';

export default function App() {
  const { bootComplete, currentTheme, setAmbientRisk } = useAppStore();
  const { isAuthenticated, role } = useAuthStore();
  const {
    phase,
    setPhase,
    transaction,
    reset,
    riskAnalysis,
  } = useTransactionStore();

  const [currentPage, setCurrentPage] = useState<'home' | 'pay' | 'history' | 'fraud-center' | 'profile'>('home');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackTxnData, setFeedbackTxnData] = useState<{
    id?: string;
    amount?: string;
    payee?: string;
  }>({});

  // Enforce role-based landing page and navigation boundaries
  useEffect(() => {
    if (role === 'ADMIN') {
      if (currentPage !== 'fraud-center') {
        setCurrentPage('fraud-center');
      }
    } else {
      if (currentPage === 'fraud-center') {
        setCurrentPage('home');
      }
    }
  }, [role]);

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

  const handleNavigate = (page: string) => {
    // Strict RBAC route boundaries - zero navigation cross-over
    if (role === 'ADMIN' && page !== 'fraud-center') {
      setCurrentPage('fraud-center');
      return;
    }
    if (role === 'USER' && page === 'fraud-center') {
      setCurrentPage('home');
      return;
    }

    setCurrentPage(page as any);
    // Reset transaction state when navigating away from pay
    if (page !== 'pay' && phase !== 'IDLE') {
      reset();
    }
  };

  const handleRoleBack = () => {
    handleNavigate(role === 'ADMIN' ? 'fraud-center' : 'home');
  };

  const handlePayComplete = () => {
    // Capture transaction info for the post-transaction feedback loop
    setFeedbackTxnData({
      id: riskAnalysis?.transactionId,
      amount: transaction.amount,
      payee: transaction.payee
    });
    setShowFeedbackModal(true);
    setCurrentPage('home');
  };

  const handlePayCancel = () => {
    setCurrentPage('home');
  };

  const handlePinSubmit = async (pin: string) => {
    try {
      // Submit feedback that user proceeded WITH PIN verification
      if (riskAnalysis?.transactionId) {
        const feedbackResponse = await submitTransactionFeedback(
          riskAnalysis.transactionId, 
          'PROCEEDED',
          pin
        );
        
        if (!feedbackResponse.success) {
          alert(`PIN verification failed: ${feedbackResponse.error || 'Unknown error'}\n\nAttempts remaining: ${feedbackResponse.attemptsRemaining || 0}`);
          return; // Don't reset, allow retry
        }
      }
      
      // PIN verified successfully - proceed with transaction
      alert(`Transaction confirmed!\n\nPayee: ${transaction.payee}\nAmount: $${transaction.amount}\n\nTransaction executed successfully.`);
      
      // Reset to start new transaction
      reset();
    } catch (error) {
      console.error('Error submitting transaction:', error);
      alert('Transaction submission failed. Please try again.');
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this transaction?')) {
      try {
        // Submit feedback that user cancelled
        if (riskAnalysis?.transactionId) {
          await submitTransactionFeedback(riskAnalysis.transactionId, 'CANCELLED');
        }
      } catch (error) {
        console.error('Error submitting cancellation feedback:', error);
      }
      reset();
      setCurrentPage('home');
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
    <div className="min-h-screen relative overflow-hidden pb-24">
      {/* Layered background system */}
      <IntelligentBackground />
      <AmbientBackground />

      {/* Main content */}
      <div className="relative z-10">
        <Header onSettingsClick={() => handleNavigate('profile')} />

        {/* Main content area - Standardized max-w-2xl for all pages */}
        <div className="flex items-center justify-center px-4 py-6 sm:py-8">
          <motion.div
            className="w-full max-w-2xl rounded-2xl p-5 sm:p-7 relative shadow-2xl transition-all duration-300"
            style={{
              backgroundColor: '#080E1EF8',
              border: '1px solid rgba(59, 130, 246, 0.28)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 30px rgba(59, 130, 246, 0.1)',
            }}
            animate={{
              scale: phase === 'ANALYZING' ? 0.96 : 1,
              filter: phase === 'ANALYZING' ? 'blur(2px)' : 'blur(0px)',
            }}
            transition={{ duration: 0.4 }}
          >
            <AnimatePresence mode="wait">
              {/* Home Page */}
              {currentPage === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <HomePage onNavigate={handleNavigate} />
                </motion.div>
              )}

              {/* Pay Page */}
              {currentPage === 'pay' && (
                <motion.div
                  key="pay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <PayPage
                    onBack={() => handleNavigate('home')}
                    onProceed={handlePayComplete}
                    onCancel={handlePayCancel}
                  />
                </motion.div>
              )}

              {/* Transaction History */}
              {currentPage === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TransactionHistory onBack={handleRoleBack} />
                </motion.div>
              )}

              {/* Fraud Center Page */}
              {currentPage === 'fraud-center' && (
                <motion.div
                  key="fraud-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FraudCenterPage onBack={handleRoleBack} />
                </motion.div>
              )}

              {/* Profile Page */}
              {currentPage === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProfilePage onBack={handleRoleBack} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation currentPage={currentPage} onNavigate={handleNavigate} />

      {/* PIN Modal - appears over everything */}
      <PinModal
        isOpen={phase === 'PIN'}
        onClose={handleCancel}
        onSubmit={handlePinSubmit}
      />

      {/* Post-Transaction Feedback Loop Modal */}
      <TransactionFeedbackModal
        isOpen={showFeedbackModal}
        transactionId={feedbackTxnData.id}
        amount={feedbackTxnData.amount}
        payee={feedbackTxnData.payee}
        onClose={() => setShowFeedbackModal(false)}
      />
    </div>
  );
}