"""
Unit Tests for Data Validation Engine (Pandera)
"""

import pytest
import pandas as pd
import pandera as pa
from pandera.errors import SchemaErrors

from mlops.validation.validate import get_transaction_schema


def get_valid_sample_df():
    return pd.DataFrame([{
        "transaction_id": "TXN_TEST_001",
        "user_id_hash": "a1b2c3d4e5f6",
        "amount": 2500.0,
        "hour": 14,
        "day_of_week": 3,
        "is_new_payee": 0,
        "payee_trust_score": 0.85,
        "transaction_velocity": 2,
        "user_avg_amount": 2000.0,
        "amount_deviation": 500.0,
        "hesitation_score": 0.15,
        "edit_count": 0,
        "intent_mismatch_score": 0.05,
        "vulnerability_score": 0.10,
        "fraud_flag": 0
    }])


def test_schema_valid_data():
    """Verify that a compliant record passes Pandera validation."""
    schema = get_transaction_schema()
    df = get_valid_sample_df()
    validated_df = schema.validate(df)
    assert len(validated_df) == 1


def test_schema_invalid_amount_negative():
    """Verify that negative amounts fail validation."""
    schema = get_transaction_schema()
    df = get_valid_sample_df()
    df["amount"] = -100.0
    with pytest.raises(SchemaErrors):
        schema.validate(df, lazy=True)


def test_schema_invalid_hour():
    """Verify that hours outside [0, 23] fail validation."""
    schema = get_transaction_schema()
    df = get_valid_sample_df()
    df["hour"] = 25
    with pytest.raises(SchemaErrors):
        schema.validate(df, lazy=True)


def test_schema_missing_column():
    """Verify that omitting a mandatory column fails validation."""
    schema = get_transaction_schema()
    df = get_valid_sample_df().drop(columns=["amount"])
    with pytest.raises(SchemaErrors):
        schema.validate(df, lazy=True)


def test_schema_duplicate_ids():
    """Verify that duplicate transaction_id values fail validation."""
    schema = get_transaction_schema()
    df = pd.concat([get_valid_sample_df(), get_valid_sample_df()], ignore_index=True)
    with pytest.raises(SchemaErrors):
        schema.validate(df, lazy=True)
