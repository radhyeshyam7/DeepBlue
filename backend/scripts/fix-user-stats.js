/**
 * Fix User Transaction Stats
 * 
 * This script recalculates user transaction statistics based on actual confirmed transactions.
 * Run this to fix users whose total_transactions count is incorrect.
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');

async function fixUserStats(userId) {
  try {
    await mongoose.connect('mongodb://localhost:27017/upi_fraud_prevention');
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ user_id: userId });
    if (!user) {
      console.error(`❌ User not found: ${userId}`);
      process.exit(1);
    }

    console.log(`\n📊 Current user stats for ${userId}:`);
    console.log(`   Total transactions: ${user.total_transactions}`);
    console.log(`   User type: ${user.user_type}`);
    console.log(`   Avg amount: ₹${user.transaction_stats?.avg_transaction_amount || 0}`);
    console.log(`   Max amount: ₹${user.transaction_stats?.max_transaction_amount || 0}`);

    // Get all CONFIRMED transactions for this user
    const confirmedTxns = await Transaction.find({
      user_id: userId,
      payment_status: 'CONFIRMED'
    }).sort({ createdAt: 1 });

    console.log(`\n🔍 Found ${confirmedTxns.length} confirmed transactions`);

    if (confirmedTxns.length === 0) {
      console.log('✅ No confirmed transactions to process');
      process.exit(0);
    }

    // Reset stats
    user.total_transactions = 0;
    user.transaction_stats = {
      avg_transaction_amount: 0,
      median_transaction_amount: 0,
      max_transaction_amount: 0,
      transactions_per_day_avg: 0,
      transactions_per_week_avg: 0,
      preferred_transaction_hours: [],
      last_updated: new Date()
    };

    // Recalculate stats from confirmed transactions
    let totalAmount = 0;
    const amounts = [];

    for (const txn of confirmedTxns) {
      user.total_transactions += 1;
      totalAmount += txn.amount;
      amounts.push(txn.amount);
      
      // Update max
      if (txn.amount > user.transaction_stats.max_transaction_amount) {
        user.transaction_stats.max_transaction_amount = txn.amount;
      }
    }

    // Calculate average
    user.transaction_stats.avg_transaction_amount = totalAmount / user.total_transactions;

    // Calculate median
    amounts.sort((a, b) => a - b);
    const mid = Math.floor(amounts.length / 2);
    user.transaction_stats.median_transaction_amount = 
      amounts.length % 2 === 0 
        ? (amounts[mid - 1] + amounts[mid]) / 2 
        : amounts[mid];

    // Update user maturity
    user.updateMaturity();

    // Save
    await user.save();

    console.log(`\n✅ Updated user stats for ${userId}:`);
    console.log(`   Total transactions: ${user.total_transactions}`);
    console.log(`   User type: ${user.user_type}`);
    console.log(`   Avg amount: ₹${Math.round(user.transaction_stats.avg_transaction_amount)}`);
    console.log(`   Median amount: ₹${Math.round(user.transaction_stats.median_transaction_amount)}`);
    console.log(`   Max amount: ₹${user.transaction_stats.max_transaction_amount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get user_id from command line
const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node fix-user-stats.js <user_id>');
  process.exit(1);
}

fixUserStats(userId);
