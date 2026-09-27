import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ShieldAlert, X, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { submitPostTransactionFeedback } from '../api/transactionApi';

interface TransactionFeedbackModalProps {
  isOpen: boolean;
  transactionId?: string;
  amount?: string;
  payee?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function TransactionFeedbackModal({
  isOpen,
  transactionId,
  amount,
  payee,
  onClose,
  onSubmitted
}: TransactionFeedbackModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleFeedback = async (isLegitimate: boolean) => {
    setSelectedResponse(isLegitimate);
    setSubmitting(true);
    try {
      if (transactionId) {
        await submitPostTransactionFeedback(transactionId, isLegitimate, notes);
      }
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setSubmitting(false);
        onSubmitted?.();
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Feedback error:', err);
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-dark"
        style={{
          backgroundColor: 'rgba(3, 7, 18, 0.92)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Solid Deep Blue Modal - Guaranteed Zero Bleed */}
        <motion.div
          className="w-full max-w-md modal-solid-navy rounded-2xl p-6 relative shadow-2xl text-white"
          style={{
            backgroundColor: '#0B132B',
            border: '1.5px solid rgba(59, 130, 246, 0.45)',
            boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 40px rgba(59, 130, 246, 0.2)',
          }}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25 }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
            style={{
              backgroundColor: '#132347',
              border: '1px solid rgba(59, 130, 246, 0.35)',
            }}
          >
            <X className="w-4 h-4" />
          </button>

          {!submitted ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="text-center space-y-1.5 pt-2">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-cyan-300 text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Continuous MLOps Retraining</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">Was this transaction legitimate?</h3>
                <p className="text-xs text-blue-200/80 max-w-sm mx-auto">
                  Help Saarthi AI learn. Your feedback directly trains the unsupervised Isolation Forest and behavioral profile models.
                </p>
                {amount && payee && (
                  <div
                    className="text-xs text-white py-1.5 px-3 rounded-lg inline-block mt-2"
                    style={{
                      backgroundColor: '#0E1C3E',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                    }}
                  >
                    ₹{amount} to <span className="font-mono text-cyan-300">{payee}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons in Clean Blue Theme */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <motion.button
                  disabled={submitting}
                  onClick={() => handleFeedback(true)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-white transition-all text-center group"
                  style={{
                    backgroundColor: '#0E1C3E',
                    border: '1.5px solid rgba(59, 130, 246, 0.4)',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.25)',
                      border: '1px solid rgba(56, 189, 248, 0.5)',
                    }}
                  >
                    {submitting && selectedResponse === true ? (
                      <Loader2 className="w-5 h-5 text-cyan-300 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-cyan-300" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white">Yes, it was me</div>
                    <span className="text-[10px] text-cyan-300/80">Legitimate payment</span>
                  </div>
                </motion.button>

                <motion.button
                  disabled={submitting}
                  onClick={() => handleFeedback(false)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-blue-200 transition-all text-center group"
                  style={{
                    backgroundColor: '#0E1C3E',
                    border: '1.5px solid rgba(59, 130, 246, 0.35)',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    {submitting && selectedResponse === false ? (
                      <Loader2 className="w-5 h-5 text-blue-300 animate-spin" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-blue-300" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white">No, unrecognised</div>
                    <span className="text-[10px] text-blue-300/70">Report as fraudulent</span>
                  </div>
                </motion.button>
              </div>

              {/* Optional Notes */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] text-blue-200/80 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-cyan-400" />
                  <span>Optional details or context:</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI QR refund scam, seller asked for PIN..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-cyan-400"
                  style={{
                    backgroundColor: '#080E1E',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                  }}
                />
              </div>

              {/* Data pipeline badge */}
              <div className="text-[10px] text-center text-blue-300/70 pt-1">
                Recorded into <span className="font-mono text-cyan-300 font-semibold">mlops/data/feedback/user_feedback.csv</span>
              </div>
            </div>
          ) : (
            <motion.div
              className="py-8 text-center space-y-3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto text-cyan-300"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.25)',
                  border: '1px solid rgba(59, 130, 246, 0.45)',
                }}
              >
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Feedback Recorded!</h3>
              <p className="text-xs text-blue-200/80 max-w-xs mx-auto">
                Thank you! Your feedback has been queued into the continuous MLOps retraining dataset.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
