import { Variants } from 'motion/react';

// Transaction phase animation variants
export const transactionFormVariants: Variants = {
  idle: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  analyzing: {
    opacity: 0.5,
    scale: 0.98,
    filter: 'blur(2px)',
    transition: {
      duration: 0.4,
    },
  },
};

export const analysisOverlayVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
    },
  },
};

// PIN modal specific animations
export const pinDotVariants = (riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'): Variants => {
  const delay = riskLevel === 'HIGH' ? 0.12 : riskLevel === 'MEDIUM' ? 0.08 : 0.05;

  return {
    hidden: {
      scale: 0,
      opacity: 0,
    },
    visible: (index: number) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: index * delay,
        duration: 0.3,
        ease: 'easeOut',
      },
    }),
  };
};

export const pinKeyVariants: Variants = {
  idle: {
    scale: 1,
  },
  pressed: {
    scale: 0.95,
    transition: {
      duration: 0.1,
    },
  },
  hover: {
    scale: 1.05,
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
    transition: {
      duration: 0.2,
    },
  },
};
