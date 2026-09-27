"""
Unit Tests for Explainable AI (SHAP & LIME)
"""

import pytest
import numpy as np

from mlops.explainability.shap_explainer import FraudShapExplainer
from mlops.features.build_features import FEATURE_COLUMNS


def test_shap_explainer_fallback_and_structure():
    explainer = FraudShapExplainer()
    test_vec = np.zeros((1, len(FEATURE_COLUMNS)))
    test_vec[0, 1] = 5000.0  # high amount deviation

    contribs = explainer.explain_instance(test_vec, FEATURE_COLUMNS)

    assert isinstance(contribs, list)
    assert len(contribs) == len(FEATURE_COLUMNS)
    assert "feature" in contribs[0]
    assert "importance" in contribs[0]
    assert "direction" in contribs[0]
