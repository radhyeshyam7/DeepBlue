"""
Data Ingestion Module for DeepBlue4 / Saarthi AI
Generates or ingests synthetic UPI transaction dataset with realistic behavioral and contextual features.

Note:
- Uses anonymized synthetic user/payee representations.
- 'fraud_flag' is generated ONLY as an evaluation ground-truth reference for academic metrics.
- Unsupervised Isolation Forest training does NOT use the 'fraud_flag'.
"""

import os
import sys
import yaml
import logging
import hashlib
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def load_params(params_path="mlops/params.yaml"):
    """Load configuration parameters."""
    if not os.path.exists(params_path):
        # Fallback if called from subfolder
        params_path = os.path.join(os.path.dirname(__file__), "..", "params.yaml")
    with open(params_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def generate_upi_dataset(
    n_samples: int = 5000,
    fraud_rate: float = 0.08,
    random_seed: int = 42
) -> pd.DataFrame:
    """
    Generate realistic synthetic UPI transactions.
    
    Legitimate transactions:
    - Normal daytime hours (8am - 10pm)
    - Established payees with high trust score (0.7 - 1.0)
    - Reasonable amounts matching user historical average
    - Low transaction velocity (1-3 transactions/hour)
    - Low hesitation and edit counts
    
    Fraud transactions:
    - Late night hours (11pm - 5am)
    - High proportion of brand new payees with low trust (0.0 - 0.3)
    - Sudden high amounts or huge deviation from user average
    - Velocity spikes (5-12 transactions/hour)
    - Elevated hesitation scores and multiple amount edits
    - High intent mismatch and vulnerability scores
    """
    np.random.seed(random_seed)
    n_fraud = int(n_samples * fraud_rate)
    n_normal = n_samples - n_fraud
    
    # Define normalized probability vectors for hour choices
    hours_list = list(range(24))
    normal_p = np.array([
        0.01, 0.005, 0.005, 0.005, 0.005, 0.01, 0.03, 0.05, 0.07, 0.08, 0.08, 0.08,
        0.08, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.06, 0.05, 0.04, 0.02, 0.01
    ], dtype=np.float64)
    normal_p /= normal_p.sum()

    fraud_p = np.array([
        0.12, 0.12, 0.12, 0.10, 0.08, 0.05, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02,
        0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.04, 0.05, 0.07, 0.08
    ], dtype=np.float64)
    fraud_p /= fraud_p.sum()

    records = []
    
    # 1. Generate Normal Transactions
    for i in range(n_normal):
        txn_id = f"TXN_LEGIT_{i+1:06d}"
        user_num = np.random.randint(1, 501)
        user_id_hash = hashlib.sha256(f"user_{user_num}".encode()).hexdigest()[:12]
        
        # User historical baseline
        user_avg_amount = float(np.random.gamma(shape=5, scale=200)) # mean ~1000 INR
        user_avg_amount = round(max(100.0, min(user_avg_amount, 25000.0)), 2)
        
        # Legitimate amount centered near user average
        amount_ratio = np.random.lognormal(mean=0.0, sigma=0.35)
        amount = round(max(10.0, min(user_avg_amount * amount_ratio, 50000.0)), 2)
        amount_deviation = round(amount - user_avg_amount, 2)
        
        # Hours: typical waking hours (8am - 10pm)
        hour = int(np.random.choice(hours_list, p=normal_p))
        day_of_week = int(np.random.randint(0, 7))
        
        # Payee relationship
        is_new_payee = int(np.random.binomial(1, 0.15))
        payee_trust_score = round(float(np.random.uniform(0.70, 0.99) if is_new_payee == 0 else np.random.uniform(0.40, 0.70)), 4)
        
        # Velocity & Behavioral
        transaction_velocity = int(np.random.poisson(lam=1.5)) + 1
        hesitation_score = round(float(np.random.beta(a=1.5, b=6.0)), 4) # centered low ~0.2
        edit_count = int(np.random.choice([0, 1, 2], p=[0.75, 0.20, 0.05]))
        intent_mismatch_score = round(float(np.random.beta(a=1.0, b=8.0)), 4) # very low
        vulnerability_score = round(float(np.random.beta(a=2.0, b=7.0)), 4)
        
        records.append({
            "transaction_id": txn_id,
            "user_id_hash": user_id_hash,
            "amount": amount,
            "hour": hour,
            "day_of_week": day_of_week,
            "is_new_payee": is_new_payee,
            "payee_trust_score": payee_trust_score,
            "transaction_velocity": transaction_velocity,
            "user_avg_amount": user_avg_amount,
            "amount_deviation": amount_deviation,
            "hesitation_score": hesitation_score,
            "edit_count": edit_count,
            "intent_mismatch_score": intent_mismatch_score,
            "vulnerability_score": vulnerability_score,
            "fraud_flag": 0
        })
        
    # 2. Generate Fraudulent Transactions (Synthetically labeled for evaluation)
    for j in range(n_fraud):
        txn_id = f"TXN_FRAUD_{j+1:06d}"
        user_num = np.random.randint(1, 501)
        user_id_hash = hashlib.sha256(f"user_{user_num}".encode()).hexdigest()[:12]
        
        user_avg_amount = float(np.random.gamma(shape=5, scale=200))
        user_avg_amount = round(max(100.0, min(user_avg_amount, 25000.0)), 2)
        
        # Fraud amount: significant spike (3x to 15x user average)
        spike_multiplier = np.random.uniform(3.5, 12.0)
        amount = round(max(2000.0, min(user_avg_amount * spike_multiplier, 95000.0)), 2)
        amount_deviation = round(amount - user_avg_amount, 2)
        
        # Fraud hours: heavily skewed towards unusual late night / early hours
        hour = int(np.random.choice(hours_list, p=fraud_p))
        day_of_week = int(np.random.randint(0, 7))
        
        # High likelihood of new payee with near-zero trust
        is_new_payee = int(np.random.binomial(1, 0.85))
        payee_trust_score = round(float(np.random.uniform(0.01, 0.35)), 4)
        
        # Velocity burst and hesitation/panic edits
        transaction_velocity = int(np.random.randint(5, 15))
        hesitation_score = round(float(np.random.beta(a=6.0, b=2.0)), 4) # high ~0.75
        edit_count = int(np.random.randint(2, 8))
        intent_mismatch_score = round(float(np.random.beta(a=5.0, b=2.5)), 4)
        vulnerability_score = round(float(np.random.beta(a=6.0, b=2.0)), 4)
        
        records.append({
            "transaction_id": txn_id,
            "user_id_hash": user_id_hash,
            "amount": amount,
            "hour": hour,
            "day_of_week": day_of_week,
            "is_new_payee": is_new_payee,
            "payee_trust_score": payee_trust_score,
            "transaction_velocity": transaction_velocity,
            "user_avg_amount": user_avg_amount,
            "amount_deviation": amount_deviation,
            "hesitation_score": hesitation_score,
            "edit_count": edit_count,
            "intent_mismatch_score": intent_mismatch_score,
            "vulnerability_score": vulnerability_score,
            "fraud_flag": 1
        })
        
    df = pd.DataFrame(records)
    # Shuffle dataset
    df = df.sample(frac=1.0, random_state=random_seed).reset_index(drop=True)
    return df


def ingest_data(params_path="mlops/params.yaml") -> str:
    """Main ingestion entrypoint."""
    params = load_params(params_path)
    data_cfg = params["data"]
    base_cfg = params["base"]
    
    raw_path = data_cfg["raw_path"]
    os.makedirs(os.path.dirname(raw_path), exist_ok=True)
    
    logger.info(f"Generating synthetic UPI dataset: n={data_cfg['n_samples']}, fraud_rate={data_cfg['fraud_rate']}")
    df = generate_upi_dataset(
        n_samples=data_cfg["n_samples"],
        fraud_rate=data_cfg["fraud_rate"],
        random_seed=base_cfg["random_seed"]
    )
    
    df.to_csv(raw_path, index=False)
    logger.info(f"Successfully saved raw dataset to {raw_path} ({len(df)} rows, {len(df.columns)} columns)")
    return raw_path


if __name__ == "__main__":
    ingest_data()
