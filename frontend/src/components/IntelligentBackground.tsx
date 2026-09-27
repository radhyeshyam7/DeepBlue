import { motion } from 'motion/react';
import { useAppStore } from '../state/appStore';

export function IntelligentBackground() {
  const { ambientRiskLevel } = useAppStore();

  // Get animation speed based on risk
  const getSpeed = () => {
    switch (ambientRiskLevel) {
      case 'HIGH':
        return 15; // Faster, tighter
      case 'MEDIUM':
        return 20;
      case 'LOW':
      default:
        return 30; // Slow, calm
    }
  };

  const speed = getSpeed();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Soft grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Abstract flow lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
        </defs>

        {/* Flowing curved lines */}
        <motion.path
          d="M 0 200 Q 400 100, 800 200 T 1600 200"
          stroke="url(#flowGradient)"
          strokeWidth="1"
          fill="none"
          animate={{
            d: [
              'M 0 200 Q 400 100, 800 200 T 1600 200',
              'M 0 200 Q 400 300, 800 200 T 1600 200',
              'M 0 200 Q 400 100, 800 200 T 1600 200',
            ],
          }}
          transition={{
            duration: speed,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.path
          d="M 0 400 Q 500 350, 1000 400 T 2000 400"
          stroke="url(#flowGradient)"
          strokeWidth="1"
          fill="none"
          animate={{
            d: [
              'M 0 400 Q 500 350, 1000 400 T 2000 400',
              'M 0 400 Q 500 450, 1000 400 T 2000 400',
              'M 0 400 Q 500 350, 1000 400 T 2000 400',
            ],
          }}
          transition={{
            duration: speed * 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        />

        <motion.path
          d="M 0 600 Q 600 550, 1200 600 T 2400 600"
          stroke="url(#flowGradient)"
          strokeWidth="1"
          fill="none"
          animate={{
            d: [
              'M 0 600 Q 600 550, 1200 600 T 2400 600',
              'M 0 600 Q 600 650, 1200 600 T 2400 600',
              'M 0 600 Q 600 550, 1200 600 T 2400 600',
            ],
          }}
          transition={{
            duration: speed * 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
      </svg>

      {/* Floating particles - subtle depth indicator */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: 'rgba(59, 130, 246, 0.2)',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: speed / 2 + Math.random() * 10,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Ambient depth circles - react to risk */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          scale: ambientRiskLevel === 'HIGH' ? [1, 1.1, 1] : [1, 1.05, 1],
          opacity: ambientRiskLevel === 'HIGH' ? [0.3, 0.5, 0.3] : [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: ambientRiskLevel === 'HIGH' ? 4 : 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(96, 165, 250, 0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          scale: ambientRiskLevel === 'HIGH' ? [1, 1.1, 1] : [1, 1.05, 1],
          opacity: ambientRiskLevel === 'HIGH' ? [0.3, 0.5, 0.3] : [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: ambientRiskLevel === 'HIGH' ? 4 : 8,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />
    </div>
  );
}
