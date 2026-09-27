import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTransactionStore } from '../state/transactionStore';
import { DeepBlueLogo } from './logo/DeepBlueLogo';
import { backdropVariants, modalVariants } from '../animations/page.motion';
import { pinDotVariants, pinKeyVariants } from '../animations/transaction.motion';
import { Lock } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
}

export function PinModal({ isOpen, onClose, onSubmit }: PinModalProps) {
  const { riskAnalysis } = useTransactionStore();
  const [pin, setPin] = useState('');
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const riskLevel = riskAnalysis?.riskLevel || 'LOW';
  const maxLength = 4;

  const handleKeyPress = (key: string) => {
    setPressedKey(key);
    
    if (key === 'delete') {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < maxLength) {
      setPin((prev) => prev + key);
    }

    setTimeout(() => setPressedKey(null), 100);
  };

  const handleSubmit = () => {
    if (pin.length === maxLength) {
      onSubmit(pin);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'delete', '0', 'submit'];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            style={{
              backdropFilter: 'blur(12px)',
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
              className="w-full max-w-md glass rounded-2xl p-8 pointer-events-auto"
              variants={modalVariants}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Faint logo in background */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-10">
                <DeepBlueLogo mode="idle" size={120} showText={false} />
              </div>

              {/* Content */}
              <div className="relative space-y-8">
                {/* Security message */}
                <div className="text-center space-y-2">
                  <div className="flex justify-center mb-4">
                    <Lock className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg tracking-wide">Enter Transaction PIN</h3>
                  <p className="text-xs text-blue-300/60 tracking-wide">
                    You're about to cross a secure boundary
                  </p>
                </div>

                {/* PIN dots */}
                <div className="flex justify-center gap-4">
                  {Array.from({ length: maxLength }).map((_, index) => (
                    <motion.div
                      key={index}
                      className="w-4 h-4 rounded-full border-2 border-blue-400/30"
                      custom={index}
                      variants={pinDotVariants(riskLevel)}
                      initial="hidden"
                      animate={index < pin.length ? 'visible' : 'hidden'}
                      style={{
                        backgroundColor: index < pin.length ? '#3b82f6' : 'transparent',
                        boxShadow: index < pin.length ? '0 0 12px rgba(59, 130, 246, 0.5)' : 'none',
                      }}
                    />
                  ))}
                </div>

                {/* PIN pad */}
                <div className="grid grid-cols-3 gap-3">
                  {keys.map((key) => {
                    const isDelete = key === 'delete';
                    const isSubmit = key === 'submit';
                    const isDisabled = (isSubmit && pin.length !== maxLength) || (isDelete && pin.length === 0);

                    return (
                      <motion.button
                        key={key}
                        onClick={() => {
                          if (isSubmit) {
                            handleSubmit();
                          } else {
                            handleKeyPress(key);
                          }
                        }}
                        disabled={isDisabled}
                        className="aspect-square rounded-lg glass-light flex items-center justify-center text-lg tracking-wide transition-colors"
                        variants={pinKeyVariants}
                        animate={pressedKey === key ? 'pressed' : 'idle'}
                        whileHover={!isDisabled ? 'hover' : 'idle'}
                        style={{
                          opacity: isDisabled ? 0.3 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          gridColumn: isSubmit ? 'span 3' : 'span 1',
                        }}
                      >
                        {isDelete ? '←' : isSubmit ? 'Submit' : key}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Warning text */}
                <p className="text-xs text-center text-blue-300/50 tracking-wide">
                  This action cannot be undone
                </p>

                {/* High risk indicator */}
                {riskLevel === 'HIGH' && (
                  <motion.div
                    className="text-center text-xs text-amber-400/70 tracking-wide"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    ⚠ High-risk transaction - please verify carefully
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
