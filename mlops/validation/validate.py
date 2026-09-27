"""
Data Validation Engine for DeepBlue4 / Saarthi AI
Implements rigorous Pandera schema checks, range validations, missing-value constraints,
and duplicate checks before allowing model training to proceed.
"""

import os
import json
import yaml
import logging
import pandas as pd
import pandera as pa
from pandera import Column, Check, DataFrameSchema
from pandera.errors import SchemaErrors

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def load_params(params_path="mlops/params.yaml"):
    """Load configuration parameters."""
    if not os.path.exists(params_path):
        params_path = os.path.join(os.path.dirname(__file__), "..", "params.yaml")
    with open(params_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_transaction_schema() -> DataFrameSchema:
    """Define Pandera validation schema for UPI transactions."""
    return DataFrameSchema(
        columns={
            "transaction_id": Column(
                pa.String,
                nullable=False,
                unique=True,
                description="Unique identifier for transaction"
            ),
            "user_id_hash": Column(
                pa.String,
                nullable=False,
                description="Anonymized user identifier hash"
            ),
            "amount": Column(
                pa.Float,
                checks=[
                    Check.greater_than(0.0, error="Amount must be strictly positive"),
                    Check.less_than_or_equal_to(200000.0, error="Amount exceeds maximum UPI cap (INR 2,00,000)")
                ],
                nullable=False
            ),
            "hour": Column(
                pa.Int,
                checks=Check.in_range(0, 23, include_min=True, include_max=True),
                nullable=False
            ),
            "day_of_week": Column(
                pa.Int,
                checks=Check.in_range(0, 6, include_min=True, include_max=True),
                nullable=False
            ),
            "is_new_payee": Column(
                pa.Int,
                checks=Check.isin([0, 1]),
                nullable=False
            ),
            "payee_trust_score": Column(
                pa.Float,
                checks=Check.in_range(0.0, 1.0, include_min=True, include_max=True),
                nullable=False
            ),
            "transaction_velocity": Column(
                pa.Int,
                checks=Check.greater_than_or_equal_to(0),
                nullable=False
            ),
            "user_avg_amount": Column(
                pa.Float,
                checks=Check.greater_than(0.0),
                nullable=False
            ),
            "amount_deviation": Column(
                pa.Float,
                nullable=False
            ),
            "hesitation_score": Column(
                pa.Float,
                checks=Check.in_range(0.0, 1.0, include_min=True, include_max=True),
                nullable=False
            ),
            "edit_count": Column(
                pa.Int,
                checks=Check.greater_than_or_equal_to(0),
                nullable=False
            ),
            "intent_mismatch_score": Column(
                pa.Float,
                checks=Check.in_range(0.0, 1.0, include_min=True, include_max=True),
                nullable=False
            ),
            "vulnerability_score": Column(
                pa.Float,
                checks=Check.in_range(0.0, 1.0, include_min=True, include_max=True),
                nullable=False
            ),
            "fraud_flag": Column(
                pa.Int,
                checks=Check.isin([0, 1]),
                nullable=False
            )
        },
        coerce=True,
        strict=True
    )


def validate_data(input_path: str = None, params_path: str = "mlops/params.yaml") -> bool:
    """
    Validate dataset against Pandera schema and quality criteria.
    Stops the pipeline if any schema violation or data corruption is detected.
    """
    params = load_params(params_path)
    if input_path is None:
        input_path = params["data"]["raw_path"]
        
    logger.info(f"Validating dataset from: {input_path}")
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Dataset not found at: {input_path}")
        
    df = pd.read_csv(input_path)
    schema = get_transaction_schema()
    
    report = {
        "dataset_path": input_path,
        "total_records": len(df),
        "total_columns": len(df.columns),
        "missing_values": int(df.isnull().sum().sum()),
        "duplicate_rows": int(df.duplicated(subset=["transaction_id"]).sum()),
        "status": "PASS",
        "errors": []
    }
    
    try:
        schema.validate(df, lazy=True)
        logger.info(f"Data Validation PASSED. Validated {len(df)} transactions against Pandera schema.")
    except SchemaErrors as err:
        report["status"] = "FAIL"
        failure_cases = err.failure_cases.to_dict(orient="records")
        report["errors"] = failure_cases
        logger.error(f"Data Validation FAILED with {len(failure_cases)} schema errors!")
        
        # Write failure report
        report_dir = "mlops/artifacts"
        os.makedirs(report_dir, exist_ok=True)
        with open(os.path.join(report_dir, "validation_report.json"), "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
            
        raise ValueError(f"Data validation failed! See mlops/artifacts/validation_report.json for details.")
        
    # Write success report
    report_dir = "mlops/artifacts"
    os.makedirs(report_dir, exist_ok=True)
    with open(os.path.join(report_dir, "validation_report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        
    return True


if __name__ == "__main__":
    validate_data()
