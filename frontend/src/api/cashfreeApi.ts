// Backend API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface PreRiskResponse {
  score: number;
  label: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  risk_score_100?: number;
  fraud_reasons?: string[];
  shap_percentage_bars?: Array<{ feature: string; weight_pct: number; direction: string }>;
  behavioral_comparison?: any;
}

export interface CreateOrderResponse {
  orderId: string;
  paymentSessionId: string;
}

export interface OrderStatusResponse {
  status: string;
  orderId: string;
  amount: number;
  vpa: string | null;
  timestamp: string;
}

/**
 * Pre-risk check before payment
 * Now accepts optional transactionId to ensure consistency with transaction/decision
 */
export async function preRiskCheck(
  userId: string,
  vpa: string,
  amount: number,
  transactionId?: string
): Promise<PreRiskResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/cashfree/preRisk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        vpa,
        amount,
        timestamp: new Date().toISOString(),
        transactionId // Pass transactionId to get consistent risk score
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in pre-risk check:', error);
    throw error;
  }
}

/**
 * Create Cashfree order
 */
export async function createOrder(
  amount: number,
  vpa: string,
  customerName?: string,
  customerEmail?: string,
  customerPhone?: string
): Promise<CreateOrderResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/cashfree/createOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        vpa,
        customerName: customerName || 'Test Customer',
        customerEmail: customerEmail || 'test@example.com',
        customerPhone: customerPhone || '9999999999'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Poll order status
 */
export async function getOrderStatus(orderId: string): Promise<OrderStatusResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/cashfree/orderStatus?orderId=${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting order status:', error);
    throw error;
  }
}

/**
 * Poll order status until final state (SUCCESS or FAILED)
 */
export async function pollOrderStatus(
  orderId: string,
  onStatusUpdate?: (status: OrderStatusResponse) => void,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<OrderStatusResponse> {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;
        console.log(`Polling attempt ${attempts}/${maxAttempts} for order ${orderId}`);
        
        const status = await getOrderStatus(orderId);
        console.log(`Order ${orderId} status:`, status);

        // Call update callback if provided
        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        // Check if we've reached a final state
        // Cashfree statuses: PAYMENT_PENDING, PAYMENT_SUCCESS, PAYMENT_FAILED, SUCCESS, FAILED
        const finalStatuses = ['SUCCESS', 'FAILED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED'];
        if (finalStatuses.includes(status.status)) {
          console.log(`Order ${orderId} reached final state: ${status.status}`);
          resolve(status);
          return;
        }

        // Check if we've exceeded max attempts
        if (attempts >= maxAttempts) {
          console.warn(`Polling timeout for order ${orderId} after ${maxAttempts} attempts`);
          // Instead of rejecting, return the last known status
          resolve(status);
          return;
        }

        // Continue polling
        setTimeout(poll, intervalMs);
      } catch (error) {
        console.error(`Polling error for order ${orderId}:`, error);
        // On error, retry a few times before giving up
        if (attempts < 3) {
          setTimeout(poll, intervalMs);
        } else {
          reject(error);
        }
      }
    };

    // Start polling
    poll();
  });
}
