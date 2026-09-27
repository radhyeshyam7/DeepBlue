import { motion } from 'motion/react';
import { useAppStore } from '../../state/appStore';
import {
  logoVariants,
  logoPulseVariants,
  logoRingVariants,
  logoInnerRingVariants,
} from '../../animations/logo.motion';

type LogoMode = 'idle' | 'analyzing' | 'warning';

interface SaarthiLogoProps {
  mode?: LogoMode;
  size?: number;
  showText?: boolean;
}

export function SaarthiLogo({ mode = 'idle', size = 64, showText = true }: SaarthiLogoProps) {
  const { currentTheme } = useAppStore();

  // Get theme colors from CSS variables
  const getColors = () => {
    // Fallback colors
    let primary = '#3b82f6';
    let accent = '#60a5fa';

    // Try to get from CSS variables
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const computedPrimary = getComputedStyle(root).getPropertyValue('--logo-primary').trim();
      const computedAccent = getComputedStyle(root).getPropertyValue('--logo-accent').trim();
      
      if (computedPrimary) primary = computedPrimary;
      if (computedAccent) accent = computedAccent;
    }
    
    return { primary, accent };
  };

  const colors = getColors();

  return (
    <div className="flex items-center gap-3">
      {/* Logo SVG */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        variants={logoVariants}
        animate={mode}
        style={{ overflow: 'visible' }}
      >
        {/* Outer Ring - User Environment */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={colors.primary}
          strokeWidth="1.5"
          strokeOpacity="0.3"
          variants={logoRingVariants}
          animate={mode}
          style={{ transformOrigin: '50% 50%' }}
        />

        {/* Inner Ring - Risk Engine */}
        <motion.circle
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke={colors.accent}
          strokeWidth="2"
          strokeOpacity="0.5"
          strokeDasharray="4 4"
          variants={logoInnerRingVariants}
          animate={mode}
          style={{ transformOrigin: '50% 50%' }}
        />

        {/* Depth Layers */}
        <circle
          cx="50"
          cy="50"
          r="20"
          fill="none"
          stroke={colors.primary}
          strokeWidth="1"
          strokeOpacity="0.2"
        />

        {/* Core Pulse - Transaction Intent */}
        <motion.circle
          cx="50"
          cy="50"
          r="8"
          fill={colors.accent}
          variants={logoPulseVariants}
          animate={mode}
          style={{
            filter: `drop-shadow(0 0 8px ${colors.accent})`,
          }}
        />

        {/* Central Dot */}
        <circle cx="50" cy="50" r="3" fill={colors.primary} />

        {/* Flow Indicator - Directional markers */}
        {mode === 'analyzing' && (
          <>
            <motion.path
              d="M 50 5 L 52 10 L 48 10 Z"
              fill={colors.accent}
              opacity="0.6"
              animate={{
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0,
              }}
            />
            <motion.path
              d="M 95 50 L 90 52 L 90 48 Z"
              fill={colors.accent}
              opacity="0.6"
              animate={{
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.3,
              }}
            />
            <motion.path
              d="M 50 95 L 48 90 L 52 90 Z"
              fill={colors.accent}
              opacity="0.6"
              animate={{
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.6,
              }}
            />
            <motion.path
              d="M 5 50 L 10 48 L 10 52 Z"
              fill={colors.accent}
              opacity="0.6"
              animate={{
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.9,
              }}
            />
          </>
        )}
      </motion.svg>

      {/* Logo Text */}
      {showText && (
        <div>
          <h1 className="text-xl tracking-wide">Saarthi</h1>
          <p className="text-xs opacity-60 tracking-wider">
            Transaction Safety Layer
          </p>
        </div>
      )}
    </div>
  );
}