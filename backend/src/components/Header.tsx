import { motion } from 'motion/react';
import { useTransactionStore } from '../state/transactionStore';
import { useAppStore } from '../state/appStore';
import { DeepBlueLogo } from './logo/DeepBlueLogo';
import { Settings } from 'lucide-react';

export function Header({ onSettingsClick }: { onSettingsClick?: () => void }) {
  const { riskAnalysis, phase } = useTransactionStore();
  const { ambientRiskLevel } = useAppStore();

  // Determine logo mode based on transaction phase
  const getLogoMode = () => {
    if (phase === 'ANALYZING') return 'analyzing';
    if (ambientRiskLevel === 'HIGH') return 'warning';
    return 'idle';
  };

  const getRiskStatusColor = () => {
    if (phase !== 'RESULT' || !riskAnalysis) return '#3b82f6'; // Default blue

    switch (riskAnalysis.riskLevel) {
      case 'LOW':
        return '#3b82f6';
      case 'MEDIUM':
        return '#f59e0b';
      case 'HIGH':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  const getRiskStatusLabel = () => {
    if (phase !== 'RESULT' || !riskAnalysis) return 'Safe';

    switch (riskAnalysis.riskLevel) {
      case 'LOW':
        return 'Safe';
      case 'MEDIUM':
        return 'Caution';
      case 'HIGH':
        return 'Risk';
      default:
        return 'Safe';
    }
  };

  return (
    <header className="relative z-10 px-8 py-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <DeepBlueLogo mode={getLogoMode()} size={48} showText={false} />

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* Risk status indicator */}
          <motion.div
            className="flex items-center gap-3 px-4 py-2 rounded-full glass-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getRiskStatusColor() }}
              animate={{
                boxShadow: [
                  `0 0 0 0 ${getRiskStatusColor()}00`,
                  `0 0 0 8px ${getRiskStatusColor()}00`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-sm tracking-wide">{getRiskStatusLabel()}</span>
          </motion.div>

          {/* Settings button */}
          {onSettingsClick && (
            <motion.button
              onClick={onSettingsClick}
              className="p-2 glass-light rounded-lg hover:bg-white/[0.07] transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-5 h-5 text-blue-400" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
}