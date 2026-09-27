import { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useTransactionStore } from '../state/transactionStore';

export function RiskDial() {
  const { riskAnalysis } = useTransactionStore();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const dialRef = useRef<HTMLDivElement>(null);

  const riskScore = riskAnalysis?.riskScore || 0;

  // Animated risk score with overshoot
  const animatedScore = useMotionValue(0);
  const springScore = useSpring(animatedScore, {
    stiffness: 80,
    damping: 15,
    mass: 1,
  });

  useEffect(() => {
    if (riskScore > 0) {
      // Overshoot the target slightly for high risk
      const overshoot = riskScore > 70 ? riskScore * 1.08 : riskScore * 1.03;
      animatedScore.set(overshoot);

      // Settle back to actual value
      setTimeout(() => {
        animatedScore.set(riskScore);
      }, 400);
    }
  }, [riskScore, animatedScore]);

  // Mouse tracking for parallax
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dialRef.current) return;

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / rect.width;
    const deltaY = (e.clientY - centerY) / rect.height;

    setMousePosition({ x: deltaX * 10, y: deltaY * 10 });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  // Calculate rotation angle (0-100 maps to -90 to 90 degrees)
  const rotation = useTransform(springScore, [0, 100], [-90, 90]);

  // Get color based on score
  const getColor = (score: number) => {
    if (score < 40) return '#3b82f6'; // Blue
    if (score < 70) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getRiskLabel = () => {
    if (!riskAnalysis) return '';
    return riskAnalysis.riskLevel.charAt(0) + riskAnalysis.riskLevel.slice(1).toLowerCase();
  };

  return (
    <motion.div
      ref={dialRef}
      className="relative py-12 flex flex-col items-center"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      {/* Dial container with parallax */}
      <motion.div
        className="relative w-64 h-64"
        style={{
          rotateX: mousePosition.y,
          rotateY: mousePosition.x,
          transformStyle: 'preserve-3d',
        }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        {/* Background circle */}
        <div className="absolute inset-0 rounded-full glass-light" />

        {/* Gradient arc background */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <defs>
            <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <circle
            cx="128"
            cy="128"
            r="100"
            fill="none"
            stroke="url(#dialGradient)"
            strokeWidth="8"
            strokeOpacity="0.2"
            strokeDasharray="314 314"
          />
        </svg>

        {/* Active arc */}
        <motion.svg className="absolute inset-0 w-full h-full -rotate-90">
          <motion.circle
            cx="128"
            cy="128"
            r="100"
            fill="none"
            stroke={getColor(riskScore)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="314 314"
            initial={{ strokeDashoffset: 314 }}
            animate={{
              strokeDashoffset: 314 - (springScore.get() / 100) * 314,
            }}
            style={{
              filter: `drop-shadow(0 0 8px ${getColor(riskScore)}80)`,
            }}
          />
        </motion.svg>

        {/* Center score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className="text-6xl tabular-nums tracking-tight"
            style={{ color: getColor(riskScore) }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          >
            {Math.round(springScore.get())}
          </motion.div>
          <div className="text-sm text-blue-300/60 tracking-wider mt-1">
            RISK SCORE
          </div>
        </div>

        {/* Needle */}
        <motion.div
          className="absolute top-1/2 left-1/2 origin-bottom"
          style={{
            rotate: rotation,
            x: '-50%',
            y: '-100%',
            height: '90px',
          }}
        >
          <div
            className="w-1 h-full rounded-full"
            style={{ backgroundColor: getColor(riskScore) }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
            style={{
              backgroundColor: getColor(riskScore),
              boxShadow: `0 0 12px ${getColor(riskScore)}`,
            }}
          />
        </motion.div>

        {/* Micro-vibration for high risk */}
        {riskScore > 70 && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              x: [0, 1, -1, 1, 0],
              y: [0, -1, 1, -1, 0],
            }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
        )}
      </motion.div>

      {/* Risk level label */}
      <motion.div
        className="mt-8 text-center space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h3
          className="text-2xl tracking-wide"
          style={{ color: getColor(riskScore) }}
        >
          {getRiskLabel()} Risk
        </h3>
        <p className="text-sm text-blue-300/60 tracking-wide max-w-xs">
          Based on transaction behavior patterns
        </p>
      </motion.div>
    </motion.div>
  );
}
