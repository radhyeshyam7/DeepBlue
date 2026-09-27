import { motion } from 'motion/react';
import { useTransactionStore } from '../state/transactionStore';
import { useAppStore } from '../state/appStore';

export function AmbientBackground() {
  const { phase, riskAnalysis } = useTransactionStore();
  const { ambientRiskLevel } = useAppStore();

  // Calculate ambient intensity based on ambient risk (from app store)
  const getRiskIntensity = () => {
    switch (ambientRiskLevel) {
      case 'HIGH':
        return 0.8;
      case 'MEDIUM':
        return 0.5;
      case 'LOW':
      default:
        return 0.2;
    }
  };

  const intensity = getRiskIntensity();
  const isAnalyzing = phase === 'ANALYZING';

  // Dynamic gradient colors based on ambient risk
  const getGradientColors = () => {
    if (phase === 'IDLE' && ambientRiskLevel === 'LOW') {
      return {
        color1: '#0a0e27',
        color2: '#1e2a52',
        color3: '#0f1535',
      };
    }

    if (ambientRiskLevel === 'HIGH' || intensity > 0.7) {
      return {
        color1: '#0a0e27',
        color2: '#7f1d1d',
        color3: '#991b1b',
      };
    } else if (ambientRiskLevel === 'MEDIUM' || intensity > 0.4) {
      return {
        color1: '#0a0e27',
        color2: '#78350f',
        color3: '#92400e',
      };
    } else {
      return {
        color1: '#0a0e27',
        color2: '#1e3a8a',
        color3: '#1e40af',
      };
    }
  };

  const colors = getGradientColors();

  // Animation speed based on risk and phase
  const getAnimationDuration = () => {
    if (isAnalyzing) return 4; // Faster during analysis
    if (ambientRiskLevel === 'HIGH') return 6; // Faster for high risk
    if (ambientRiskLevel === 'MEDIUM') return 8; // Medium speed
    return 12; // Slow and calm for low risk
  };

  const duration = getAnimationDuration();

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Animated gradient mesh */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 20% 50%, ${colors.color2} 0%, transparent 50%), 
                       radial-gradient(circle at 80% 50%, ${colors.color3} 0%, transparent 50%),
                       ${colors.color1}`,
        }}
        animate={{
          backgroundPosition: [
            '20% 50%, 80% 50%',
            '25% 45%, 75% 55%',
            '20% 50%, 80% 50%',
          ],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Subtle grain texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient glow layer */}
      {phase === 'RESULT' && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: intensity * 0.3 }}
          transition={{ duration: 1.5 }}
          style={{
            background: `radial-gradient(circle at 50% 50%, ${
              intensity > 0.7
                ? 'rgba(239, 68, 68, 0.1)'
                : intensity > 0.4
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(59, 130, 246, 0.1)'
            } 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}