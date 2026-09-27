import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../state/appStore';

export function BootSequence() {
  const { setBootComplete } = useAppStore();
  const [scene, setScene] = useState(1);

  useEffect(() => {
    const timeline = [
      { scene: 1, duration: 1500 }, // Intent
      { scene: 2, duration: 1800 }, // Flow
      { scene: 3, duration: 2000 }, // Analysis
      { scene: 4, duration: 1500 }, // Protection
      { scene: 5, duration: 1000 }, // Entry
    ];

    let currentTime = 0;

    timeline.forEach((step, index) => {
      setTimeout(() => {
        setScene(step.scene);
        
        // Complete boot after final scene
        if (index === timeline.length - 1) {
          setTimeout(() => {
            setBootComplete(true);
          }, step.duration);
        }
      }, currentTime);

      currentTime += step.duration;
    });
  }, [setBootComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-[#0a0e27] flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Skip button for development */}
      <button
        onClick={() => setBootComplete(true)}
        className="absolute top-4 right-4 px-3 py-1 text-xs text-blue-400/50 hover:text-blue-400 transition-colors"
      >
        Skip
      </button>

      <div className="relative w-full max-w-2xl px-8">
        <AnimatePresence mode="wait">
          {/* Scene 1 - Intent */}
          {scene === 1 && (
            <motion.div
              key="scene1"
              className="text-center space-y-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="w-3 h-3 rounded-full bg-blue-400 mx-auto"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                style={{
                  boxShadow: '0 0 30px rgba(59, 130, 246, 0.6)',
                }}
              />
              <motion.p
                className="text-sm text-blue-300/60 tracking-wider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Every transaction begins with intent
              </motion.p>
            </motion.div>
          )}

          {/* Scene 2 - Flow */}
          {scene === 2 && (
            <motion.div
              key="scene2"
              className="relative h-64"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <svg className="absolute inset-0 w-full h-full">
                {/* Main path */}
                <motion.line
                  x1="50%"
                  y1="20%"
                  x2="50%"
                  y2="50%"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  initial={{ strokeWidth: 0, opacity: 0 }}
                  animate={{ strokeWidth: 2, opacity: 1 }}
                  transition={{ duration: 0.8 }}
                />
                
                {/* Branch paths */}
                {[
                  { x: '30%', opacity: 0.3 },
                  { x: '40%', opacity: 0.5 },
                  { x: '60%', opacity: 0.5 },
                  { x: '70%', opacity: 0.3 },
                ].map((branch, i) => (
                  <motion.line
                    key={i}
                    x1="50%"
                    y1="50%"
                    x2={branch.x}
                    y2="80%"
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    initial={{ strokeWidth: 0, opacity: 0 }}
                    animate={{
                      strokeWidth: 1.5,
                      opacity: branch.opacity,
                    }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                  />
                ))}
              </svg>
            </motion.div>
          )}

          {/* Scene 3 - Analysis */}
          {scene === 3 && (
            <motion.div
              key="scene3"
              className="flex flex-col items-center space-y-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Logo assembly */}
              <motion.svg
                width="120"
                height="120"
                viewBox="0 0 100 100"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              >
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeOpacity="0.3"
                  initial={{ r: 0 }}
                  animate={{ r: 45 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="30"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  strokeOpacity="0.5"
                  strokeDasharray="4 4"
                  initial={{ r: 0 }}
                  animate={{ r: 30 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="8"
                  fill="#60a5fa"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                  style={{
                    filter: 'drop-shadow(0 0 8px #60a5fa)',
                  }}
                />
              </motion.svg>

              {/* Scanning light */}
              <motion.div
                className="w-64 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: [0, 1, 0], x: 100 }}
                transition={{ delay: 0.5, duration: 1.5, repeat: 1 }}
              />
            </motion.div>
          )}

          {/* Scene 4 - Protection */}
          {scene === 4 && (
            <motion.div
              key="scene4"
              className="text-center space-y-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.svg
                width="120"
                height="120"
                viewBox="0 0 100 100"
                className="mx-auto"
              >
                {/* Multiple paths, one brightens */}
                {[20, 35, 50, 65, 80].map((x, i) => (
                  <motion.line
                    key={i}
                    x1={x}
                    y1="20"
                    x2={x}
                    y2="80"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    initial={{ opacity: 0.3 }}
                    animate={{
                      opacity: i === 2 ? 1 : 0.2,
                      strokeWidth: i === 2 ? 3 : 1.5,
                    }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    style={{
                      filter: i === 2 ? 'drop-shadow(0 0 8px #3b82f6)' : 'none',
                    }}
                  />
                ))}
              </motion.svg>
              
              <motion.p
                className="text-sm text-blue-300/60 tracking-wider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                We help you choose wisely
              </motion.p>
            </motion.div>
          )}

          {/* Scene 5 - Entry (Logo settle) */}
          {scene === 5 && (
            <motion.div
              key="scene5"
              className="flex justify-center"
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.svg
                width="80"
                height="80"
                viewBox="0 0 100 100"
                animate={{
                  rotate: [0, 4, -4, 0],
                }}
                transition={{
                  duration: 2,
                  ease: 'easeInOut',
                }}
              >
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeOpacity="0.3"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="30"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  strokeOpacity="0.5"
                  strokeDasharray="4 4"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="8"
                  fill="#60a5fa"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{
                    filter: 'drop-shadow(0 0 8px #60a5fa)',
                  }}
                />
              </motion.svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}