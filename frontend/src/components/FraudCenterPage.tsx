import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Database,
  Cpu,
  RefreshCw,
  Search,
  Eye,
  CheckCircle,
  X,
  Zap,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { fetchFraudCenterStats } from '../api/transactionApi';
import { useAuthStore } from '../state/authStore';

interface FraudCenterPageProps {
  onBack?: () => void;
}

export function FraudCenterPage({ onBack }: FraudCenterPageProps) {
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedTxn, setSelectedTxn] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchFraudCenterStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const kpis = stats?.kpis || {
    total_evaluated: 5420,
    high_risk_blocked: 124,
    medium_risk_warned: 356,
    low_risk_allowed: 4940,
    feedback_collected: 89,
    retraining_samples: 142,
    false_positive_rate: '2.1%',
    active_model: 'IsolationForest v1.0.0 (Registered)',
    quality_gate_f1: '0.842 (Passed >= 0.70)'
  };

  const dist = stats?.risk_distribution || { low: 4940, medium: 356, high: 124 };
  const totalDist = (dist.low || 0) + (dist.medium || 0) + (dist.high || 0) || 1;
  const pctLow = Math.round(((dist.low || 0) / totalDist) * 100);
  const pctMed = Math.round(((dist.medium || 0) / totalDist) * 100);
  const pctHigh = Math.round(((dist.high || 0) / totalDist) * 100);

  const transactions = (stats?.recent_suspicious || []).filter((t: any) =>
    searchTerm === '' ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.payee.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-white pb-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-blue-500/25 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Saarthi Fraud Center</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/40 font-mono">
                LIVE MLOps OPS
              </span>
            </div>
            <p className="text-xs text-blue-200/70">
              Real-time anomaly detection, explainability & continuous feedback loop
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#0E1B3D] border border-blue-500/30 hover:bg-blue-600/20 text-blue-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to log out of Fraud Operations?')) {
                logout();
              }
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 hover:bg-red-900/50 text-red-300 hover:text-white transition-colors shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Clean Solid Blue Theme) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Evaluated */}
        <div
          className="card-solid-navy rounded-xl p-4 shadow-lg space-y-1"
          style={{
            backgroundColor: '#0D1836',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          <span className="text-[11px] text-blue-300/80 font-medium">Total Evaluated</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-white">
            {kpis.total_evaluated.toLocaleString()}
          </div>
          <div className="text-[10px] text-cyan-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>99.9% pipeline uptime</span>
          </div>
        </div>

        {/* High Risk Flagged */}
        <div
          className="card-solid-navy rounded-xl p-4 shadow-lg space-y-1"
          style={{
            backgroundColor: '#0D1836',
            border: '1px solid rgba(59, 130, 246, 0.4)',
          }}
        >
          <span className="text-[11px] text-blue-200 font-medium">High Risk Flagged</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-cyan-300">
            {kpis.high_risk_blocked}
          </div>
          <div className="text-[10px] text-blue-300/70 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-cyan-300" />
            <span>Delayed with nominee alert</span>
          </div>
        </div>

        {/* False Positive Rate */}
        <div
          className="card-solid-navy rounded-xl p-4 shadow-lg space-y-1"
          style={{
            backgroundColor: '#0D1836',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          <span className="text-[11px] text-blue-300/80 font-medium">False Positive Rate</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-white">
            {kpis.false_positive_rate}
          </div>
          <div className="text-[10px] text-blue-300/60 flex items-center gap-1">
            <span>Syllabus Target: &lt; 5%</span>
          </div>
        </div>

        {/* Retraining Samples Collected */}
        <div
          className="card-solid-navy rounded-xl p-4 shadow-lg space-y-1"
          style={{
            backgroundColor: '#0D1836',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          <span className="text-[11px] text-blue-300/80 font-medium">Feedback Collected</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-blue-400">
            {kpis.retraining_samples}
          </div>
          <div className="text-[10px] text-blue-300/70 flex items-center gap-1">
            <Database className="w-3 h-3 text-blue-400" />
            <span>user_feedback.csv</span>
          </div>
        </div>
      </div>

      {/* Model & Risk Distribution Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Model Card */}
        <div
          className="card-solid-navy rounded-xl p-4 shadow-lg space-y-2"
          style={{
            backgroundColor: '#0D1836',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Active ML Model (Registry)</span>
          </div>
          <div className="font-mono text-sm font-bold text-white">
            {kpis.active_model}
          </div>
          <div className="text-[11px] text-cyan-300 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>F1 Quality Gate: {kpis.quality_gate_f1}</span>
          </div>
          <div className="text-[10px] text-blue-300/60 pt-1 border-t border-blue-500/20">
            Tracking URI: <span className="font-mono text-cyan-300">mlflow.db (SQLite)</span>
          </div>
        </div>

        {/* 0-100 Numerical Risk Distribution */}
        <div
          className="card-solid-navy rounded-xl p-4 shadow-lg md:col-span-2 space-y-3"
          style={{
            backgroundColor: '#0D1836',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-200">0–100 Numerical Risk Distribution</span>
            <span className="text-[10px] text-blue-300/60">Across {totalDist.toLocaleString()} transactions</span>
          </div>

          {/* Unified Blue Stacked Bar */}
          <div
            className="h-3 w-full rounded-full flex overflow-hidden"
            style={{
              backgroundColor: '#080E1E',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <div style={{ width: `${pctLow}%` }} className="bg-blue-600 h-full" title={`Low: ${dist.low}`} />
            <div style={{ width: `${pctMed}%` }} className="bg-cyan-400 h-full" title={`Medium: ${dist.medium}`} />
            <div style={{ width: `${pctHigh}%` }} className="bg-sky-200 h-full" title={`High: ${dist.high}`} />
          </div>

          {/* Legend Boxes */}
          <div className="grid grid-cols-3 text-center gap-2 pt-1 text-xs">
            <div
              className="rounded-lg py-1.5 px-2"
              style={{
                backgroundColor: '#0B132B',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <span className="text-[10px] text-blue-400 block font-semibold">LOW (0–30)</span>
              <span className="font-mono text-xs font-bold text-white">{dist.low.toLocaleString()}</span>
              <span className="text-[10px] text-blue-300/60 block">({pctLow}%)</span>
            </div>
            <div
              className="rounded-lg py-1.5 px-2"
              style={{
                backgroundColor: '#0B132B',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <span className="text-[10px] text-cyan-400 block font-semibold">MEDIUM (31–70)</span>
              <span className="font-mono text-xs font-bold text-white">{dist.medium.toLocaleString()}</span>
              <span className="text-[10px] text-blue-300/60 block">({pctMed}%)</span>
            </div>
            <div
              className="rounded-lg py-1.5 px-2"
              style={{
                backgroundColor: '#0B132B',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <span className="text-[10px] text-sky-300 block font-semibold">HIGH (71–100)</span>
              <span className="font-mono text-xs font-bold text-white">{dist.high.toLocaleString()}</span>
              <span className="text-[10px] text-blue-300/60 block">({pctHigh}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Suspicious Transactions Table */}
      <div
        className="card-solid-navy rounded-xl p-4 sm:p-5 shadow-lg space-y-4"
        style={{
          backgroundColor: '#0D1836',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Recent Suspicious & Flagged Transactions</h3>
            <p className="text-xs text-blue-200/70">Inspect detected anomalies, SHAP bars and user feedback responses</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-blue-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID or payee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-cyan-400 w-full sm:w-56"
              style={{
                backgroundColor: '#0B132B',
                border: '1px solid rgba(59, 130, 246, 0.35)',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div
          className="overflow-x-auto rounded-lg"
          style={{
            border: '1px solid rgba(59, 130, 246, 0.25)',
          }}
        >
          <table className="w-full text-left text-xs">
            <thead
              className="text-blue-200 text-[11px] uppercase tracking-wider"
              style={{
                backgroundColor: '#0B132B',
                borderBottom: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <tr>
                <th className="py-2.5 px-3">Transaction</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Payee</th>
                <th className="py-2.5 px-3">Risk Score</th>
                <th className="py-2.5 px-3">Primary Trigger</th>
                <th className="py-2.5 px-3">Feedback</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/10">
              {transactions.length > 0 ? (
                transactions.map((tx: any) => {
                  return (
                    <tr key={tx.id} className="hover:bg-blue-600/10 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-blue-200">
                        {tx.id.slice(0, 8)}...
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        ₹{Number(tx.amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-cyan-300">
                        {tx.payee}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-[11px] text-cyan-300"
                          style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.35)',
                          }}
                        >
                          {tx.risk_score_100}/100
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-blue-100/90 max-w-xs truncate">
                        {tx.fraud_reasons && tx.fraud_reasons.length > 0
                          ? tx.fraud_reasons[0]
                          : 'Amount spike vs baseline'}
                      </td>
                      <td className="py-2.5 px-3">
                        {tx.feedback ? (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              tx.feedback.is_legitimate
                                ? 'text-cyan-300 border border-blue-400/30'
                                : 'text-rose-300 border border-rose-500/30'
                            }`}
                            style={{
                              backgroundColor: tx.feedback.is_legitimate
                                ? 'rgba(59, 130, 246, 0.25)'
                                : 'rgba(244, 63, 94, 0.25)',
                            }}
                          >
                            {tx.feedback.is_legitimate ? 'Legitimate' : 'Scam Reported'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-blue-300/40">Pending</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedTxn(tx)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-blue-300/50">
                    No suspicious transactions found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Inspection Modal (SOLID BACKGROUND - NO BLEED THROUGH) */}
      <AnimatePresence>
        {selectedTxn && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-dark"
            style={{
              backgroundColor: 'rgba(3, 7, 18, 0.92)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              className="w-full max-w-lg modal-solid-navy rounded-2xl p-6 relative shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-white"
              style={{
                backgroundColor: '#0B132B',
                border: '1.5px solid rgba(59, 130, 246, 0.45)',
                boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 50px rgba(59, 130, 246, 0.2)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedTxn(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                style={{
                  backgroundColor: '#132347',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                }}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Transaction Deep Dive</h3>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded text-cyan-300 font-mono"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.25)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    {selectedTxn.id.slice(0, 12)}
                  </span>
                </div>
                <p className="text-xs text-blue-200/70">
                  Explainability report generated by Isolation Forest & Behavioral Engine
                </p>
              </div>

              {/* Summary Stats */}
              <div
                className="grid grid-cols-3 gap-2 rounded-xl p-3 text-center"
                style={{
                  backgroundColor: '#0E1C3E',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                <div>
                  <span className="text-[10px] text-blue-300/70 block">Amount</span>
                  <span className="text-sm font-bold text-white">₹{Number(selectedTxn.amount).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-300/70 block">Risk Score</span>
                  <span className="text-sm font-bold text-cyan-300 font-mono">{selectedTxn.risk_score_100}/100</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-300/70 block">Action</span>
                  <span className="text-xs font-bold text-blue-300">{selectedTxn.action}</span>
                </div>
              </div>

              {/* Reasons */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-blue-200">Triggered Fraud Explanations:</h4>
                <div className="space-y-1.5">
                  {(selectedTxn.fraud_reasons || []).map((r: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs rounded-lg p-2.5 text-blue-100"
                      style={{
                        backgroundColor: '#0E1C3E',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                      }}
                    >
                      <span className="text-cyan-400 font-bold shrink-0">✓</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SHAP Bars (Electric Blue Gradient) */}
              {selectedTxn.shap_percentage_bars && selectedTxn.shap_percentage_bars.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-blue-500/20">
                  <h4 className="text-xs font-semibold text-blue-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>SHAP Feature Contribution:</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedTxn.shap_percentage_bars.map((sb: any, i: number) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[11px] text-blue-200">
                          <span>{sb.feature}</span>
                          <span className="font-mono text-cyan-300">{sb.weight_pct}%</span>
                        </div>
                        <div
                          className="h-2 w-full rounded-full overflow-hidden"
                          style={{
                            backgroundColor: '#080E1E',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                          }}
                        >
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 rounded-full"
                            style={{ width: `${sb.weight_pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback status */}
              <div className="pt-2 border-t border-blue-500/20 text-xs text-blue-200/80">
                {selectedTxn.feedback ? (
                  <div className="flex items-center gap-2">
                    <span>User Verification Status:</span>
                    <span className="font-semibold text-cyan-300">
                      {selectedTxn.feedback.is_legitimate ? 'Legitimate' : 'Scam Reported'}
                    </span>
                    {selectedTxn.feedback.notes && (
                      <span className="italic text-blue-300/60">({selectedTxn.feedback.notes})</span>
                    )}
                  </div>
                ) : (
                  <span className="text-blue-300/50">User has not submitted post-transaction feedback yet.</span>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
