import { create } from 'zustand';

export type TransactionIntent = 'pay' | 'send' | 'refund' | 'test';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type UIPhase = 'IDLE' | 'ANALYZING' | 'RESULT' | 'PIN' | 'PRE_RISK' | 'PAYMENT' | 'PAYMENT_POLLING' | 'PAYMENT_RESULT';
export type Action = 'ALLOW' | 'WARN' | 'DELAY';

export interface RiskSignal {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface TransactionData {
  payee: string;
  amount: string;
  intent: TransactionIntent;
}

// Backend decision response structure
export interface BackendDecisionResponse {
  risk_level: RiskLevel;
  action: Action;
  reason_codes: string[];
  risk_score: number;
  risk_score_100?: number;
  fraud_reasons?: string[];
  shap_percentage_bars?: Array<{ feature: string; weight_pct: number; direction: string }>;
  behavioral_comparison?: any;
  ml_anomaly_score: number;
  ml_weight?: number;
  rule_score?: number;
  user_vulnerability_adjustment?: number;
  ml_top_features?: string[];
  feature_version?: string;
  trust_score?: number;
  delay_seconds?: number;
}

export interface RiskAnalysis {
  riskScore: number; // 0-10 or display scale
  riskScore100: number; // 0-100 numerical risk score
  riskLevel: RiskLevel;
  signals: RiskSignal[];
  fraudReasons: string[];
  shapBars: Array<{ feature: string; weight_pct: number; direction: string }>;
  behavioralComparison?: {
    user_baseline: any;
    current_transaction: any;
    deviation_score: string;
  };
  coolingOff: boolean;
  delaySeconds: number;
  anomalyScore: number; // 0-1 ML anomaly score
  transactionId: string;
  action: Action;
  trustScore?: number; // 0-1 trust score from backend
}

export interface PreRiskData {
  score: number;
  label: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  riskScore100?: number;
  fraudReasons?: string[];
  shapBars?: Array<{ feature: string; weight_pct: number; direction: string }>;
  behavioralComparison?: any;
}

interface TransactionState {
  // UI State
  phase: UIPhase;
  setPhase: (phase: UIPhase) => void;

  // Transaction Data
  transaction: TransactionData;
  updateTransaction: (data: Partial<TransactionData>) => void;

  // Risk Analysis (from backend)
  riskAnalysis: RiskAnalysis | null;
  setRiskAnalysis: (analysis: RiskAnalysis) => void;

  // Behavioral signals (for backend)
  amountChangeCount: number;
  incrementAmountChange: () => void;
  hasHesitation: boolean;
  setHasHesitation: (value: boolean) => void;
  
  // Timing signals
  firstInputTime: number | null;
  setFirstInputTime: (time: number | null) => void;
  lastEditTime: number | null;
  setLastEditTime: (time: number | null) => void;
  confirmationStartTime: number | null;
  setConfirmationStartTime: (time: number | null) => void;

  // Trust score from backend (replaces mock knownPayees)
  payeeTrustScore: number | null;
  setPayeeTrustScore: (score: number | null) => void;

  // Payment state
  preRiskResult: PreRiskData | null;
  setPreRiskResult: (result: PreRiskData | null) => void;
  paymentOrderId: string | null;
  setPaymentOrderId: (orderId: string | null) => void;
  paymentStatus: string | null;
  setPaymentStatus: (status: string | null) => void;

  // Reset
  reset: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  phase: 'IDLE',
  setPhase: (phase) => set({ phase }),

  transaction: {
    payee: '',
    amount: '',
    intent: 'pay',
  },
  updateTransaction: (data) =>
    set((state) => ({
      transaction: { ...state.transaction, ...data },
    })),

  riskAnalysis: null,
  setRiskAnalysis: (analysis) => set({ riskAnalysis: analysis }),

  amountChangeCount: 0,
  incrementAmountChange: () =>
    set((state) => ({
      amountChangeCount: state.amountChangeCount + 1,
    })),

  hasHesitation: false,
  setHasHesitation: (value) => set({ hasHesitation: value }),

  firstInputTime: null,
  setFirstInputTime: (time) => set({ firstInputTime: time }),
  
  lastEditTime: null,
  setLastEditTime: (time) => set({ lastEditTime: time }),
  
  confirmationStartTime: null,
  setConfirmationStartTime: (time) => set({ confirmationStartTime: time }),

  payeeTrustScore: null,
  setPayeeTrustScore: (score) => set({ payeeTrustScore: score }),

  preRiskResult: null,
  setPreRiskResult: (result) => set({ preRiskResult: result }),
  paymentOrderId: null,
  setPaymentOrderId: (orderId) => set({ paymentOrderId: orderId }),
  paymentStatus: null,
  setPaymentStatus: (status) => set({ paymentStatus: status }),

  reset: () =>
    set({
      phase: 'IDLE',
      transaction: { payee: '', amount: '', intent: 'pay' },
      riskAnalysis: null,
      amountChangeCount: 0,
      hasHesitation: false,
      firstInputTime: null,
      lastEditTime: null,
      confirmationStartTime: null,
      payeeTrustScore: null,
      preRiskResult: null,
      paymentOrderId: null,
      paymentStatus: null,
    }),
}));