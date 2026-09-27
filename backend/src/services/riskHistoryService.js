/**
 * Risk History Service
 * In-memory storage for transaction history and risk analysis
 * For hackathon demo - can be replaced with SQLite or MongoDB later
 */

// In-memory storage
const merchantHistory = new Map(); // userId -> Set of VPAs
const transactionHistory = []; // Array of transactions

/**
 * Check if merchant (VPA) is new for a user
 * @param {string} userId - User ID
 * @param {string} vpa - VPA (merchant identifier)
 * @returns {Promise<boolean>} True if new merchant
 */
async function isNewMerchant(userId, vpa) {
  const userMerchants = merchantHistory.get(userId) || new Set();
  return !userMerchants.has(vpa);
}

/**
 * Get count of recent transactions for a user
 * @param {string} userId - User ID
 * @param {number} timeWindowMs - Time window in milliseconds
 * @returns {Promise<number>} Count of recent transactions
 */
async function getRecentTransactionCount(userId, timeWindowMs) {
  const now = Date.now();
  const cutoffTime = now - timeWindowMs;

  return transactionHistory.filter(tx => {
    return tx.userId === userId && 
           tx.timestamp.getTime() >= cutoffTime;
  }).length;
}

/**
 * Add a transaction to history
 * @param {Object} transaction - Transaction data
 */
async function addTransaction(transaction) {
  const { userId, vpa } = transaction;

  // Add merchant to user's merchant set
  if (!merchantHistory.has(userId)) {
    merchantHistory.set(userId, new Set());
  }
  merchantHistory.get(userId).add(vpa);

  // Add transaction to history
  transactionHistory.push({
    ...transaction,
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`
  });

  // Keep only last 1000 transactions to prevent memory issues
  if (transactionHistory.length > 1000) {
    transactionHistory.shift();
  }
}

/**
 * Get transaction history for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of transactions to return
 * @returns {Promise<Array>} Array of transactions
 */
async function getUserTransactionHistory(userId, limit = 10) {
  return transactionHistory
    .filter(tx => tx.userId === userId)
    .slice(-limit)
    .reverse();
}

/**
 * Clear all history (useful for testing)
 */
function clearHistory() {
  merchantHistory.clear();
  transactionHistory.length = 0;
}

module.exports = {
  isNewMerchant,
  getRecentTransactionCount,
  addTransaction,
  getUserTransactionHistory,
  clearHistory
};
