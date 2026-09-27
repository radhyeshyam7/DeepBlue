import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTransactionStore } from '../state/transactionStore';
import { useAuthStore } from '../state/authStore';
import { IndianRupee, User, ArrowRight } from 'lucide-react';
import type { TransactionIntent } from '../state/transactionStore';
import signalCapture from '../services/behavioralSignalCapture';

const INTENT_OPTIONS: { value: TransactionIntent; label: string; hint: string }[] = [
  { value: 'pay', label: 'Pay', hint: 'Standard payment transaction' },
  { value: 'send', label: 'Send', hint: 'Send money to recipient' },
  { value: 'refund', label: 'Refund', hint: 'Refunds usually have lower risk' },
  { value: 'test', label: 'Test', hint: 'Test transaction - higher scrutiny' },
];

export function TransactionForm({ onSubmit }: { onSubmit: () => void }) {
  const { user } = useAuthStore();
  const {
    transaction,
    updateTransaction,
    incrementAmountChange,
    setHasHesitation,
    amountChangeCount,
    firstInputTime,
    setFirstInputTime,
    lastEditTime,
    setLastEditTime,
    confirmationStartTime,
    setConfirmationStartTime,
    payeeTrustScore,
    setPayeeTrustScore,
  } = useTransactionStore();

  const [isFocused, setIsFocused] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState(transaction.amount);
  const amountChangeTimer = useRef<NodeJS.Timeout | null>(null);
  const payeeInputStartTime = useRef<number | null>(null);

  // Initialize behavioral signal capture
  useEffect(() => {
    const transactionId = transaction.id || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    signalCapture.onTransactionStart(transactionId);
    
    return () => {
      signalCapture.cleanup();
    };
  }, [transaction.id]);

  // Track first input time for payee
  useEffect(() => {
    if (transaction.payee && !firstInputTime) {
      setFirstInputTime(Date.now());
    }
  }, [transaction.payee, firstInputTime, setFirstInputTime]);

  // Detect hesitation behavior (backend will use this)
  useEffect(() => {
    if (amountChangeCount > 3) {
      setHasHesitation(true);
    }
  }, [amountChangeCount, setHasHesitation]);

  // Visual indicator for hesitation (subtle, non-alarming)
  const showHesitationHint = amountChangeCount > 2 && amountChangeCount <= 4;
  
  // Determine payee trust status from backend
  const isPayeeTrusted = payeeTrustScore !== null && payeeTrustScore > 0.5;
  const isNewPayee = payeeTrustScore === null || payeeTrustScore === 0;

  const handleAmountChange = (value: string) => {
    // Only allow numbers and single decimal point
    const sanitized = value.replace(/[^\d.]/g, '');
    const parts = sanitized.split('.');
    const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;

    setAmountInput(formatted);
    updateTransaction({ amount: formatted });
    setLastEditTime(Date.now());

    // Capture behavioral signal
    signalCapture.onAmountChange(parseFloat(amountInput) || 0, parseFloat(formatted) || 0);

    // Track amount changes for hesitation detection
    if (amountChangeTimer.current) {
      clearTimeout(amountChangeTimer.current);
    }

    amountChangeTimer.current = setTimeout(() => {
      incrementAmountChange();
    }, 500);
  };

  const handlePayeeChange = async (value: string) => {
    updateTransaction({ payee: value });
    if (!payeeInputStartTime.current) {
      payeeInputStartTime.current = Date.now();
    }
    setLastEditTime(Date.now());
    
    // Fetch payee trust score from backend when user enters UPI ID
    if (value && value.includes('@') && user?.id) {
      try {
        const response = await fetch(`http://localhost:3000/payee/${encodeURIComponent(value)}?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.relationship) {
            // Update trust score in store
            setPayeeTrustScore(data.relationship.trust_score / 10); // Convert 0-10 to 0-1 scale
          } else {
            // New payee - no relationship found
            setPayeeTrustScore(null);
          }
        } else {
          // Error or new payee
          setPayeeTrustScore(null);
        }
      } catch (error) {
        console.error('Failed to fetch payee trust:', error);
        setPayeeTrustScore(null);
      }
    } else {
      setPayeeTrustScore(null);
    }
  };
  
  const handlePayeeFocus = () => {
    if (!payeeInputStartTime.current) {
      payeeInputStartTime.current = Date.now();
    }
    setIsFocused('payee');
  };

  const handleIntentChange = (value: TransactionIntent) => {
    // Capture behavioral signal
    signalCapture.onIntentSelection(value, transaction.intent);
    updateTransaction({ intent: value });
  };
  
  const handleContinue = () => {
    // Capture behavioral signal
    signalCapture.onSubmission();
    // Set confirmation start time for behavioral signal
    setConfirmationStartTime(Date.now());
    onSubmit();
  };

  const isValid =
    transaction.payee.trim() !== '' &&
    transaction.amount !== '' &&
    parseFloat(transaction.amount) > 0;

  const amount = parseFloat(transaction.amount) || 0;
  
  // Calculate trust gradient (0-1) for visual display
  const trustGradient = payeeTrustScore !== null ? payeeTrustScore : 0;

  // Calculate "weight" for large amounts
  const getAmountWeight = () => {
    if (amount > 10000) return 0.95; // Heavy compression
    if (amount > 5000) return 0.97;
    if (amount > 1000) return 0.99;
    return 1;
  };

  const selectedIntent = INTENT_OPTIONS.find((opt) => opt.value === transaction.intent);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Payee Input */}
      <div className="space-y-2">
        <label className="block text-sm text-blue-200/80 tracking-wide">
          Payee UPI ID
        </label>
        <motion.div
          className="relative"
          animate={{
            borderColor: isPayeeTrusted
              ? `rgba(59, 130, 246, ${0.3 + trustGradient * 0.2})`
              : 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <input
            type="text"
            value={transaction.payee}
            onChange={(e) => handlePayeeChange(e.target.value)}
            onFocus={handlePayeeFocus}
            onBlur={() => setIsFocused(null)}
            placeholder="example@upi"
            className="w-full px-4 py-3 rounded-lg glass-light text-white placeholder:text-blue-300/30 transition-all duration-300"
            style={{
              boxShadow:
                isFocused === 'payee'
                  ? isPayeeTrusted
                    ? `0 0 0 2px rgba(59, 130, 246, ${0.3 + trustGradient * 0.2})`
                    : '0 0 0 2px rgba(255, 255, 255, 0.1)'
                  : 'none',
              borderWidth: isPayeeTrusted ? '2px' : '1px',
              borderStyle: 'solid',
              borderColor: isPayeeTrusted
                ? `rgba(59, 130, 246, ${0.4 + trustGradient * 0.2})`
                : 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <AnimatePresence>
            {transaction.payee && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <User
                  className="w-4 h-4"
                  style={{
                    color: isPayeeTrusted 
                      ? `rgba(59, 130, 246, ${0.6 + trustGradient * 0.4})`
                      : '#94a3b8',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <AnimatePresence>
          {transaction.payee && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs tracking-wide"
              style={{
                color: isPayeeTrusted 
                  ? `rgba(59, 130, 246, ${0.7 + trustGradient * 0.3})`
                  : '#94a3b8',
              }}
            >
              {isPayeeTrusted 
                ? `✓ Trusted recipient (${Math.round(trustGradient * 100)}%)`
                : isNewPayee 
                  ? 'New recipient'
                  : 'Low trust recipient'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="block text-sm text-blue-200/80 tracking-wide">Amount</label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/50">
            <IndianRupee className="w-5 h-5" />
          </div>
          <motion.input
            type="text"
            value={amountInput}
            onChange={(e) => handleAmountChange(e.target.value)}
            onFocus={() => setIsFocused('amount')}
            onBlur={() => setIsFocused(null)}
            placeholder="0.00"
            className="w-full px-4 py-4 pl-12 rounded-lg glass-light text-white text-center text-2xl tracking-wider placeholder:text-blue-300/30 transition-all duration-300"
            style={{
              boxShadow:
                isFocused === 'amount' ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
              transform: `scaleY(${getAmountWeight()})`,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            animate={{
              scaleY: getAmountWeight(),
            }}
          />
        </div>
        <AnimatePresence>
          {amount > 5000 && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-amber-400/70 tracking-wide"
            >
              {amount > 10000 ? 'Very large amount' : 'Large amount'}
            </motion.p>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showHesitationHint && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-amber-400/70 tracking-wide"
            >
              Taking a bit longer to enter the amount
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Intent Selector */}
      <div className="space-y-2">
        <label className="block text-sm text-blue-200/80 tracking-wide">
          Transaction Type
        </label>
        <div className="grid grid-cols-4 gap-2">
          {INTENT_OPTIONS.map((option) => (
            <motion.button
              key={option.value}
              onClick={() => handleIntentChange(option.value)}
              className="px-4 py-3 rounded-lg text-sm transition-all duration-300"
              style={{
                background:
                  transaction.intent === option.value
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor:
                  transaction.intent === option.value
                    ? 'rgba(59, 130, 246, 0.4)'
                    : 'rgba(255, 255, 255, 0.1)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          {selectedIntent && (
            <motion.p
              key={selectedIntent.value}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-blue-300/60 tracking-wide"
            >
              {selectedIntent.hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Continue Button */}
      <motion.button
        onClick={handleContinue}
        disabled={!isValid}
        className="w-full px-6 py-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 group"
        style={{
          background: isValid
            ? 'rgba(59, 130, 246, 0.2)'
            : 'rgba(255, 255, 255, 0.03)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: isValid
            ? 'rgba(59, 130, 246, 0.4)'
            : 'rgba(255, 255, 255, 0.05)',
          cursor: isValid ? 'pointer' : 'not-allowed',
          opacity: isValid ? 1 : 0.4,
        }}
        whileHover={isValid ? { scale: 1.01 } : {}}
        whileTap={isValid ? { scale: 0.99 } : {}}
      >
        <span className="tracking-wide">Continue</span>
        <ArrowRight
          className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
          style={{ opacity: isValid ? 1 : 0.5 }}
        />
      </motion.button>
    </motion.div>
  );
}