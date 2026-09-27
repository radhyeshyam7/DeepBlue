import { TransactionData, RiskAnalysis, RiskSignal } from '../state/transactionStore';

// Mock backend API for transaction risk analysis
// Simulates intelligent risk evaluation based on multiple factors

const RISK_SIGNALS_DATABASE: Record<string, RiskSignal> = {
  NEW_PAYEE: {
    id: 'NEW_PAYEE',
    label: 'New payee detected',
    description: 'This is your first transaction with this recipient',
    icon: 'user-plus',
  },
  AMOUNT_SPIKE: {
    id: 'AMOUNT_SPIKE',
    label: 'Amount higher than average',
    description: 'This amount is significantly above your typical transactions',
    icon: 'trending-up',
  },
  UNUSUAL_TIME: {
    id: 'UNUSUAL_TIME',
    label: 'Unusual transaction time',
    description: 'Transactions at this hour are less common',
    icon: 'clock',
  },
  NEW_ACCOUNT: {
    id: 'NEW_ACCOUNT',
    label: 'Recently created account',
    description: 'The recipient account was created recently',
    icon: 'alert-circle',
  },
  HIGH_VELOCITY: {
    id: 'HIGH_VELOCITY',
    label: 'Multiple rapid transactions',
    description: 'You have made several transactions in quick succession',
    icon: 'zap',
  },
  PATTERN_ANOMALY: {
    id: 'PATTERN_ANOMALY',
    label: 'Unusual pattern detected',
    description: 'This transaction differs from your typical behavior',
    icon: 'activity',
  },
};

// Simulate analysis delay for realism
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Calculate risk score based on multiple factors
function calculateRiskScore(
  transaction: TransactionData,
  isKnownPayee: boolean,
  amountChangeCount: number,
  hasHesitation: boolean
): RiskAnalysis {
  let baseScore = 0;
  const signals: RiskSignal[] = [];

  // Factor 1: Known vs New Payee (0-25 points)
  if (!isKnownPayee) {
    baseScore += 25;
    signals.push(RISK_SIGNALS_DATABASE.NEW_PAYEE);
  }

  // Factor 2: Amount Analysis (0-30 points)
  const amount = parseFloat(transaction.amount);
  if (amount > 10000) {
    baseScore += 30;
    signals.push(RISK_SIGNALS_DATABASE.AMOUNT_SPIKE);
  } else if (amount > 5000) {
    baseScore += 15;
    signals.push(RISK_SIGNALS_DATABASE.AMOUNT_SPIKE);
  }

  // Factor 3: Time-based risk (0-15 points)
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) {
    baseScore += 15;
    signals.push(RISK_SIGNALS_DATABASE.UNUSUAL_TIME);
  }

  // Factor 4: Behavioral signals (0-20 points)
  if (amountChangeCount > 3) {
    baseScore += 10;
    signals.push(RISK_SIGNALS_DATABASE.HIGH_VELOCITY);
  }

  if (hasHesitation) {
    baseScore += 10;
    signals.push(RISK_SIGNALS_DATABASE.PATTERN_ANOMALY);
  }

  // Factor 5: Intent modifier
  if (transaction.intent === 'test') {
    baseScore += 20;
    signals.push(RISK_SIGNALS_DATABASE.NEW_ACCOUNT);
  } else if (transaction.intent === 'refund') {
    baseScore = Math.max(0, baseScore - 10); // Refunds are typically safer
  }

  // Random factor for realism (±5 points)
  baseScore += Math.random() * 10 - 5;

  // Ensure score is within bounds
  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));

  // Determine risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  if (finalScore < 40) {
    riskLevel = 'LOW';
  } else if (finalScore < 70) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'HIGH';
  }

  // Cooling off required for high risk
  const coolingOff = riskLevel === 'HIGH';

  return {
    riskScore: finalScore,
    riskLevel,
    signals,
    coolingOff,
  };
}

export async function analyzeTransaction(
  transaction: TransactionData,
  isKnownPayee: boolean,
  amountChangeCount: number,
  hasHesitation: boolean
): Promise<RiskAnalysis> {
  // Simulate backend processing time
  await delay(800 + Math.random() * 400);

  return calculateRiskScore(transaction, isKnownPayee, amountChangeCount, hasHesitation);
}

export async function executeTransaction(
  transaction: TransactionData
): Promise<{ success: boolean; message: string }> {
  // Simulate transaction execution
  await delay(1000);

  return {
    success: true,
    message: 'Transaction completed successfully',
  };
}
