/**
 * Train Autoencoder Model Script
 * 
 * Replaces Isolation Forest with Autoencoder for anomaly detection
 * Run this script to train and save the new model
 */

const { trainModel } = require('../src/ml/training');
const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  try {
    console.log('🚀 Starting Autoencoder training...\n');

    // Connect to MongoDB (optional, for loading Phase 1 data)
    if (process.env.MONGODB_URI) {
      console.log('📡 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connected\n');
    } else {
      console.log('⚠️  No MongoDB URI found, using synthetic data only\n');
    }

    // Train model
    const { model, featureNames } = await trainModel();

    console.log('\n✅ Training completed successfully!');
    console.log(`   Model: Autoencoder (20 → 10 → 5 → 10 → 20)`);
    console.log(`   Features: ${featureNames.length}`);
    console.log(`   Saved to: backend/src/models/ml_model.json`);

    // Test inference
    console.log('\n🧪 Testing inference...');
    const testFeatures = featureNames.reduce((acc, name) => {
      acc[name] = Math.random();
      return acc;
    }, {});

    const testArray = featureNames.map(name => testFeatures[name]);
    const anomalyScore = model.predictAnomalyScore(testArray);
    console.log(`   Test anomaly score: ${anomalyScore.toFixed(4)}`);

    // Disconnect
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n✅ MongoDB disconnected');
    }

    console.log('\n🎉 All done! Model is ready for use.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Training failed:', error);
    process.exit(1);
  }
}

main();
