const mongoose = require('mongoose');

async function fixEmailIndex() {
  try {
    await mongoose.connect('mongodb://localhost:27017/upi_fraud_prevention');
    console.log('Connected to MongoDB');

    // Drop the email index that's causing issues
    const collection = mongoose.connection.db.collection('users');
    try {
      await collection.dropIndex('email_1');
      console.log('✅ Dropped email_1 index');
    } catch (err) {
      console.log('Index does not exist or already dropped:', err.message);
    }

    // Also drop all indexes and recreate them
    // await collection.dropIndexes();
    // console.log('Dropped all indexes');

    await mongoose.connection.close();
    console.log('✅ Complete - Connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixEmailIndex();
