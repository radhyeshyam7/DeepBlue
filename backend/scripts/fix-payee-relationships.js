/**
 * Fix Payee Relationships
 * 
 * This script recalculates is_new_payee and trust_score for all payee relationships
 */

const mongoose = require('mongoose');
const PayeeRelationship = require('../src/models/PayeeRelationship');

async function fixPayeeRelationships() {
  try {
    await mongoose.connect('mongodb://localhost:27017/upi_fraud_prevention');
    console.log('✅ Connected to MongoDB\n');

    const relationships = await PayeeRelationship.find();
    console.log(`Found ${relationships.length} payee relationships\n`);

    for (const rel of relationships) {
      console.log(`\n📊 Fixing: ${rel.user_id} -> ${rel.payee_id}`);
      console.log(`   Before: total_txns=${rel.total_transactions}, is_new=${rel.is_new_payee}, trust=${rel.trust_score}`);

      // Recalculate days since first transaction
      const daysSinceFirst = Math.floor(
        (Date.now() - new Date(rel.first_seen_date)) / (1000 * 60 * 60 * 24)
      );
      rel.days_since_first_transaction = daysSinceFirst;

      // Recalculate is_new_payee using the model method
      rel.is_new_payee = rel.isNewPayee();

      // Recalculate trust score
      rel.calculateTrustScore();

      // Update other flags
      rel.is_one_time = rel.total_transactions === 1;
      rel.is_recurring = rel.total_transactions >= 3;

      await rel.save();

      console.log(`   After:  total_txns=${rel.total_transactions}, is_new=${rel.is_new_payee}, trust=${rel.trust_score.toFixed(1)}`);
    }

    console.log('\n✅ All payee relationships fixed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPayeeRelationships();
