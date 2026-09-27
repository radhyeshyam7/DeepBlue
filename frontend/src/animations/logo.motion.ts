import { Variants } from 'motion/react';

// Logo animation variants - reusable across the entire app
export const logoVariants: Variants = {
  idle: {
    rotate: [0, 4, -4, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  analyzing: {
    rotate: [0, 360],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'linear',
    },
  },
  warning: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const logoPulseVariants: Variants = {
  idle: {
    opacity: [0.6, 1, 0.6],
    scale: [1, 1.1, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  analyzing: {
    opacity: [0.8, 1, 0.8],
    scale: [1, 1.15, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  warning: {
    opacity: [0.7, 1, 0.7],
    scale: [1, 1.05, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const logoRingVariants: Variants = {
  idle: {
    rotate: 0,
  },
  analyzing: {
    rotate: [0, 360],
    transition: {
      duration: 12,
      repeat: Infinity,
      ease: 'linear',
    },
  },
  warning: {
    rotate: [0, -180, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const logoInnerRingVariants: Variants = {
  idle: {
    rotate: 0,
  },
  analyzing: {
    rotate: [0, -360],
    transition: {
      duration: 15,
      repeat: Infinity,
      ease: 'linear',
    },
  },
  warning: {
    rotate: [0, 180, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Boot sequence animation variants
export const bootVariants: Variants = {
  scene1: {
    opacity: 1,
    transition: { duration: 1 },
  },
  scene2: {
    opacity: 1,
    pathLength: 1,
    transition: { duration: 1.5 },
  },
  scene3: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.5 },
  },
  scene4: {
    opacity: 1,
    transition: { duration: 1 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.5 },
  },
};
