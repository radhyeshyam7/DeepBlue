"""
Preprocessing Module for DeepBlue4 / Saarthi AI
Performs cleaning, deduplication, missing-value imputation, outlier sanity bounds,
and prepares reference baseline distributions for drift detection.
"""

import os
import yaml
import logging
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def load_params(params_path="mlops/params.yaml"):
    """Load configuration parameters."""
    if not os.path.exists(params_path):
        params_path = os.path.join(os.path.dirname(__file__), "..", "params.yaml")
    with open(params_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def preprocess_data(params_path="mlops/params.yaml") -> str:
    """Preprocess raw transaction data into clean processed data."""
    params = load_params(params_path)
    raw_path = params["data"]["raw_path"]
    processed_path = params["data"]["processed_path"]
    reference_path = params["data"]["reference_data_path"]
    current_path = params["data"]["current_data_path"]
    
    logger.info(f"Loading raw transactions from: {raw_path}")
    df = pd.read_csv(raw_path)
    initial_rows = len(df)
    
    # 1. Deduplication
    df = df.drop_duplicates(subset=["transaction_id"]).reset_index(drop=True)
    dedup_rows = len(df)
    if initial_rows - dedup_rows > 0:
        logger.warning(f"Removed {initial_rows - dedup_rows} duplicate rows.")
        
    # 2. Missing Value Imputation (if any)
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if df[col].isnull().sum() > 0:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
            logger.info(f"Imputed missing values in '{col}' with median: {median_val}")
            
    # 3. Value Clipping & Boundary Enforcement
    df["amount"] = df["amount"].clip(lower=1.0, upper=200000.0)
    df["payee_trust_score"] = df["payee_trust_score"].clip(lower=0.0, upper=1.0)
    df["hesitation_score"] = df["hesitation_score"].clip(lower=0.0, upper=1.0)
    df["intent_mismatch_score"] = df["intent_mismatch_score"].clip(lower=0.0, upper=1.0)
    df["vulnerability_score"] = df["vulnerability_score"].clip(lower=0.0, upper=1.0)
    df["hour"] = df["hour"].clip(lower=0, upper=23).astype(int)
    df["day_of_week"] = df["day_of_week"].clip(lower=0, upper=6).astype(int)
    
    # Save main processed file
    os.makedirs(os.path.dirname(processed_path), exist_ok=True)
    df.to_csv(processed_path, index=False)
    logger.info(f"Processed dataset saved to {processed_path} ({len(df)} rows)")
    
    # Create reference baseline (first 70%) and current production batch (last 30%) for drift analysis
    split_idx = int(len(df) * 0.70)
    df_reference = df.iloc[:split_idx]
    df_current = df.iloc[split_idx:]
    
    df_reference.to_csv(reference_path, index=False)
    df_current.to_csv(current_path, index=False)
    logger.info(f"Saved drift reference dataset ({len(df_reference)} rows) -> {reference_path}")
    logger.info(f"Saved drift current batch dataset ({len(df_current)} rows) -> {current_path}")
    
    return processed_path


if __name__ == "__main__":
    preprocess_data()
