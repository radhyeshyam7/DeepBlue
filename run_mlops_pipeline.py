"""
Master MLOps Pipeline Execution Engine for DeepBlue4 / Saarthi AI
Executes all end-to-end MLOps stages locally on Windows:
  1. Ingestion (Synthetic UPI Dataset Generation)
  2. Validation (Pandera Schema & Range Verification)
  3. Preprocessing (Cleaning, Imputation, Boundary Enforcement)
  4. Feature Engineering (Derived Features, Scaling & Consistency)
  5. Model Training (Unsupervised Isolation Forest + MLflow Tracking)
  6. Evaluation & Quality Gate (Precision, Recall, F1, FPR Benchmarking)
  7. Model Registry (Conditional Promotion upon Passing Quality Gate)
  8. Drift Detection (PSI, Kolmogorov-Smirnov Test, Wasserstein Distance)
  9. Explainable AI (SHAP & LIME Attribution Verification)

Usage:
  python run_mlops_pipeline.py
"""

import os
import sys
import json
import time
import logging
from datetime import datetime

# Set up logging with clean formatting
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("mlops_master")

# Ensure workspace root is in python path
WORKSPACE_ROOT = os.path.dirname(os.path.abspath(__file__))
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)


def print_banner(stage_num: int, title: str):
    logger.info("")
    logger.info("=" * 70)
    logger.info(f" STAGE {stage_num}: {title.upper()}")
    logger.info("=" * 70)


def run_pipeline():
    start_total = time.time()
    logger.info("*" * 70)
    logger.info(" DEEPBLUE4 / SAARTHI AI - END-TO-END MLOPS LIFECYCLE EXECUTION")
    logger.info(" 100% Free & Open-Source Architecture (Units I - VI)")
    logger.info("*" * 70)

    results = {
        "pipeline_name": "DeepBlue4_SaarthiAI_MLOps",
        "start_time": datetime.utcnow().isoformat(),
        "stages": {}
    }

    # --------------------------------------------------------------------------
    # Stage 1: Data Ingestion
    # --------------------------------------------------------------------------
    print_banner(1, "Data Ingestion (Synthetic UPI Transactions)")
    from mlops.ingestion.ingest import ingest_data
    t0 = time.time()
    raw_path = ingest_data()
    results["stages"]["ingestion"] = {
        "status": "PASS",
        "duration_seconds": round(time.time() - t0, 3),
        "output_file": raw_path
    }

    # --------------------------------------------------------------------------
    # Stage 2: Data Validation (Pandera)
    # --------------------------------------------------------------------------
    print_banner(2, "Data Validation (Pandera Schema & Range Verification)")
    from mlops.validation.validate import validate_data
    t0 = time.time()
    val_status = validate_data()
    results["stages"]["validation"] = {
        "status": "PASS" if val_status else "FAIL",
        "duration_seconds": round(time.time() - t0, 3),
        "report_file": "mlops/artifacts/validation_report.json"
    }

    # --------------------------------------------------------------------------
    # Stage 3: Preprocessing
    # --------------------------------------------------------------------------
    print_banner(3, "Data Preprocessing & Drift Baseline Preparation")
    from mlops.preprocessing.preprocess import preprocess_data
    t0 = time.time()
    processed_path = preprocess_data()
    results["stages"]["preprocessing"] = {
        "status": "PASS",
        "duration_seconds": round(time.time() - t0, 3),
        "processed_file": processed_path
    }

    # --------------------------------------------------------------------------
    # Stage 4: Feature Engineering
    # --------------------------------------------------------------------------
    print_banner(4, "Feature Engineering & Scikit-learn Pipeline Persistence")
    from mlops.features.build_features import build_features
    t0 = time.time()
    train_feat, test_feat, scaler_path = build_features()
    results["stages"]["features"] = {
        "status": "PASS",
        "duration_seconds": round(time.time() - t0, 3),
        "train_features": train_feat,
        "test_features": test_feat,
        "scaler_path": scaler_path
    }

    # --------------------------------------------------------------------------
    # Stage 5: Model Training (Unsupervised Isolation Forest + MLflow)
    # --------------------------------------------------------------------------
    print_banner(5, "Model Training (Unsupervised Isolation Forest + MLflow SQLite)")
    from mlops.training.train import train_model
    t0 = time.time()
    model, run_id, model_path = train_model()
    results["stages"]["training"] = {
        "status": "PASS",
        "duration_seconds": round(time.time() - t0, 3),
        "run_id": run_id,
        "model_artifact": model_path
    }

    # --------------------------------------------------------------------------
    # Stage 6: Evaluation & Quality Gate
    # --------------------------------------------------------------------------
    print_banner(6, "Model Evaluation & Quality Gate Enforcement")
    from mlops.evaluation.evaluate import evaluate_model
    t0 = time.time()
    eval_report = evaluate_model()
    gate_passed = eval_report.get("quality_gate_passed", False)
    results["stages"]["evaluation"] = {
        "status": "PASS" if gate_passed else "FAIL",
        "quality_gate_passed": gate_passed,
        "metrics": eval_report.get("metrics", {}),
        "duration_seconds": round(time.time() - t0, 3)
    }

    # --------------------------------------------------------------------------
    # Stage 7: Statistical Drift Detection (PSI, KS Test, Wasserstein)
    # --------------------------------------------------------------------------
    print_banner(7, "Statistical Drift Detection (PSI + KS + Wasserstein)")
    from mlops.monitoring.drift import detect_drift
    t0 = time.time()
    drift_report = detect_drift()
    results["stages"]["drift_detection"] = {
        "overall_status": drift_report.get("overall_status"),
        "overall_drift_score": drift_report.get("overall_drift_score"),
        "duration_seconds": round(time.time() - t0, 3)
    }

    # --------------------------------------------------------------------------
    # Stage 8: Explainable AI (SHAP & LIME Attributions)
    # --------------------------------------------------------------------------
    print_banner(8, "Explainable AI (SHAP & LIME Demonstration)")
    from mlops.explainability.shap_explainer import FraudShapExplainer
    from mlops.explainability.lime_explainer import FraudLimeExplainer
    from mlops.features.build_features import extract_single_feature_vector, FEATURE_COLUMNS
    import joblib

    t0 = time.time()
    test_txn = {
        "amount": 42000.0,
        "user_avg_amount": 1500.0,
        "hour": 3,
        "day_of_week": 4,
        "is_new_payee": 1,
        "payee_trust_score": 0.12,
        "transaction_velocity": 9,
        "hesitation_score": 0.85,
        "edit_count": 4,
        "intent_mismatch_score": 0.70,
        "vulnerability_score": 0.80
    }
    scaler = joblib.load(scaler_path)
    X_sample = extract_single_feature_vector(test_txn, scaler=scaler)

    shap_exp = FraudShapExplainer(model_path=model_path)
    shap_results = shap_exp.explain_instance(X_sample, FEATURE_COLUMNS)[:5]
    logger.info("Sample High-Risk Transaction SHAP Attributions:")
    for r in shap_results:
        logger.info(f"  • {r['feature']}: {r['importance']:+.4f} ({r['direction']})")

    lime_exp = FraudLimeExplainer(model_path=model_path)
    lime_results = lime_exp.explain_instance(X_sample, FEATURE_COLUMNS)[:3]
    logger.info("Sample LIME Rule Explanations:")
    for rule in lime_results:
        logger.info(f"  • {rule['rule']} => impact: {rule['impact']}")

    results["stages"]["explainability"] = {
        "status": "PASS",
        "sample_shap_top_feature": shap_results[0]["feature"] if shap_results else None,
        "duration_seconds": round(time.time() - t0, 3)
    }

    # --------------------------------------------------------------------------
    # Summary & Artifact Writing
    # --------------------------------------------------------------------------
    total_duration = round(time.time() - start_total, 2)
    results["total_duration_seconds"] = total_duration
    results["end_time"] = datetime.utcnow().isoformat()
    results["overall_pipeline_status"] = "SUCCESS" if gate_passed else "QUALITY_GATE_BLOCKED"

    summary_file = "mlops/artifacts/pipeline_execution_summary.json"
    os.makedirs(os.path.dirname(summary_file), exist_ok=True)
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    logger.info("")
    logger.info("*" * 70)
    logger.info(f" PIPELINE COMPLETED IN {total_duration}s | STATUS: {results['overall_pipeline_status']}")
    logger.info(f" Execution Summary saved to: {summary_file}")
    logger.info("*" * 70)

def run_stage(stage_name: str):
    if stage_name == "ingest":
        print_banner(1, "Data Ingestion (Synthetic UPI Transactions)")
        from mlops.ingestion.ingest import ingest_data
        return ingest_data()
    elif stage_name == "validate":
        print_banner(2, "Data Validation (Pandera Schema & Range Verification)")
        from mlops.validation.validate import validate_data
        return validate_data()
    elif stage_name == "preprocess":
        print_banner(3, "Data Preprocessing & Drift Baseline Preparation")
        from mlops.preprocessing.preprocess import preprocess_data
        return preprocess_data()
    elif stage_name == "features":
        print_banner(4, "Feature Engineering & Scikit-learn Pipeline Persistence")
        from mlops.features.build_features import build_features
        return build_features()
    elif stage_name == "train":
        print_banner(5, "Model Training (Unsupervised Isolation Forest + MLflow SQLite)")
        from mlops.training.train import train_model
        return train_model()
    elif stage_name == "evaluate":
        print_banner(6, "Model Evaluation & Quality Gate Enforcement")
        from mlops.evaluation.evaluate import evaluate_model
        return evaluate_model()
    elif stage_name == "drift":
        print_banner(7, "Statistical Drift Detection (PSI + KS + Wasserstein)")
        from mlops.monitoring.drift import detect_drift
        return detect_drift()
    else:
        raise ValueError(f"Unknown stage: {stage_name}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Saarthi AI MLOps Pipeline Runner")
    parser.add_argument("--stage", choices=["all", "ingest", "validate", "preprocess", "features", "train", "evaluate", "drift"], default="all")
    args = parser.parse_args()

    if args.stage == "all":
        run_pipeline()
    else:
        run_stage(args.stage)
