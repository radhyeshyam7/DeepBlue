/**
 * Test Autoencoder Model
 * 
 * Validates that the Autoencoder model works correctly
 * Tests inference, calibration, and feature contribution
 */

const Autoencoder = require('../src/ml/autoencoder');
const { generateSyntheticTrainingData } = require('../src/ml/training');

async function testAutoencoder() {
  console.log('🧪 Testing Autoencoder Model\n');

  // Generate test data
  console.log('1️⃣  Generating training data...');
  const { data, featureNames } = generateSyntheticTrainingData(1000);
  console.log(`   ✅ Generated ${data.length} samples with ${featureNames.length} features\n`);

  // Train model
  console.log('2️⃣  Training Autoencoder...');
  const model = new Autoencoder(20, 10, 5);
  model.fit(data, {
    epochs: 50,
    learningRate: 0.01,
    batchSize: 32,
    verbose: false
  });
  console.log('   ✅ Training completed\n');

  // Test inference on normal samples
  console.log('3️⃣  Testing inference on normal samples...');
  const normalScores = [];
  for (let i = 0; i < 10; i++) {
    const sample = data[Math.floor(Math.random() * data.length)];
    const score = model.predictAnomalyScore(sample);
    normalScores.push(score);
  }
  const avgNormalScore = normalScores.reduce((a, b) => a + b, 0) / normalScores.length;
  console.log(`   Normal samples avg score: ${avgNormalScore.toFixed(4)}`);
  console.log(`   Score range: ${Math.min(...normalScores).toFixed(4)} - ${Math.max(...normalScores).toFixed(4)}`);
  console.log(`   ✅ Normal samples scored (expected: 0.1-0.4)\n`);

  // Test inference on anomalous samples
  console.log('4️⃣  Testing inference on anomalous samples...');
  const anomalousScores = [];
  for (let i = 0; i < 10; i++) {
    // Create anomalous sample (extreme values)
    const anomalous = featureNames.map(() => Math.random() * 10 + 5); // Very high values
    const score = model.predictAnomalyScore(anomalous);
    anomalousScores.push(score);
  }
  const avgAnomalousScore = anomalousScores.reduce((a, b) => a + b, 0) / anomalousScores.length;
  console.log(`   Anomalous samples avg score: ${avgAnomalousScore.toFixed(4)}`);
  console.log(`   Score range: ${Math.min(...anomalousScores).toFixed(4)} - ${Math.max(...anomalousScores).toFixed(4)}`);
  console.log(`   ✅ Anomalous samples scored (expected: 0.6-1.0)\n`);

  // Test feature contribution
  console.log('5️⃣  Testing feature contribution analysis...');
  const testSample = data[0];
  const topFeatures = model.getTopContributingFeatures(testSample, featureNames);
  console.log(`   Top contributing features: ${topFeatures.join(', ')}`);
  console.log(`   ✅ Feature contribution computed\n`);

  // Test serialization
  console.log('6️⃣  Testing model serialization...');
  const json = model.toJSON();
  const loadedModel = Autoencoder.fromJSON(json);
  const originalScore = model.predictAnomalyScore(data[0]);
  const loadedScore = loadedModel.predictAnomalyScore(data[0]);
  const scoreDiff = Math.abs(originalScore - loadedScore);
  console.log(`   Original score: ${originalScore.toFixed(4)}`);
  console.log(`   Loaded score: ${loadedScore.toFixed(4)}`);
  console.log(`   Difference: ${scoreDiff.toFixed(6)}`);
  console.log(`   ✅ Serialization works (diff < 0.0001: ${scoreDiff < 0.0001})\n`);

  // Validation summary
  console.log('📊 Validation Summary:');
  const normalInRange = avgNormalScore >= 0.05 && avgNormalScore <= 0.5;
  const anomalousInRange = avgAnomalousScore >= 0.5 && avgAnomalousScore <= 1.0;
  const separation = avgAnomalousScore - avgNormalScore;
  const goodSeparation = separation >= 0.3;

  console.log(`   ✅ Normal scores in range: ${normalInRange ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Anomalous scores in range: ${anomalousInRange ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Score separation (${separation.toFixed(4)}): ${goodSeparation ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Serialization: ${scoreDiff < 0.0001 ? 'PASS' : 'FAIL'}`);

  if (normalInRange && anomalousInRange && goodSeparation && scoreDiff < 0.0001) {
    console.log('\n🎉 All tests PASSED! Autoencoder is working correctly.');
    return true;
  } else {
    console.log('\n⚠️  Some tests FAILED. Please review the results.');
    return false;
  }
}

// Run tests
testAutoencoder()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  });
