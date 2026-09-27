import { motion } from 'motion/react';
import { ArrowRight, TrendingUp, Shield, Clock, LogOut, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../state/authStore';
import { useTransactionStore } from '../state/transactionStore';
import { useState, useEffect } from 'react';
import { fetchTransactionHistory } from '../api/transactionApi';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { user, logout } = useAuthStore();
  const { reset } = useTransactionStore();
  const [stats, setStats] = useState({ totalSent: 0, thisMonth: 0, avgTime: 3 });
  const [loading, setLoading] = useState(false);

  // Load stats on mount
  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    setLoading(true);
    try {
      if (!user?.id) return;
      
      const response = await fetchTransactionHistory(user.id, 100, 0);
      if (response.success) {
        // Filter only CONFIRMED/successful transactions
        const successfulTransactions = response.transactions.filter(
          t => t.status === 'CONFIRMED' || t.status === 'completed'
        );
        
        const totalSent = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        // Calculate this month's successful transactions
        const now = new Date();
        const thisMonth = successfulTransactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        }).reduce((sum, t) => sum + t.amount, 0);
        
        setStats({ totalSent, thisMonth, avgTime: 3 });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayClick = () => {
    reset(); // Reset transaction state
    onNavigate('pay');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {/* Saarthi AI Header */}
      <motion.div
        className="text-center py-10 relative overflow-hidden"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Multiple glow layers for depth */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            className="w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          ></motion.div>
        </div>
        
        {/* Shining Logo Text with Advanced Effects */}
        <motion.div
          className="relative inline-block"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <style>{`
            @keyframes shine {
              0% { background-position: -200% center; }
              100% { background-position: 200% center; }
            }
            
            @keyframes glow-pulse {
              0%, 100% { 
                filter: drop-shadow(0 0 20px rgba(96, 165, 250, 0.6)) 
                        drop-shadow(0 0 40px rgba(96, 165, 250, 0.4))
                        drop-shadow(0 0 60px rgba(96, 165, 250, 0.2));
              }
              50% { 
                filter: drop-shadow(0 0 30px rgba(96, 165, 250, 0.8)) 
                        drop-shadow(0 0 60px rgba(96, 165, 250, 0.6))
                        drop-shadow(0 0 90px rgba(96, 165, 250, 0.4));
              }
            }
            
            .logo-shine {
              background: linear-gradient(
                90deg,
                #3b82f6 0%,
                #60a5fa 20%,
                #93c5fd 40%,
                #ffffff 50%,
                #93c5fd 60%,
                #60a5fa 80%,
                #3b82f6 100%
              );
              background-size: 200% auto;
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: shine 6s ease-in-out infinite, glow-pulse 3s ease-in-out infinite;
              font-weight: 900;
              letter-spacing: -0.02em;
            }
            
            .logo-ai {
              background: linear-gradient(
                90deg,
                #06b6d4 0%,
                #22d3ee 20%,
                #67e8f9 40%,
                #ffffff 50%,
                #67e8f9 60%,
                #22d3ee 80%,
                #06b6d4 100%
              );
              background-size: 200% auto;
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: shine 6s ease-in-out infinite 1s, glow-pulse 3s ease-in-out infinite 1s;
              font-weight: 900;
              letter-spacing: -0.02em;
            }
          `}</style>
          
          <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)' }} className="font-extrabold tracking-tight mb-6 leading-none">
            <span className="logo-shine">Saarthi</span>
            {' '}
            <span className="logo-ai">AI</span>
          </h1>
        </motion.div>
        
        <motion.p 
          className="text-base md:text-lg text-blue-300/80 tracking-[0.3em] uppercase font-medium mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Your Intelligent Payment Guardian
        </motion.p>
        
        <motion.div 
          className="flex items-center justify-center gap-2 mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <motion.div 
            className="h-px w-16 bg-gradient-to-r from-transparent to-blue-400/60"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          ></motion.div>
          <Shield className="w-4 h-4 text-blue-400" />
          <motion.div 
            className="h-px w-16 bg-gradient-to-l from-transparent to-blue-400/60"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          ></motion.div>
        </motion.div>
      </motion.div>

      {/* Welcome Section */}
      <div className="space-y-2">
        <h2 className="text-2xl tracking-wide">
          Welcome back, <span className="text-blue-400">{user?.name || 'User'}</span>
        </h2>
        <p className="text-sm text-blue-300/60 tracking-wide">
          Your transactions are protected by Saarthi AI
        </p>
      </div>

      {/* Quick Action - Pay */}
      <motion.button
        onClick={handlePayClick}
        className="w-full p-6 rounded-xl glass-light flex items-center justify-between group"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg tracking-wide">Send Money</h3>
            <p className="text-xs text-blue-300/60 tracking-wide">
              Make a secure UPI payment
            </p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-blue-400 transition-transform group-hover:translate-x-1" />
      </motion.button>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          className="glass-light rounded-lg p-4 space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-blue-300/60 tracking-wide">This Month</p>
            <p className="text-lg tracking-wide">₹{stats.thisMonth.toFixed(0)}</p>
          </div>
        </motion.div>

        <motion.div
          className="glass-light rounded-lg p-4 space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-blue-300/60 tracking-wide">Protected</p>
            <p className="text-lg tracking-wide">100%</p>
          </div>
        </motion.div>

        <motion.div
          className="glass-light rounded-lg p-4 space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-blue-300/60 tracking-wide">Avg Time</p>
            <p className="text-lg tracking-wide">3s</p>
          </div>
        </motion.div>
      </div>

      {/* Security Status */}
      <motion.div
        className="glass-light rounded-lg p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm tracking-wide">Security Status</h3>
          <span className="text-xs text-green-400 tracking-wide">Active</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-300/60 tracking-wide">AI Protection</span>
            <span className="text-green-400">✓ Enabled</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-300/60 tracking-wide">PIN Security</span>
            <span className="text-green-400">✓ Active</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-300/60 tracking-wide">Behavioral Analysis</span>
            <span className="text-green-400">✓ Running</span>
          </div>
        </div>
      </motion.div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={() => onNavigate('history')}
          className="glass-light rounded-lg p-4 text-left space-y-1"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <p className="text-sm tracking-wide">Transaction History</p>
          <p className="text-xs text-blue-300/60 tracking-wide">View all payments</p>
        </motion.button>

        <motion.button
          onClick={() => onNavigate('profile')}
          className="glass-light rounded-lg p-4 text-left space-y-1"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <p className="text-sm tracking-wide">Profile & Settings</p>
          <p className="text-xs text-blue-300/60 tracking-wide">Manage account</p>
        </motion.button>
      </div>

      {/* Logout Button */}
      <motion.button
        onClick={handleLogout}
        className="w-full glass-light rounded-lg p-4 flex items-center justify-center gap-2 text-red-400"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <LogOut className="w-5 h-5" />
        <span className="tracking-wide">Logout</span>
      </motion.button>
    </motion.div>
  );
}
