import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTransactionStore } from '../state/transactionStore';
import { SaarthiLogo } from './logo/SaarthiLogo';
import { backdropVariants, modalVariants } from '../animations/page.motion';
import { Lock } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
}

export function PinModal({ isOpen, onClose, onSubmit }: PinModalProps) {
  const { riskAnalysis } = useTransactionStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Use backend risk_level (source of truth)
  const riskLevel = riskAnalysis?.riskLevel || 'LOW';
  const maxLength = 4;
  const CORRECT_PIN = '1234'; // Demo PIN - in real system this would be validated by backend

  const handleKeyPress = (key: string) => {
    setError(''); // Clear error on new input
    
    if (key === 'delete') {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < maxLength) {
      setPin((prev) => prev + key);
    }
  };

  const handleSubmit = () => {
    if (pin.length === maxLength) {
      if (pin === CORRECT_PIN) {
        onSubmit(pin);
        setPin(''); // Clear PIN after successful submission
        setError('');
      } else {
        setError('Incorrect PIN. Try again.');
        setPin(''); // Clear PIN for retry
      }
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'delete', '0', 'submit'];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 modal-backdrop-dark"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(3, 7, 18, 0.92)',
              backdropFilter: 'blur(8px)',
            }}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="w-full max-w-md modal-solid-navy rounded-2xl p-8 pointer-events-auto relative shadow-2xl text-white"
              variants={modalVariants}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#0B132B',
                border: '1.5px solid rgba(59, 130, 246, 0.4)',
                boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 40px rgba(59, 130, 246, 0.2)',
              }}
            >
              {/* Content */}
              <div className="relative space-y-6">
                {/* Header */}
                <div className="text-center space-y-3">
                  <div className="flex justify-center mb-2">
                    <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-cyan-300" />
                    </div>
                  </div>
                  <h3 className="text-xl tracking-wide font-bold text-white">Verify Transaction</h3>
                  <p className="text-sm text-blue-200/80 tracking-wide">
                    Enter your 4-digit PIN to authorize this payment
                  </p>
                </div>

                {/* PIN dots */}
                <div className="flex justify-center gap-3 py-4">
                  {Array.from({ length: maxLength }).map((_, index) => (
                    <motion.div
                      key={index}
                      className="w-3.5 h-3.5 rounded-full border-2"
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={index < pin.length ? {
                        scale: 1.1,
                        opacity: 1,
                        borderColor: '#38bdf8',
                        backgroundColor: '#38bdf8',
                        transition: {
                          delay: index * 0.05,
                          duration: 0.2,
                        }
                      } : {
                        scale: 0.8,
                        opacity: 0.5,
                        borderColor: 'rgba(59, 130, 246, 0.5)',
                        backgroundColor: 'transparent',
                      }}
                    />
                  ))}
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="text-center text-sm text-red-300 bg-red-950/60 border border-red-500/40 rounded-lg py-2 px-4 font-semibold"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* PIN pad */}
                <div className="grid grid-cols-3 gap-2.5">
                  {keys.map((key) => {
                    const isDelete = key === 'delete';
                    const isSubmit = key === 'submit';
                    const isDisabled = (isSubmit && pin.length !== maxLength) || (isDelete && pin.length === 0);

                    if (isSubmit) {
                      return (
                        <motion.button
                          key={key}
                          onClick={handleSubmit}
                          disabled={isDisabled}
                          className="col-span-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-blue-400/40 shadow-lg"
                          whileHover={!isDisabled ? { scale: 1.02 } : {}}
                          whileTap={!isDisabled ? { scale: 0.98 } : {}}
                        >
                          Confirm Payment
                        </motion.button>
                      );
                    }

                    return (
                      <motion.button
                        key={key}
                        onClick={() => handleKeyPress(key)}
                        disabled={isDisabled}
                        className="aspect-square rounded-xl flex items-center justify-center text-lg font-bold tracking-wide transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white hover:bg-blue-600/30 active:bg-blue-600/50"
                        style={{
                          backgroundColor: '#0E1C3E',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                        }}
                        whileHover={!isDisabled ? { scale: 1.05 } : {}}
                        whileTap={!isDisabled ? { scale: 0.95 } : {}}
                      >
                        {isDelete ? '⌫' : key}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Demo hint */}
                <p className="text-xs text-center text-blue-300/60 tracking-wide">
                  Demo PIN: <span className="font-mono text-cyan-300">1234</span>
                </p>

                {/* High risk warning */}
                {riskLevel === 'HIGH' && (
                  <motion.div
                    className="flex items-center justify-center gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-500/40 rounded-lg py-2 px-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-base">⚠</span>
                    <span className="tracking-wide">High-risk transaction detected</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
