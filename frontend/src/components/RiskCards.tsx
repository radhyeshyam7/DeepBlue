import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTransactionStore } from '../state/transactionStore';
import {
  UserPlus,
  TrendingUp,
  Clock,
  AlertCircle,
  AlertTriangle,
  Zap,
  Activity,
  ChevronDown,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  'user-plus': UserPlus,
  'trending-up': TrendingUp,
  clock: Clock,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  zap: Zap,
  activity: Activity,
};

// Helper function to get icon component safely
const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || AlertCircle;
};

export function RiskCards() {
  const { riskAnalysis } = useTransactionStore();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [visibleCards, setVisibleCards] = useState(1);

  const signals = riskAnalysis?.signals || [];

  // Progressive disclosure - show more cards on scroll or hover
  const handleScroll = () => {
    if (visibleCards < signals.length) {
      setVisibleCards((prev) => Math.min(prev + 1, signals.length));
    }
  };

  const toggleCard = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  if (signals.length === 0) return null;

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      onMouseEnter={handleScroll}
    >
      <h4 className="text-sm text-blue-300/60 tracking-wider mb-4">
        RISK FACTORS DETECTED
      </h4>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {signals.slice(0, visibleCards).map((signal, index) => {
            const Icon = getIconComponent(signal.icon);
            const isExpanded = expandedCard === signal.id;

            return (
              <motion.div
                key={signal.id}
                className="glass-light rounded-lg overflow-hidden cursor-pointer hover:bg-white/[0.07] transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.15 }}
                onClick={() => toggleCard(signal.id)}
              >
                <div className="p-4 flex items-start gap-3">
                  {/* Icon */}
                  <motion.div
                    className="flex-shrink-0 w-8 h-8 rounded-lg glass flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Icon className="w-4 h-4 text-blue-400" />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-sm tracking-wide">{signal.label}</h5>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="w-4 h-4 text-blue-300/60" />
                      </motion.div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <p className="text-xs text-blue-300/60 mt-2 tracking-wide">
                            {signal.description}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more indicator */}
      {visibleCards < signals.length && (
        <motion.button
          className="w-full py-2 text-xs text-blue-400/60 hover:text-blue-400 transition-colors tracking-wider"
          onClick={handleScroll}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.02 }}
        >
          + {signals.length - visibleCards} more factor{signals.length - visibleCards > 1 ? 's' : ''}
        </motion.button>
      )}
    </motion.div>
  );
}
