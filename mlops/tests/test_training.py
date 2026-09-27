"""
Unit Tests for Model Training & Inference Logic
"""

import pytest
import numpy as np
from sklearn.ensemble import IsolationForest


def test_isolation_forest_unsupervised_fitting():
    # Synthetic normal data centered at 0, anomalies centered at 5
    np.random.seed(42)
    X_normal = np.random.normal(0, 1, size=(200, 5))
    X_anom = np.random.normal(5, 1, size=(20, 5))
    X = np.vstack([X_normal, X_anom])

    model = IsolationForest(n_estimators=50, contamination=0.1, random_state=42)
    model.fit(X)

    # Verify score distribution
    scores = -model.score_samples(X)
    assert len(scores) == 220
    assert np.all(np.isfinite(scores))

    # Anomalies should have higher scores on average than normal points
    mean_anom_score = np.mean(scores[200:])
    mean_norm_score = np.mean(scores[:200])
    assert mean_anom_score > mean_norm_score
