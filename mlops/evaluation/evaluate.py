"""
Model Evaluation and Quality Gate Engine for DeepBlue4 / Saarthi AI
Evaluates trained Isolation Forest against test set using synthetic ground-truth fraud_flag.
Calculates Precision, Recall, F1, FPR, FNR, AUC-ROC, and inference latency.
Enforces strict quality gate before registering model into MLflow Model Registry.
"""

import os
import time
import json
import yaml
import joblib
import logging
import pandas as pd
import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix, roc_auc_score
import mlflow
from mlflow.tracking import MlflowClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def load_params(params_path="mlops/params.yaml"):
    """Load configuration parameters."""
    if not os.path.exists(params_path):
        params_path = os.path.join(os.path.dirname(__file__), "..", "params.yaml")
    with open(params_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def evaluate_model(params_path="mlops/params.yaml") -> dict:
    """
    Evaluates candidate model and enforces the quality gate.
    Registers model to MLflow Model Registry only if quality criteria pass.
    """
    params = load_params(params_path)
    test_path = params["data"]["test_features_path"]
    model_path = params["model"]["model_path"]
    quality_cfg = params.get("quality_gate", {})
    mlflow_cfg = params.get("mlflow", {})
    
    min_f1 = quality_cfg.get("min_f1_score", 0.70)
    max_fpr = quality_cfg.get("max_false_positive_rate", 0.15)
    
    logger.info(f"Loading test dataset from: {test_path}")
    test_df = pd.read_csv(test_path)
    
    if "fraud_flag" not in test_df.columns:
        raise ValueError("Evaluation requires synthetic ground-truth 'fraud_flag' column in test data.")
        
    y_test = test_df["fraud_flag"].values
    feature_cols = [c for c in test_df.columns if c != "fraud_flag"]
    X_test = test_df[feature_cols].values
    
    logger.info(f"Loading model artifact from: {model_path}")
    model = joblib.load(model_path)
    
    # 1. Predictions & Scores
    # IsolationForest: predict returns -1 for anomaly (fraud), 1 for normal
    raw_preds = model.predict(X_test)
    y_pred = np.where(raw_preds == -1, 1, 0)
    
    # Continuous anomaly score (higher = more anomalous)
    anomaly_scores = -model.score_samples(X_test)
    
    # 2. Compute Benchmark Metrics
    precision = float(precision_score(y_test, y_pred, zero_division=0))
    recall = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    
    # Confusion matrix
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
    
    try:
        auc_roc = float(roc_auc_score(y_test, anomaly_scores))
    except Exception:
        auc_roc = 0.5
        
    # Latency benchmark (single sample inference)
    latencies = []
    for _ in range(100):
        t0 = time.perf_counter()
        _ = model.predict(X_test[:1])
        latencies.append((time.perf_counter() - t0) * 1000.0)
    avg_latency_ms = float(np.mean(latencies))
    
    metrics = {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "false_positive_rate": round(fpr, 4),
        "false_negative_rate": round(fnr, 4),
        "roc_auc": round(auc_roc, 4),
        "avg_inference_latency_ms": round(avg_latency_ms, 3),
        "test_sample_count": len(y_test),
        "test_fraud_count": int(np.sum(y_test)),
        "true_positives": int(tp),
        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn)
    }
    
    logger.info(f"Evaluation Metrics: F1={metrics['f1_score']}, Precision={metrics['precision']}, Recall={metrics['recall']}, FPR={metrics['false_positive_rate']}")
    
    # 3. Quality Gate Verification
    passes_f1 = metrics["f1_score"] >= min_f1
    passes_fpr = metrics["false_positive_rate"] <= max_fpr
    quality_gate_passed = passes_f1 and passes_fpr
    
    report = {
        "quality_gate_criteria": {
            "min_f1_score": min_f1,
            "max_false_positive_rate": max_fpr
        },
        "metrics": metrics,
        "quality_gate_passed": quality_gate_passed,
        "status": "PASS" if quality_gate_passed else "FAIL",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Write evaluation report
    report_path = "mlops/artifacts/evaluation_metrics.json"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    logger.info(f"Saved evaluation report to {report_path}")
    
    # 4. Model Registry Promotion (Only if Quality Gate Passes!)
    registered_model_name = mlflow_cfg.get("registered_model_name", "FraudDetectionModel")
    tracking_uri = mlflow_cfg.get("tracking_uri", "sqlite:///mlops/mlflow.db")
    
    db_path = os.path.abspath("mlops/mlflow.db").replace("\\", "/")
    sqlite_uri = f"sqlite:///{db_path}"
    try:
        mlflow.set_tracking_uri(sqlite_uri)
    except Exception:
        mlflow.set_tracking_uri("file:///" + os.path.abspath(mlflow_cfg.get("artifact_location", "./mlops/mlruns")).replace("\\", "/"))
        
    # Read run metadata
    run_meta_path = "mlops/artifacts/run_metadata.yaml"
    run_id = None
    if os.path.exists(run_meta_path):
        with open(run_meta_path, "r", encoding="utf-8") as f:
            meta = yaml.safe_load(f)
            run_id = meta.get("run_id")
            
    if run_id:
        with mlflow.start_run(run_id=run_id):
            mlflow.log_metrics({
                "eval_precision": metrics["precision"],
                "eval_recall": metrics["recall"],
                "eval_f1_score": metrics["f1_score"],
                "eval_false_positive_rate": metrics["false_positive_rate"],
                "eval_false_negative_rate": metrics["false_negative_rate"],
                "eval_roc_auc": metrics["roc_auc"],
                "eval_latency_ms": metrics["avg_inference_latency_ms"]
            })
            try:
                mlflow.log_artifact(report_path)
            except Exception as e:
                logger.warning(f"MLflow artifact upload skipped (saved locally at {report_path}): {e}")
            
    if quality_gate_passed:
        logger.info(f"QUALITY GATE PASSED. Promoting model to MLflow Model Registry: '{registered_model_name}'")
        try:
            if run_id:
                model_uri = f"runs:/{run_id}/model"
                mv = mlflow.register_model(model_uri, registered_model_name)
                logger.info(f"Model successfully registered in MLflow Model Registry! Version: {mv.version}, Stage: Candidate")
                report["registered_version"] = str(mv.version)
        except Exception as e:
            logger.warning(f"Note on Model Registry registration: {e}. Model is saved and verified in local artifacts.")
    else:
        logger.warning(f"QUALITY GATE FAILED! Model was NOT registered into production registry.")
        
    return report


if __name__ == "__main__":
    evaluate_model()
