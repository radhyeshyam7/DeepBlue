import { motion } from 'motion/react';
import { useTransactionStore } from '../state/transactionStore';
import { useAppStore } from '../state/appStore';
import { useAuthStore } from '../state/authStore';
import { SaarthiLogo } from './logo/SaarthiLogo';
import { Settings, Shield, User, LogOut } from 'lucide-react';

interface HeaderProps {
  onSettingsClick?: () => void;
  onNavigate?: (page: string) => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const { riskAnalysis, phase } = useTransactionStore();
  const { ambientRiskLevel } = useAppStore();
  const { role, logout } = useAuthStore();

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
    <header className="relative z-10 px-4 sm:px-8 py-4 sm:py-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <SaarthiLogo mode={getLogoMode()} size={44} showText={false} />

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Static Role Indicator Badge (Role switching disabled inside session) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium select-none ${
              role === 'ADMIN'
                ? 'bg-blue-950/70 border border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-[#0E1C3E] border border-blue-500/40 text-blue-200'
            }`}
          >
            {role === 'ADMIN' ? (
              <>
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold tracking-wide">Fraud Ops Admin</span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="tracking-wide">UPI User Portal</span>
              </>
            )}
          </div>

          {/* Risk status indicator */}
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0E1C3E] border border-blue-500/30 text-white"
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
            <span className="text-xs tracking-wide">{getRiskStatusLabel()}</span>
          </motion.div>

          {/* Admin Direct Log Out or User Settings button */}
          {role === 'ADMIN' ? (
            <motion.button
              onClick={() => {
                if (confirm('Are you sure you want to log out of Fraud Operations?')) {
                  logout();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 hover:bg-red-900/50 text-red-300 hover:text-white transition-all text-xs font-semibold shadow-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Log Out of Fraud Operations"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>
          ) : (
            onSettingsClick && (
              <motion.button
                onClick={onSettingsClick}
                className="p-2 rounded-lg bg-[#0E1C3E] border border-blue-500/30 hover:bg-blue-600/20 text-blue-300 hover:text-white transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Settings & Profile"
              >
                <Settings className="w-4 h-4 text-blue-400" />
              </motion.button>
            )
          )}
        </div>
      </div>
    </header>
  );
}