import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';

export function SecurityBoundary() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative py-8 my-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glowing divider line */}
      <div className="relative h-px">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/40 to-transparent"
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
            background: 'linear-gradient(to right, transparent, rgba(59, 130, 246, 0.3), transparent)',
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Center label */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 glass rounded-full flex items-center gap-2"
        animate={{
          scale: isHovered ? 1.05 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <Shield className="w-3 h-3 text-blue-400" />
        <span className="text-xs tracking-widest uppercase text-blue-300/80">
          Security Boundary
        </span>
      </motion.div>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute left-1/2 top-full -translate-x-1/2 mt-4 px-4 py-2 glass rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xs text-blue-300/80 tracking-wide whitespace-nowrap">
              Actions beyond this point may be irreversible
            </p>
            <motion.div
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500/20 rotate-45"
              style={{ borderTop: '1px solid rgba(59, 130, 246, 0.3)', borderLeft: '1px solid rgba(59, 130, 246, 0.3)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient pulse */}
      <motion.div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(59, 130, 246, 0)',
            '0 0 30px 10px rgba(59, 130, 246, 0.2)',
            '0 0 0 0 rgba(59, 130, 246, 0)',
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
