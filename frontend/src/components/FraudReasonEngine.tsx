import React from 'react';
import { motion } from 'motion/react';
import { Shield, Zap, HelpCircle } from 'lucide-react';

export interface ShapPercentageBar {
  feature: string;
  weight_pct: number;
  direction?: string;
}

interface FraudReasonEngineProps {
  riskScore100: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  fraudReasons: string[];
  shapBars?: ShapPercentageBar[];
}

export function FraudReasonEngine({
  riskScore100,
  riskLevel,
  fraudReasons = [],
  shapBars = []
}: FraudReasonEngineProps) {
  const riskLabel = riskLevel === 'HIGH' ? 'HIGH RISK (DELAY)' : riskLevel === 'MEDIUM' ? 'MEDIUM RISK (WARN)' : 'LOW RISK (ALLOW)';
  const riskSub = riskLevel === 'HIGH' ? '0–100 Scale: 71–100' : riskLevel === 'MEDIUM' ? '0–100 Scale: 31–70' : '0–100 Scale: 0–30';

  return (
    <motion.div
      className="card-solid-navy rounded-xl p-5 space-y-5 shadow-lg text-white"
      style={{
        backgroundColor: '#0D1836',
        border: '1px solid rgba(59, 130, 246, 0.3)',
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Header & 0-100 Numerical Score */}
      <div className="flex items-center justify-between border-b border-blue-500/20 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-cyan-300"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
            }}
          >
            <Shield className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm tracking-wide text-white">Fraud Reason Engine</h3>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full text-cyan-300 font-medium"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                }}
              >
                AI + Behavioral
              </span>
            </div>
            <p className="text-xs text-blue-200/70">{riskSub}</p>
          </div>
        </div>

        {/* Numerical Score Box (Blue Theme) */}
        <div className="text-right">
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-2xl font-bold font-mono tracking-tight text-cyan-300">
              {riskScore100}
            </span>
            <span className="text-xs text-blue-300/60">/100</span>
          </div>
          <span
            className="inline-block text-[10px] px-2 py-0.5 rounded uppercase font-semibold font-mono text-cyan-300"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.25)',
              border: '1px solid rgba(59, 130, 246, 0.45)',
            }}
          >
            {riskLabel}
          </span>
        </div>
      </div>

      {/* Why? Reasons Bullet Points */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-blue-200 font-medium">
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Why this risk evaluation?</span>
        </div>

        <div className="space-y-1.5">
          {fraudReasons.length > 0 ? (
            fraudReasons.map((reason, idx) => (
              <motion.div
                key={idx}
                className="flex items-start gap-2.5 text-xs rounded-lg px-3 py-2.5 text-blue-100"
                style={{
                  backgroundColor: '#0B132B',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <span className="text-cyan-400 font-bold shrink-0 mt-0.5">✓</span>
                <span className="text-blue-100 leading-relaxed font-sans">{reason}</span>
              </motion.div>
            ))
          ) : (
            <div className="text-xs text-blue-300/50 italic px-2">No explicit risk triggers identified.</div>
          )}
        </div>
      </div>

      {/* Visual SHAP Contribution Bars (Electric Blue to Cyan Gradient) */}
      {shapBars && shapBars.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-blue-500/20">
          <div className="flex items-center justify-between text-xs text-blue-200 font-medium">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Feature Contribution (SHAP / Explainer Analysis)</span>
            </span>
            <span className="text-[10px] text-blue-300/60">Relative Risk Impact</span>
          </div>

          <div className="space-y-2">
            {shapBars.slice(0, 4).map((bar, i) => {
              const pct = Math.min(100, Math.max(5, bar.weight_pct));

              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[11px] text-blue-200">
                    <span className="truncate">{bar.feature}</span>
                    <span className="font-mono text-cyan-300">{pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#080E1E] rounded-full overflow-hidden border border-blue-500/20">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
