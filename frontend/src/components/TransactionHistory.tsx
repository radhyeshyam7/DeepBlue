import { motion } from 'motion/react';
import { ArrowLeft, ArrowUpRight, Shield, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../state/authStore';
import { fetchTransactionHistory, type TransactionHistoryItem } from '../api/transactionApi';

interface TransactionHistoryProps {
  onBack: () => void;
}

export function TransactionHistory({ onBack }: TransactionHistoryProps) {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);

  // Fetch transactions on mount
  useEffect(() => {
    if (user?.id) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get user ID from auth store
      if (!user?.id) {
        console.log('TransactionHistory: No user ID found', user);
        setLoading(false);
        setError('Please log in to view transaction history');
        return;
      }
      
      console.log('TransactionHistory: Loading transactions for user:', user.id);
      const userId = user.id;
      const response = await fetchTransactionHistory(userId, 50, 0);
      
      console.log('TransactionHistory: Response:', response);
      
      if (response.success) {
        setTransactions(response.transactions);
        console.log('TransactionHistory: Loaded', response.transactions.length, 'transactions');
      } else {
        setError('Failed to load transactions');
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'text-green-400';
      case 'MEDIUM':
        return 'text-amber-400';
      case 'HIGH':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'LOW':
        return <Shield className="w-4 h-4" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-4 h-4" />;
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Calculate stats from real transactions
  const totalSent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const thisMonth = transactions.filter(t => {
    const txDate = new Date(t.date);
    const now = new Date();
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  }).length;
  const protectedPercentage = transactions.length > 0 ? 100 : 0;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <motion.button
          onClick={onBack}
          className="w-10 h-10 rounded-full glass-light flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div className="flex-1">
          <h2 className="text-xl tracking-wide">Transaction History</h2>
          <p className="text-xs text-blue-300/60 tracking-wide">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.button
          onClick={loadTransactions}
          className="w-10 h-10 rounded-full glass-light flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-light rounded-lg p-3 space-y-1">
          <p className="text-xs text-blue-300/60 tracking-wide">Total Sent</p>
          <p className="text-lg tracking-wide">₹{totalSent.toFixed(2)}</p>
        </div>
        <div className="glass-light rounded-lg p-3 space-y-1">
          <p className="text-xs text-blue-300/60 tracking-wide">This Month</p>
          <p className="text-lg tracking-wide">{thisMonth}</p>
        </div>
        <div className="glass-light rounded-lg p-3 space-y-1">
          <p className="text-xs text-blue-300/60 tracking-wide">Protected</p>
          <p className="text-lg text-green-400 tracking-wide">{protectedPercentage}%</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="glass-light rounded-lg p-8 text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-blue-300/60 tracking-wide">Loading transactions...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="glass-light rounded-lg p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-amber-400 tracking-wide mb-4">{error}</p>
          <motion.button
            onClick={loadTransactions}
            className="px-4 py-2 rounded-lg glass-light"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Try Again
          </motion.button>
        </div>
      )}

      {/* Transaction List */}
      {!loading && !error && (
        <div className="space-y-3">
          <h3 className="text-sm text-blue-300/60 tracking-wide">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <div className="glass-light rounded-lg p-8 text-center">
              <p className="text-blue-300/60 tracking-wide">No transactions yet</p>
              <p className="text-xs text-blue-300/40 tracking-wide mt-2">
                Your transaction history will appear here
              </p>
            </div>
          ) : (
            transactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                className="glass-light rounded-lg p-4 cursor-pointer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() =>
                  setSelectedTransaction(
                    selectedTransaction === transaction.id ? null : transaction.id
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm tracking-wide">{transaction.payee}</p>
                      <p className="text-xs text-blue-300/60 tracking-wide">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg tracking-wide">-₹{transaction.amount.toFixed(2)}</p>
                    <div
                      className={`flex items-center gap-1 justify-end ${getRiskColor(
                        transaction.riskLevel
                      )}`}
                    >
                      {getRiskIcon(transaction.riskLevel)}
                      <p className="text-xs tracking-wide">{transaction.riskLevel}</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedTransaction === transaction.id && (
                  <motion.div
                    className="mt-4 pt-4 border-t border-blue-400/20 space-y-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-300/60 tracking-wide">Transaction ID</span>
                      <span className="tracking-wide font-mono text-xs">
                        {transaction.id.substring(0, 16)}...
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-300/60 tracking-wide">Intent</span>
                      <span className="tracking-wide capitalize">{transaction.intent}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-300/60 tracking-wide">Status</span>
                      <span className="text-green-400 tracking-wide capitalize">
                        {transaction.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-300/60 tracking-wide">Risk Level</span>
                      <span className={`tracking-wide ${getRiskColor(transaction.riskLevel)}`}>
                        {transaction.riskLevel}
                      </span>
                    </div>
                    {transaction.riskScore !== undefined && (
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-300/60 tracking-wide">Risk Score</span>
                        <span className="tracking-wide">{transaction.riskScore}/10</span>
                      </div>
                    )}
                    {transaction.action && (
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-300/60 tracking-wide">Action</span>
                        <span className="tracking-wide">{transaction.action}</span>
                      </div>
                    )}
                    {transaction.explanation && (
                      <div className="mt-2 pt-2 border-t border-blue-400/10">
                        <p className="text-xs text-blue-300/60 tracking-wide mb-1">
                          Risk Explanation
                        </p>
                        <p className="text-xs text-blue-300/80 tracking-wide">
                          {transaction.explanation}
                        </p>
                      </div>
                    )}
                    {transaction.reasonCodes && transaction.reasonCodes.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-blue-300/60 tracking-wide mb-1">
                          Risk Factors
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {transaction.reasonCodes.slice(0, 3).map((code) => (
                            <span
                              key={code}
                              className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-300/80 tracking-wide"
                            >
                              {code.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
