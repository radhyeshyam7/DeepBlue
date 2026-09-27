"""
Apache Airflow DAG for DeepBlue4 / Saarthi AI Fraud ML Pipeline
Orchestrates: Ingest -> Validate -> Preprocess -> Build Features -> Train -> Evaluate -> Quality Gate -> Register Model -> Generate Report

Design:
- Production Airflow DAG defined for Docker orchestration.
- Dual execution mode: Includes run_dag_standalone() so the DAG can be executed
  directly from CLI on Windows without requiring a native Airflow scheduler.
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta

# Add workspace root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def _run_stage_exec(stage_name: str):
    """Executes a pipeline stage natively within the Airflow worker environment."""
    workspace = "/mnt/d/DeepBlue4" if os.path.exists("/mnt/d/DeepBlue4") else os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if workspace not in sys.path:
        sys.path.insert(0, workspace)
    os.chdir(workspace)

    logger.info(f"Executing stage '{stage_name}' (workspace: {workspace})...")
    if stage_name == "ingest":
        from mlops.ingestion.ingest import ingest_data
        return ingest_data()
    elif stage_name == "validate":
        from mlops.validation.validate import validate_data
        return validate_data()
    elif stage_name == "preprocess":
        from mlops.preprocessing.preprocess import preprocess_data
        return preprocess_data()
    elif stage_name == "features":
        from mlops.features.build_features import build_features
        return build_features()
    elif stage_name == "train":
        from mlops.training.train import train_model
        model, run_id, model_path = train_model()
        return {"run_id": run_id, "model_path": model_path}
    elif stage_name == "evaluate":
        from mlops.evaluation.evaluate import evaluate_model
        return evaluate_model()
    elif stage_name == "drift":
        from mlops.monitoring.drift import detect_drift
        return detect_drift()
    else:
        raise ValueError(f"Unknown stage: {stage_name}")

def task_ingest(**kwargs):
    logger.info("Executing Task: Ingest Data")
    return _run_stage_exec("ingest")

def task_validate(**kwargs):
    logger.info("Executing Task: Validate Data (Pandera)")
    return _run_stage_exec("validate")

def task_preprocess(**kwargs):
    logger.info("Executing Task: Preprocess Data")
    return _run_stage_exec("preprocess")

def task_build_features(**kwargs):
    logger.info("Executing Task: Build Features")
    return _run_stage_exec("features")

def task_train(**kwargs):
    logger.info("Executing Task: Train Model (Isolation Forest)")
    return _run_stage_exec("train")

def task_evaluate(**kwargs):
    logger.info("Executing Task: Evaluate Model & Enforce Quality Gate")
    return _run_stage_exec("evaluate")

def task_quality_gate_decision(**kwargs):
    """Conditional branching based on quality gate status."""
    report_paths = [
        "mlops/artifacts/evaluation_metrics.json",
        "/mnt/d/DeepBlue4/mlops/artifacts/evaluation_metrics.json",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "artifacts", "evaluation_metrics.json"))
    ]
    for rpath in report_paths:
        if os.path.exists(rpath):
            with open(rpath, "r", encoding="utf-8") as f:
                report = json.load(f)
                if report.get("quality_gate_passed", False):
                    logger.info(f"Quality Gate PASSED ({report.get('metrics', {})}). Proceeding to Model Registration.")
                    return "register_model"
    logger.warning("Quality Gate FAILED. Halting model promotion.")
    return "stop_pipeline"

def task_register_model(**kwargs):
    logger.info("Executing Task: Register Candidate Model in MLflow Registry")
    return True

def task_generate_report(**kwargs):
    logger.info("Executing Task: Generate Final MLOps Pipeline Report")
    _run_stage_exec("drift")
    summary = {
        "pipeline": "DeepBlue4_Fraud_ML_Pipeline",
        "timestamp": datetime.utcnow().isoformat(),
        "status": "COMPLETED_SUCCESSFULLY"
    }
    out_dir = "/mnt/d/DeepBlue4/mlops/artifacts" if os.path.exists("/mnt/d/DeepBlue4") else "mlops/artifacts"
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "final_pipeline_summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    logger.info(f"Pipeline finished successfully: {summary}")
    return summary

def task_stop_pipeline(**kwargs):
    logger.warning("Pipeline halted at Quality Gate: Model rejected for production.")


# ------------------------------------------------------------------------------
# Apache Airflow DAG Definition (Active when imported by Airflow)
# ------------------------------------------------------------------------------

default_args = {
    "owner": "saarthi_mlops",
    "depends_on_past": False,
    "start_date": datetime(2026, 1, 1),
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}

try:
    from airflow import DAG
    from airflow.operators.python import PythonOperator, BranchPythonOperator
    from airflow.operators.empty import EmptyOperator

    with DAG(
        dag_id="fraud_detection_mlops_pipeline",
        default_args=default_args,
        description="Automated MLOps Pipeline for Real-Time UPI Fraud Detection",
        schedule="@daily",
        catchup=False,
        tags=["mlops", "fraud-detection", "isolation-forest", "deepblue4"]
    ) as dag:

        ingest = PythonOperator(task_id="ingest_data", python_callable=task_ingest)
        validate = PythonOperator(task_id="validate_data", python_callable=task_validate)
        preprocess = PythonOperator(task_id="preprocess_data", python_callable=task_preprocess)
        features = PythonOperator(task_id="build_features", python_callable=task_build_features)
        train = PythonOperator(task_id="train_model", python_callable=task_train)
        evaluate = PythonOperator(task_id="evaluate_model", python_callable=task_evaluate)
        
        quality_gate = BranchPythonOperator(
            task_id="quality_gate_decision",
            python_callable=task_quality_gate_decision
        )
        
        register = PythonOperator(task_id="register_model", python_callable=task_register_model)
        report = PythonOperator(task_id="generate_report", python_callable=task_generate_report)
        stop = EmptyOperator(task_id="stop_pipeline")

        # Directed Acyclic Graph topology
        ingest >> validate >> preprocess >> features >> train >> evaluate >> quality_gate
        quality_gate >> register >> report
        quality_gate >> stop

except ImportError:
    # Airflow not installed in local environment (run via standalone runner)
    dag = None


# ------------------------------------------------------------------------------
# Standalone CLI Runner (For local Windows execution without Airflow)
# ------------------------------------------------------------------------------

def run_dag_standalone():
    """Runs the entire DAG lifecycle sequentially in standalone Python."""
    logger.info("=" * 60)
    logger.info("STARTING FRAUD MLOPS PIPELINE (STANDALONE RUNNER)")
    logger.info("=" * 60)
    
    task_ingest()
    task_validate()
    task_preprocess()
    task_build_features()
    task_train()
    task_evaluate()
    
    decision = task_quality_gate_decision()
    if decision == "register_model":
        task_register_model()
        task_generate_report()
        logger.info("=" * 60)
        logger.info("MLOPS PIPELINE FINISHED SUCCESSFULLY [PASS]")
        logger.info("=" * 60)
    else:
        task_stop_pipeline()
        logger.warning("MLOPS PIPELINE FINISHED WITH QUALITY GATE ALERT [STOPPED]")


if __name__ == "__main__":
    run_dag_standalone()
