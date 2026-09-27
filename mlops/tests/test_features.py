"""
Unit Tests for Feature Engineering Pipeline
"""

import pytest
import pandas as pd
import numpy as np

from mlops.features.build_features import (
    calculate_derived_features,
    extract_single_feature_vector,
    FEATURE_COLUMNS
)


def test_calculate_derived_features():
    df = pd.DataFrame([{
        "amount": 5000.0,
        "user_avg_amount": 2500.0,
        "hour": 2,  # unusual hour
        "transaction_velocity": 8,  # spike
        "edit_count": 5,
        "hesitation_score": 0.8,
        "intent_mismatch_score": 0.5,
        "is_new_payee": 1,
        "payee_trust_score": 0.2
    }])

    feat = calculate_derived_features(df)

    # 1. Amount ratio: 5000 / 2500 = 2.0
    assert feat["amount_ratio"].iloc[0] == pytest.approx(2.0, rel=1e-2)

    # 2. Amount deviation: 5000 - 2500 = 2500.0
    assert feat["amount_deviation"].iloc[0] == pytest.approx(2500.0, rel=1e-2)

    # 3. Unusual hour: 2 am -> 1
    assert feat["is_unusual_hour"].iloc[0] == 1

    # 4. Velocity spike: velocity 8 > 5 -> 1
    assert feat["velocity_spike"].iloc[0] == 1

    # 5. Behavioral composite score > 0
    assert feat["behavioral_composite_score"].iloc[0] > 0.5


def test_extract_single_feature_vector_shape():
    raw_dict = {
        "amount": 1000.0,
        "user_avg_amount": 1000.0,
        "hour": 12,
        "is_new_payee": 0,
        "payee_trust_score": 0.9,
        "transaction_velocity": 1,
        "hesitation_score": 0.1,
        "edit_count": 0,
        "intent_mismatch_score": 0.0,
        "vulnerability_score": 0.1
    }

    vec = extract_single_feature_vector(raw_dict)
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (1, len(FEATURE_COLUMNS))
