import { create } from 'zustand';

export type TransactionIntent = 'pay' | 'send' | 'refund' | 'test';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type UIPhase = 'IDLE' | 'ANALYZING' | 'RESULT' | 'PIN';

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

export interface RiskAnalysis {
  riskScore: number;
  riskLevel: RiskLevel;
  signals: RiskSignal[];
  coolingOff: boolean;
}

interface TransactionState {
  // UI State
  phase: UIPhase;
  setPhase: (phase: UIPhase) => void;

  // Transaction Data
  transaction: TransactionData;
  updateTransaction: (data: Partial<TransactionData>) => void;

  // Risk Analysis
  riskAnalysis: RiskAnalysis | null;
  setRiskAnalysis: (analysis: RiskAnalysis) => void;

  // Behavioral signals
  amountChangeCount: number;
  incrementAmountChange: () => void;
  hasHesitation: boolean;
  setHasHesitation: (value: boolean) => void;

  // Known payees (mock data)
  knownPayees: string[];
  isKnownPayee: (payee: string) => boolean;

  // Reset
  reset: () => void;
}

const KNOWN_PAYEES = [
  'john@upi',
  'sarah@paytm',
  'market@ybl',
  'rent@oksbi',
];

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

  knownPayees: KNOWN_PAYEES,
  isKnownPayee: (payee) => {
    const normalized = payee.toLowerCase().trim();
    return get().knownPayees.some((known) => known.toLowerCase() === normalized);
  },

  reset: () =>
    set({
      phase: 'IDLE',
      transaction: { payee: '', amount: '', intent: 'pay' },
      riskAnalysis: null,
      amountChangeCount: 0,
      hasHesitation: false,
    }),
}));