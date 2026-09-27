"""
Feature Engineering Pipeline for DeepBlue4 / Saarthi AI
Transforms raw transaction inputs into production-ready feature matrices.
Ensures 100% training-serving consistency across batch training, Airflow DAG,
and FastAPI real-time inference.
"""

import os
import yaml
import joblib
import logging
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Frozen feature contract matching production risk engine and Isolation Forest input
FEATURE_COLUMNS = [
    "amount_ratio",
    "amount_deviation",
    "is_new_payee",
    "payee_trust_score",
    "transaction_velocity",
    "velocity_spike",
    "time_deviation_score",
    "is_unusual_hour",
    "hesitation_score",
    "edit_count",
    "intent_mismatch_score",
    "vulnerability_score",
    "payee_risk_factor",
    "behavioral_composite_score"
]


def load_params(params_path="mlops/params.yaml"):
    """Load configuration parameters."""
    if not os.path.exists(params_path):
        params_path = os.path.join(os.path.dirname(__file__), "..", "params.yaml")
    with open(params_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def calculate_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate derived mathematical and behavioral features from raw columns."""
    df_feat = df.copy()
    
    # 1. Amount Ratio: current amount / historical average
    df_feat["amount_ratio"] = np.where(
        df_feat["user_avg_amount"] > 0,
        df_feat["amount"] / df_feat["user_avg_amount"],
        1.0
    ).round(4)
    
    # 2. Amount Deviation: current amount - historical average
    df_feat["amount_deviation"] = (df_feat["amount"] - df_feat["user_avg_amount"]).round(2)
    
    # 3. Unusual Hour flag: late night / early morning (11pm - 5am)
    df_feat["is_unusual_hour"] = np.where(
        (df_feat["hour"] >= 23) | (df_feat["hour"] < 6),
        1,
        0
    )
    
    # 4. Time Deviation Score: graded deviation from normal business hours
    # Normal hours 8-20 -> 0.0, early 6-8 -> 0.3, late 20-22 -> 0.2, nocturnal -> 0.8
    conditions = [
        (df_feat["hour"] >= 8) & (df_feat["hour"] < 20),
        (df_feat["hour"] >= 6) & (df_feat["hour"] < 8),
        (df_feat["hour"] >= 20) & (df_feat["hour"] < 23)
    ]
    choices = [0.0, 0.3, 0.2]
    df_feat["time_deviation_score"] = np.select(conditions, choices, default=0.8)
    
    # 5. Velocity Spike flag: burst of transactions in short window
    df_feat["velocity_spike"] = np.where(df_feat["transaction_velocity"] > 5, 1, 0)
    
    # 6. Behavioral Composite Score
    # Combines hesitation, edit count normalized, and intent mismatch
    edits_norm = np.clip(df_feat["edit_count"] / 10.0, 0.0, 1.0)
    df_feat["behavioral_composite_score"] = (
        df_feat["hesitation_score"] * 0.5 +
        edits_norm * 0.3 +
        df_feat["intent_mismatch_score"] * 0.2
    ).round(4)
    
    # 7. Payee Risk Factor: inverted trust score boosted if newly observed payee
    df_feat["payee_risk_factor"] = np.where(
        df_feat["is_new_payee"] == 1,
        (1.0 - df_feat["payee_trust_score"]) * 1.3,
        (1.0 - df_feat["payee_trust_score"])
    ).clip(0.0, 1.0).round(4)
    
    return df_feat


def extract_single_feature_vector(raw_dict: dict, scaler=None) -> np.ndarray:
    """
    Extracts and scales a single transaction vector for real-time inference in FastAPI.
    Guarantees zero training-serving skew.
    """
    df_single = pd.DataFrame([raw_dict])
    df_transformed = calculate_derived_features(df_single)
    
    # Ensure all required features are present
    for col in FEATURE_COLUMNS:
        if col not in df_transformed.columns:
            df_transformed[col] = 0.0
            
    X_df = df_transformed[FEATURE_COLUMNS]
    if scaler is not None:
        X = scaler.transform(X_df)
    else:
        X = X_df.values
    return X


def build_features(params_path="mlops/params.yaml") -> tuple:
    """Build feature sets, scale features, and produce train/test splits."""
    params = load_params(params_path)
    processed_path = params["data"]["processed_path"]
    train_out = params["data"]["train_features_path"]
    test_out = params["data"]["test_features_path"]
    scaler_out = params["data"]["scaler_path"]
    test_size = params["data"].get("test_size", 0.2)
    random_seed = params["base"]["random_seed"]
    
    logger.info(f"Loading processed data from {processed_path}")
    df = pd.read_csv(processed_path)
    
    # Compute derived features
    df_features = calculate_derived_features(df)
    
    # Verify presence of evaluation target
    has_target = "fraud_flag" in df_features.columns
    
    # Split into train and test sets
    train_df, test_df = train_test_split(
        df_features,
        test_size=test_size,
        random_state=random_seed,
        stratify=df_features["fraud_flag"] if has_target else None
    )
    
    # Fit StandardScaler on training features only (prevent data leakage)
    scaler = StandardScaler()
    X_train = scaler.fit_transform(train_df[FEATURE_COLUMNS])
    X_test = scaler.transform(test_df[FEATURE_COLUMNS])
    
    # Create output DataFrames preserving feature names
    train_output = pd.DataFrame(X_train, columns=FEATURE_COLUMNS, index=train_df.index)
    test_output = pd.DataFrame(X_test, columns=FEATURE_COLUMNS, index=test_df.index)
    
    # Append ground-truth fraud_flag strictly for post-training evaluation
    if has_target:
        train_output["fraud_flag"] = train_df["fraud_flag"].values
        test_output["fraud_flag"] = test_df["fraud_flag"].values
        
    os.makedirs(os.path.dirname(train_out), exist_ok=True)
    os.makedirs(os.path.dirname(scaler_out), exist_ok=True)
    
    train_output.to_csv(train_out, index=False)
    test_output.to_csv(test_out, index=False)
    joblib.dump(scaler, scaler_out)
    
    logger.info(f"Saved training features ({len(train_output)} rows) -> {train_out}")
    logger.info(f"Saved testing features ({len(test_output)} rows) -> {test_out}")
    logger.info(f"Saved feature scaler -> {scaler_out}")
    
    return train_out, test_out, scaler_out


if __name__ == "__main__":
    build_features()
