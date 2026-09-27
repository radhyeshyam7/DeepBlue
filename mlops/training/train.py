"""
Model Training Module for DeepBlue4 / Saarthi AI
Trains unsupervised Isolation Forest model for anomaly detection.
Tracks parameters, metrics, and serialized artifacts in MLflow local registry (SQLite backend).

Strict Standard:
Isolation Forest training is purely unsupervised on feature matrix X.
Synthetic 'fraud_flag' is completely dropped prior to model fitting.
"""

import os
import yaml
import joblib
import logging
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import mlflow
import mlflow.sklearn

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def load_params(params_path="mlops/params.yaml"):
    """Load configuration parameters."""
    if not os.path.exists(params_path):
        params_path = os.path.join(os.path.dirname(__file__), "..", "params.yaml")
    with open(params_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def setup_mlflow(params: dict):
    """Configure MLflow tracking with SQLite backend store and local artifact repository."""
    mlflow_cfg = params.get("mlflow", {})
    artifact_loc = mlflow_cfg.get("artifact_location", "./mlops/mlruns")
    exp_name = mlflow_cfg.get("experiment_name", "UPI_Fraud_Detection")
    
    # Ensure local artifact folder and db folder exist
    os.makedirs(artifact_loc, exist_ok=True)
    os.makedirs("mlops", exist_ok=True)
    
    db_path = os.path.abspath("mlops/mlflow.db").replace("\\", "/")
    sqlite_uri = f"sqlite:///{db_path}"
    
    # Try setting SQLite tracking URI
    try:
        mlflow.set_tracking_uri(sqlite_uri)
    except Exception as e:
        logger.warning(f"Could not connect to SQLite URI {sqlite_uri} ({e}). Falling back to local file store.")
        mlflow.set_tracking_uri(f"file:///{os.path.abspath(artifact_loc).replace(os.sep, '/')}")
        
    mlflow.set_experiment(exp_name)
    logger.info(f"MLflow configured: Tracking URI = {mlflow.get_tracking_uri()}, Experiment = {exp_name}")


def train_model(params_path="mlops/params.yaml") -> tuple:
    """Train Isolation Forest model on scaled training features."""
    params = load_params(params_path)
    train_path = params["data"]["train_features_path"]
    model_cfg = params["model"]
    model_path = model_cfg["model_path"]
    
    logger.info(f"Loading training data from: {train_path}")
    train_df = pd.read_csv(train_path)
    
    # Separate unsupervised features from evaluation ground truth
    feature_cols = [c for c in train_df.columns if c != "fraud_flag"]
    X_train = train_df[feature_cols].values
    
    logger.info(f"Training features shape: {X_train.shape} across {len(feature_cols)} features")
    logger.info("Unsupervised Isolation Forest training initiated (fraud_flag excluded).")
    
    # Configure MLflow
    setup_mlflow(params)
    
    n_estimators = model_cfg.get("n_estimators", 150)
    contamination = model_cfg.get("contamination", 0.08)
    random_state = model_cfg.get("random_state", 42)
    max_samples = model_cfg.get("max_samples", "auto")
    
    with mlflow.start_run(run_name="IsolationForest_Training") as run:
        run_id = run.info.run_id
        logger.info(f"MLflow Run Started with ID: {run_id}")
        
        # 1. Log Hyperparameters
        mlflow.log_params({
            "algorithm": "IsolationForest",
            "n_estimators": n_estimators,
            "contamination": contamination,
            "max_samples": max_samples,
            "random_state": random_state,
            "n_features": len(feature_cols),
            "n_train_samples": len(X_train)
        })
        
        # 2. Fit Model
        model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            max_samples=max_samples,
            random_state=random_state,
            n_jobs=-1
        )
        model.fit(X_train)
        
        # 3. Calculate internal anomaly score statistics on training set
        # score_samples returns opposite of anomaly score; lower = more abnormal
        raw_scores = -model.score_samples(X_train)
        
        mlflow.log_metrics({
            "train_anomaly_score_mean": float(np.mean(raw_scores)),
            "train_anomaly_score_std": float(np.std(raw_scores)),
            "train_anomaly_score_median": float(np.median(raw_scores)),
            "train_anomaly_score_95th": float(np.percentile(raw_scores, 95)),
            "train_anomaly_score_99th": float(np.percentile(raw_scores, 99))
        })
        
        # 4. Save model artifact locally
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        joblib.dump(model, model_path)
        logger.info(f"Model saved locally to {model_path}")
        
        # 5. Log Model Artifact to MLflow
        try:
            mlflow.sklearn.log_model(
                sk_model=model,
                artifact_path="model",
                serialization_format="cloudpickle",
                registered_model_name=None  # Registration handled strictly after quality gate passes!
            )
        except Exception as e:
            logger.warning(f"MLflow artifact remote copy skipped (model saved locally to {model_path}): {e}")
        
        # Write run metadata
        metadata = {
            "run_id": run_id,
            "model_path": model_path,
            "feature_names": feature_cols,
            "algorithm": "IsolationForest"
        }
        with open("mlops/artifacts/run_metadata.yaml", "w", encoding="utf-8") as f:
            yaml.safe_dump(metadata, f)
            
    logger.info("Isolation Forest training and MLflow logging completed successfully.")
    return model, run_id, model_path


if __name__ == "__main__":
    train_model()
