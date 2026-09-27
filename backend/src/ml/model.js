/**
 * Isolation Forest Model for Anomaly Detection
 * 
 * Phase 2: Real ML implementation using Isolation Forest
 * Trained on normal transactions only (unsupervised learning)
 */

// For Node.js, we'll use a simplified Isolation Forest implementation
// In production, you'd use a proper ML library like TensorFlow.js or call a Python service

class IsolationForest {
  constructor(nEstimators = 100, maxSamples = 256, contamination = 0.1) {
    this.nEstimators = nEstimators;
    this.maxSamples = maxSamples;
    this.contamination = contamination;
    this.trees = [];
    this.featureRanges = null;
    // Calibration data for proper scoring
    this.c_n = null; // Expected path length for normal points
    this.trainingSampleSize = null; // Actual sample size used
    // Percentile-based calibration
    this.calibrationPercentiles = null; // P10, P30, P50, P70, P90, P97
    this.calibrationScores = null; // Raw scores from calibration set
  }

  /**
   * Train the model on normal transactions
   * @param {Array} X - Feature vectors (array of arrays)
   */
  fit(X) {
    if (!X || X.length === 0) {
      throw new Error('Training data cannot be empty');
    }

    // Normalize features
    this.featureRanges = this._calculateRanges(X);
    const normalizedX = this._normalize(X);

    // Build isolation trees
    this.trees = [];
    const actualSampleSize = Math.min(this.maxSamples, normalizedX.length);
    this.trainingSampleSize = actualSampleSize;
    
    for (let i = 0; i < this.nEstimators; i++) {
      const sampleIndices = this._randomSample(normalizedX.length, actualSampleSize);
      const sample = sampleIndices.map(idx => normalizedX[idx]);
      const tree = this._buildIsolationTree(sample, 0, Math.ceil(Math.log2(actualSampleSize)));
      this.trees.push(tree);
    }

    // Compute calibration constant c(n) for proper scoring
    // c(n) = 2 * (H(n-1) - (n-1)/n) where H(n) = ln(n) + Euler's constant
    this.c_n = this._computeCNormalization(actualSampleSize);

    // Calibrate on training data to validate scoring
    this._calibrateOnTrainingData(normalizedX);
  }

  /**
   * Get raw anomaly score (before calibration)
   * Uses standard Isolation Forest formula: s(x) = 2^(-E(h(x))/c(n))
   * 
   * @param {Array} x - Single feature vector
   * @returns {number} Raw anomaly score (0-1, higher = more anomalous)
   */
  predictRawAnomalyScore(x) {
    if (!this.trees || this.trees.length === 0) {
      throw new Error('Model not trained. Call fit() first.');
    }

    if (!this.c_n) {
      throw new Error('Model calibration missing. Model may not be properly trained.');
    }

    const normalizedX = this._normalize([x])[0];
    
    // Compute path length for each tree
    const pathLengths = this.trees.map(tree => this._pathLength(normalizedX, tree, 0));
    
    // Expected path length: average across all trees
    const expectedPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
    
    // Standard Isolation Forest anomaly score formula
    // s(x) = 2^(-E(h(x))/c(n))
    // - If E(h(x)) ≈ c(n): s ≈ 0.5 (normal)
    // - If E(h(x)) < c(n): s > 0.5 (anomalous, shorter path)
    // - If E(h(x)) > c(n): s < 0.5 (very normal, longer path)
    const rawScore = Math.pow(2, -expectedPathLength / this.c_n);
    
    // Clamp to [0, 1] for safety (should already be in this range)
    return Math.max(0, Math.min(1, rawScore));
  }

  /**
   * Predict calibrated anomaly score for a feature vector
   * Applies percentile-based calibration to raw score
   * 
   * @param {Array} x - Single feature vector
   * @returns {number} Calibrated anomaly score (0-1, higher = more anomalous)
   */
  predictAnomalyScore(x) {
    const rawScore = this.predictRawAnomalyScore(x);
    
    // If no calibration, return raw score
    if (!this.calibrationPercentiles) {
      return rawScore;
    }
    
    // Apply percentile-based calibration
    return this._calibrateScore(rawScore);
  }

  /**
   * Get top contributing features for anomaly
   * @param {Array} x - Feature vector
   * @returns {Array} Top 3 feature names contributing to anomaly
   */
  getTopContributingFeatures(x, featureNames) {
    if (!this.featureRanges) return [];

    const normalizedX = this._normalize([x])[0];
    const contributions = [];

    // Calculate feature-wise deviation from normal
    for (let i = 0; i < x.length; i++) {
      const range = this.featureRanges[i];
      const normalized = normalizedX[i];
      const deviation = Math.abs(normalized - 0.5); // Distance from center
      contributions.push({
        index: i,
        name: featureNames[i],
        deviation: deviation
      });
    }

    // Sort by deviation and return top 3
    contributions.sort((a, b) => b.deviation - a.deviation);
    return contributions.slice(0, 3).map(c => c.name);
  }

  // Private methods

  _calculateRanges(X) {
    const nFeatures = X[0].length;
    const ranges = [];

    for (let i = 0; i < nFeatures; i++) {
      const values = X.map(row => row[i]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      ranges.push({ min, max, range: max - min || 1 });
    }

    return ranges;
  }

  _normalize(X) {
    if (!this.featureRanges) return X;

    return X.map(row =>
      row.map((val, i) => {
        const range = this.featureRanges[i];
        return (val - range.min) / range.range;
      })
    );
  }

  _randomSample(n, k) {
    const indices = [];
    const selected = new Set();
    k = Math.min(k, n);

    while (indices.length < k) {
      const idx = Math.floor(Math.random() * n);
      if (!selected.has(idx)) {
        selected.add(idx);
        indices.push(idx);
      }
    }

    return indices;
  }

  _buildIsolationTree(data, depth, maxDepth) {
    if (data.length <= 1 || depth >= maxDepth) {
      return { type: 'leaf', size: data.length, depth };
    }

    // Random feature and split value
    const nFeatures = data[0].length;
    const featureIdx = Math.floor(Math.random() * nFeatures);
    const featureValues = data.map(row => row[featureIdx]);
    const minVal = Math.min(...featureValues);
    const maxVal = Math.max(...featureValues);
    const splitVal = minVal + Math.random() * (maxVal - minVal);

    // Split data
    const left = data.filter(row => row[featureIdx] < splitVal);
    const right = data.filter(row => row[featureIdx] >= splitVal);

    // If split didn't work, make leaf
    if (left.length === 0 || right.length === 0) {
      return { type: 'leaf', size: data.length, depth };
    }

    return {
      type: 'node',
      featureIdx,
      splitVal,
      left: this._buildIsolationTree(left, depth + 1, maxDepth),
      right: this._buildIsolationTree(right, depth + 1, maxDepth)
    };
  }

  _pathLength(x, tree, depth) {
    if (tree.type === 'leaf') {
      return depth + this._c(tree.size);
    }

    if (x[tree.featureIdx] < tree.splitVal) {
      return this._pathLength(x, tree.left, depth + 1);
    } else {
      return this._pathLength(x, tree.right, depth + 1);
    }
  }

  _c(n) {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }

  /**
   * Compute normalization constant c(n) for Isolation Forest scoring
   * c(n) = 2 * (H(n-1) - (n-1)/n)
   * where H(n) = ln(n) + Euler's constant (0.5772156649)
   * 
   * This is the expected path length for normal points in a tree of size n
   */
  _computeCNormalization(n) {
    if (n <= 1) return 0;
    // H(n-1) = ln(n-1) + Euler's constant
    const H = Math.log(n - 1) + 0.5772156649;
    // c(n) = 2 * (H(n-1) - (n-1)/n)
    return 2 * (H - (n - 1) / n);
  }

  /**
   * Build percentile-based calibration from normal samples
   * @param {Array} normalSamples - Array of normalized feature vectors (normal behavior only)
   */
  buildCalibration(normalSamples) {
    if (!normalSamples || normalSamples.length < 100) {
      throw new Error('Need at least 100 normal samples for calibration');
    }

    console.log(`📊 Building calibration from ${normalSamples.length} normal samples...`);

    // Compute raw scores for all normal samples
    const rawScores = normalSamples.map(sample => {
      try {
        return this.predictRawAnomalyScore(sample);
      } catch (error) {
        console.warn('Error computing raw score for calibration sample:', error);
        return null;
      }
    }).filter(score => score !== null);

    if (rawScores.length < 100) {
      throw new Error(`Only ${rawScores.length} valid scores computed, need at least 100`);
    }

    // Sort scores for percentile computation
    rawScores.sort((a, b) => a - b);

    // Compute percentiles: P10, P30, P50, P70, P90, P97
    const percentiles = [10, 30, 50, 70, 90, 97];
    this.calibrationPercentiles = {};
    
    percentiles.forEach(p => {
      const index = Math.floor((p / 100) * (rawScores.length - 1));
      this.calibrationPercentiles[`P${p}`] = rawScores[index];
    });

    // Store calibration scores for reference
    this.calibrationScores = rawScores;

    console.log('✅ Calibration percentiles computed:');
    Object.entries(this.calibrationPercentiles).forEach(([p, score]) => {
      console.log(`   ${p}: ${score.toFixed(4)}`);
    });
  }

  /**
   * Calibrate raw score using percentile-based mapping
   * @param {number} rawScore - Raw Isolation Forest score
   * @returns {number} Calibrated score (0-1)
   */
  _calibrateScore(rawScore) {
    if (!this.calibrationPercentiles) {
      return rawScore;
    }

    const p = this.calibrationPercentiles;

    // Piecewise linear mapping based on percentiles
    if (rawScore <= p.P30) {
      // ≤ P30: Map to 0.05-0.2 (normal)
      const ratio = (rawScore - p.P10) / (p.P30 - p.P10 || 1);
      return 0.05 + ratio * 0.15; // Linear interpolation between 0.05 and 0.2
    } else if (rawScore <= p.P50) {
      // P30-P50: Map to 0.2-0.35 (borderline normal)
      const ratio = (rawScore - p.P30) / (p.P50 - p.P30 || 1);
      return 0.2 + ratio * 0.15; // Linear interpolation between 0.2 and 0.35
    } else if (rawScore <= p.P70) {
      // P50-P70: Map to 0.35-0.5 (suspicious)
      const ratio = (rawScore - p.P50) / (p.P70 - p.P50 || 1);
      return 0.35 + ratio * 0.15; // Linear interpolation between 0.35 and 0.5
    } else if (rawScore <= p.P90) {
      // P70-P90: Map to 0.5-0.7 (anomalous)
      const ratio = (rawScore - p.P70) / (p.P90 - p.P70 || 1);
      return 0.5 + ratio * 0.2; // Linear interpolation between 0.5 and 0.7
    } else if (rawScore <= p.P97) {
      // P90-P97: Map to 0.7-0.85 (highly anomalous)
      const ratio = (rawScore - p.P90) / (p.P97 - p.P90 || 1);
      return 0.7 + ratio * 0.15; // Linear interpolation between 0.7 and 0.85
    } else {
      // ≥ P97: Map to 0.85-1.0 (extreme anomaly)
      // Use exponential tail to stretch extreme scores
      const excess = (rawScore - p.P97) / (1.0 - p.P97 || 1);
      return 0.85 + excess * 0.15; // Linear interpolation, capped at 1.0
    }
  }

  /**
   * Calibrate scoring on training data to validate
   * Computes expected path lengths for training samples
   */
  _calibrateOnTrainingData(normalizedX) {
    if (normalizedX.length === 0) return;

    // Sample a subset for calibration (to avoid performance issues)
    const calibrationSize = Math.min(100, normalizedX.length);
    const calibrationIndices = this._randomSample(normalizedX.length, calibrationSize);
    const calibrationSamples = calibrationIndices.map(idx => normalizedX[idx]);

    // Compute path lengths for calibration samples
    const calibrationPathLengths = calibrationSamples.map(sample => {
      const pathLengths = this.trees.map(tree => this._pathLength(sample, tree, 0));
      return pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
    });

    // Compute statistics for validation
    const avgPathLength = calibrationPathLengths.reduce((a, b) => a + b, 0) / calibrationPathLengths.length;
    const minPathLength = Math.min(...calibrationPathLengths);
    const maxPathLength = Math.max(...calibrationPathLengths);

    // Log calibration info (for debugging)
    console.log(`📊 Calibration: c(n)=${this.c_n.toFixed(2)}, avg_path=${avgPathLength.toFixed(2)}, range=[${minPathLength.toFixed(2)}, ${maxPathLength.toFixed(2)}]`);

    // Validate: average path length should be close to c(n) for normal data
    const deviation = Math.abs(avgPathLength - this.c_n) / this.c_n;
    if (deviation > 0.3) {
      console.warn(`⚠️  Calibration deviation high: ${(deviation * 100).toFixed(1)}% (expected < 30%)`);
    }
  }

  /**
   * Serialize model to JSON
   */
  toJSON() {
    return {
      nEstimators: this.nEstimators,
      maxSamples: this.maxSamples,
      contamination: this.contamination,
      trees: this.trees,
      featureRanges: this.featureRanges,
      c_n: this.c_n,
      trainingSampleSize: this.trainingSampleSize,
      calibrationPercentiles: this.calibrationPercentiles
    };
  }

  /**
   * Load model from JSON
   */
  static fromJSON(json) {
    const model = new IsolationForest(json.nEstimators, json.maxSamples, json.contamination);
    model.trees = json.trees;
    model.featureRanges = json.featureRanges;
    model.c_n = json.c_n;
    model.trainingSampleSize = json.trainingSampleSize;
    model.calibrationPercentiles = json.calibrationPercentiles || null;
    
    // Recompute c_n if missing (backward compatibility)
    if (!model.c_n && model.trainingSampleSize) {
      model.c_n = model._computeCNormalization(model.trainingSampleSize);
    }
    
    return model;
  }
}

module.exports = IsolationForest;
