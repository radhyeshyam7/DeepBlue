/**
 * Setup User PIN Script
 * 
 * Run this script to set up PIN for existing users
 * Usage: node scripts/setup-user-pin.js <user_id> <pin>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { hashPin } = require('../src/services/pinVerification');

async function setupUserPin(userId, pin) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/upi_fraud_prevention';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Validate PIN
    if (!/^\d{4}$/.test(pin)) {
      console.error('Error: PIN must be exactly 4 digits');
      process.exit(1);
    }

    // Find user
    let user = await User.findOne({ user_id: userId });

    if (!user) {
      // Create new user if doesn't exist
      console.log(`User ${userId} not found. Creating new user...`);
      user = new User({
        user_id: userId,
        name: userId,
        email: `${userId}@example.com`,
        account_created_at: new Date(),
        account_age_days: 0,
        total_transactions: 0,
        user_type: 'NEW',
        pin_hash: hashPin(pin),
        pin_set_at: new Date()
      });
      await user.save();
      console.log(`✓ User ${userId} created with PIN`);
    } else {
      // Update existing user
      user.pin_hash = hashPin(pin);
      user.pin_set_at = new Date();
      await user.save();
      console.log(`✓ PIN updated for user ${userId}`);
    }

    console.log('\nUser Details:');
    console.log(`- User ID: ${user.user_id}`);
    console.log(`- Name: ${user.name || 'Not set'}`);
    console.log(`- Email: ${user.email || 'Not set'}`);
    console.log(`- PIN Set: ${user.pin_set_at}`);
    console.log(`- Total Transactions: ${user.total_transactions}`);
    console.log(`- User Type: ${user.user_type}`);

    await mongoose.connection.close();
    console.log('\n✓ Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node scripts/setup-user-pin.js <user_id> <pin>');
  console.log('Example: node scripts/setup-user-pin.js user_001 1234');
  process.exit(1);
}

const [userId, pin] = args;
setupUserPin(userId, pin);
