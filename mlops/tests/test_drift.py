"""
Unit Tests for Statistical Drift Detection (PSI, KS Test, Wasserstein)
"""

import pytest
import numpy as np

from mlops.monitoring.drift import (
    calculate_psi,
    calculate_ks_test,
    calculate_normalized_wasserstein
)


def test_psi_identical_distributions():
    """Identical distributions should have PSI very close to 0."""
    np.random.seed(42)
    expected = np.random.normal(10, 2, 1000)
    actual = np.random.normal(10, 2, 1000)

    psi = calculate_psi(expected, actual)
    assert psi < 0.10  # Well below warning threshold


def test_psi_shifted_distributions():
    """Significantly shifted distribution should trigger high PSI."""
    np.random.seed(42)
    expected = np.random.normal(10, 2, 1000)
    actual = np.random.normal(25, 5, 1000)

    psi = calculate_psi(expected, actual)
    assert psi >= 0.25  # Should trigger alert threshold


def test_ks_test_detection():
    np.random.seed(42)
    expected = np.random.normal(0, 1, 500)
    actual_same = np.random.normal(0, 1, 500)
    actual_diff = np.random.normal(2, 1, 500)

    _, p_val_same = calculate_ks_test(expected, actual_same)
    assert p_val_same > 0.01  # Cannot reject null hypothesis

    _, p_val_diff = calculate_ks_test(expected, actual_diff)
    assert p_val_diff < 0.001  # Strong rejection of identical distributions


def test_wasserstein_distance():
    expected = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    actual = np.array([10.0, 11.0, 12.0, 13.0, 14.0])

    dist = calculate_normalized_wasserstein(expected, actual)
    assert dist > 1.0
