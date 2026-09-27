import React from 'react';
import { motion } from 'motion/react';
import { UserCheck, Activity, ShieldCheck } from 'lucide-react';

interface BehavioralProfileCardProps {
  comparison?: {
    user_baseline: {
      normal_amount: string;
      typical_hour: string;
      common_locations: string;
      common_payees: number | string;
      average_transactions?: string;
      typical_velocity: string;
    };
    current_transaction: {
      amount: string;
      time: string;
      payee_status: string;
      velocity: string;
      location: string;
    };
    deviation_score: 'LOW' | 'MEDIUM' | 'HIGH';
  } | null;
  currentAmount?: string;
  payee?: string;
}

export function BehavioralProfileCard({
  comparison,
  currentAmount,
  payee
}: BehavioralProfileCardProps) {
  const baseline = comparison?.user_baseline || {
    normal_amount: '₹200 – ₹3,000',
    typical_hour: '9:00 AM – 9:00 PM',
    common_locations: 'Pune, Maharashtra',
    common_payees: 12,
    average_transactions: '3 / day',
    typical_velocity: '1 txn / 10 min'
  };

  const current = comparison?.current_transaction || {
    amount: currentAmount ? `₹${parseFloat(currentAmount).toLocaleString()}` : '₹35,000',
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    payee_status: payee ? (payee.includes('new') ? 'New Payee' : 'Known Payee') : 'New Payee',
    velocity: '1 txn / 10 min',
    location: 'Pune, Maharashtra'
  };

  const deviation = comparison?.deviation_score || 'LOW';

  return (
    <motion.div
      className="card-solid-navy rounded-xl p-5 space-y-4 shadow-lg text-white"
      style={{
        backgroundColor: '#0D1836',
        border: '1px solid rgba(59, 130, 246, 0.3)',
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
            }}
          >
            <UserCheck className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">Personal Behavioral Profile</h3>
            <p className="text-[11px] text-blue-200/70">Dynamic user baseline vs incoming transaction</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-blue-300/60 block mb-0.5">Deviation Score</span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono text-cyan-300"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.25)',
              border: '1px solid rgba(59, 130, 246, 0.45)',
            }}
          >
            {deviation}
          </span>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Baseline Column */}
        <div
          className="rounded-lg p-3.5 space-y-2.5"
          style={{
            backgroundColor: '#0B132B',
            border: '1px solid rgba(59, 130, 246, 0.25)',
          }}
        >
          <div className="text-[11px] font-medium text-blue-300 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-blue-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Normal Baseline</span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-blue-300/50 block">Normal Amount</span>
              <span className="font-medium text-white">{baseline.normal_amount}</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-300/50 block">Typical Hours</span>
              <span className="font-medium text-white">{baseline.typical_hour}</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-300/50 block">Common Payees</span>
              <span className="font-medium text-white">{baseline.common_payees} frequent contacts</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-300/50 block">Typical Velocity</span>
              <span className="font-medium text-white">{baseline.typical_velocity}</span>
            </div>
          </div>
        </div>

        {/* Current Transaction Column */}
        <div
          className="rounded-lg p-3.5 space-y-2.5"
          style={{
            backgroundColor: '#0B132B',
            border: '1px solid rgba(56, 189, 248, 0.4)',
          }}
        >
          <div className="text-[11px] font-medium text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-blue-500/20">
            <Activity className="w-3.5 h-3.5 text-cyan-300" />
            <span>This Transaction</span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-blue-300/50 block">Amount</span>
              <span className="font-semibold text-cyan-300">{current.amount}</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-300/50 block">Initiated Time</span>
              <span className="font-medium text-white">{current.time}</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-300/50 block">Payee Relationship</span>
              <span className="font-medium text-blue-200">{current.payee_status}</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-300/50 block">Velocity</span>
              <span className="font-medium text-white">{current.velocity}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
