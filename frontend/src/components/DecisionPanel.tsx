import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTransactionStore } from '../state/transactionStore';
import { Lock, X, AlertTriangle, CheckCircle } from 'lucide-react';

export function DecisionPanel({ onProceed, onCancel }: { onProceed: () => void; onCancel: () => void }) {
  const { riskAnalysis } = useTransactionStore();
  const [coolingOffProgress, setCoolingOffProgress] = useState(0);
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

  const riskLevel = riskAnalysis?.riskLevel || 'LOW';
  const coolingOff = riskAnalysis?.coolingOff || false;
  // Use backend-provided delaySeconds (source of truth)
  const delaySeconds = riskAnalysis?.delaySeconds || 0;

  // Cooling-off period from backend delaySeconds
  useEffect(() => {
    if (coolingOff && delaySeconds > 0 && !isButtonEnabled) {
      const duration = delaySeconds * 1000; // Convert to milliseconds
      const interval = 50; // Update every 50ms for smooth animation
      const steps = duration / interval;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        setCoolingOffProgress((currentStep / steps) * 100);

        if (currentStep >= steps) {
          setIsButtonEnabled(true);
          clearInterval(timer);
        }
      }, interval);

      return () => clearInterval(timer);
    } else if (!coolingOff || delaySeconds === 0) {
      setIsButtonEnabled(true);
      setCoolingOffProgress(100);
    }
  }, [coolingOff, delaySeconds, isButtonEnabled]);

  const getButtonConfig = () => {
    switch (riskLevel) {
      case 'LOW':
        return {
          label: 'Proceed to PIN',
          subtext: 'Transaction appears safe',
          icon: Lock,
          color: '#3b82f6',
        };
      case 'MEDIUM':
        return {
          label: 'Proceed with Extra Verification',
          subtext: 'Please review transaction details',
          icon: AlertTriangle,
          color: '#f59e0b',
        };
      case 'HIGH':
        return {
          label: 'Proceed with High Risk',
          subtext: 'We strongly recommend reviewing this transaction',
          icon: AlertTriangle,
          color: '#ef4444',
        };
      default:
        return {
          label: 'Proceed',
          subtext: '',
          icon: Lock,
          color: '#3b82f6',
        };
    }
  };

  const buttonConfig = getButtonConfig();
  const Icon = buttonConfig.icon;

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
    >
      {/* Primary action button */}
      <div className="relative">
        <motion.button
          onClick={onProceed}
          disabled={!isButtonEnabled}
          className="w-full px-6 py-4 rounded-lg flex items-center justify-center gap-3 transition-all duration-300 group relative overflow-hidden"
          style={{
            background: isButtonEnabled
              ? `${buttonConfig.color}20`
              : 'rgba(255, 255, 255, 0.03)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: isButtonEnabled
              ? `${buttonConfig.color}40`
              : 'rgba(255, 255, 255, 0.05)',
            cursor: isButtonEnabled ? 'pointer' : 'not-allowed',
            opacity: isButtonEnabled ? 1 : 0.5,
          }}
          whileHover={isButtonEnabled ? { scale: 1.01 } : {}}
          whileTap={isButtonEnabled ? { scale: 0.99 } : {}}
        >
          {/* Progress bar for cooling-off period */}
          {coolingOff && !isButtonEnabled && (
            <motion.div
              className="absolute inset-0 bg-blue-500/10"
              style={{
                width: `${coolingOffProgress}%`,
                transformOrigin: 'left',
              }}
            />
          )}

          <Icon
            className="w-5 h-5 relative z-10"
            style={{ color: isButtonEnabled ? buttonConfig.color : '#64748b' }}
          />
          <span className="tracking-wide relative z-10">
            {!isButtonEnabled && coolingOff
              ? 'Please wait...'
              : buttonConfig.label}
          </span>
        </motion.button>

        {/* Subtext */}
        <AnimatePresence>
          {buttonConfig.subtext && (
            <motion.p
              className="text-xs text-center mt-2 tracking-wide"
              style={{ color: `${buttonConfig.color}80` }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {buttonConfig.subtext}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Secondary action - Review details (for medium/high risk) */}
      {(riskLevel === 'MEDIUM' || riskLevel === 'HIGH') && (
        <motion.button
          className="w-full px-6 py-3 rounded-lg text-sm text-blue-300/80 hover:text-blue-300 transition-colors tracking-wide glass-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          whileHover={{ scale: 1.01 }}
        >
          Review transaction details again
        </motion.button>
      )}

      {/* Cancel button */}
      <motion.button
        onClick={onCancel}
        className="w-full px-6 py-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-all duration-300 group"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'rgba(255, 255, 255, 0.05)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        whileHover={{ scale: 1.01, background: 'rgba(239, 68, 68, 0.1)' }}
        whileTap={{ scale: 0.99 }}
      >
        <X className="w-4 h-4 text-red-400/60 group-hover:text-red-400 transition-colors" />
        <span className="text-red-400/60 group-hover:text-red-400 transition-colors tracking-wide">
          Cancel Transaction
        </span>
      </motion.button>

      {/* Cooling-off timer display */}
      {coolingOff && !isButtonEnabled && (
        <motion.div
          className="flex items-center justify-center gap-2 text-xs text-blue-300/60 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span>
            Mandatory review period: {Math.ceil((delaySeconds * (100 - coolingOffProgress)) / 100)}s
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
