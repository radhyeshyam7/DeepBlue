"""
Statistical Drift Detection Engine for DeepBlue4 / Saarthi AI
Computes Population Stability Index (PSI), Kolmogorov-Smirnov (KS) two-sample test,
and Wasserstein Distance (Earth Mover's Distance) to detect data distribution shift
between reference baseline training data and production/batch inference streams.
"""

import os
import json
import yaml
import logging
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp, wasserstein_distance

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def load_params(params_path="mlops/params.yaml"):
    """Load configuration parameters."""
    if not os.path.exists(params_path):
        params_path = os.path.join(os.path.dirname(__file__), "..", "params.yaml")
    with open(params_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def calculate_psi(expected: np.ndarray, actual: np.ndarray, num_buckets: int = 10) -> float:
    """
    Calculate Population Stability Index (PSI) between expected (reference) and actual (current) arrays.
    
    Interpretation:
    - PSI < 0.10: No significant distribution change (Stable)
    - 0.10 <= PSI < 0.25: Moderate distribution shift (Warning)
    - PSI >= 0.25: Significant distribution shift (Alert / Retraining candidate)
    """
    if len(expected) == 0 or len(actual) == 0:
        return 0.0
        
    # Remove NaNs and infinities
    expected = expected[np.isfinite(expected)]
    actual = actual[np.isfinite(actual)]
    
    if len(expected) == 0 or len(actual) == 0:
        return 0.0

    # Determine quantile bin edges based on expected distribution
    percentiles = np.linspace(0, 100, num_buckets + 1)
    try:
        bin_edges = np.percentile(expected, percentiles)
    except Exception:
        return 0.0
        
    bin_edges = np.unique(bin_edges)
    if len(bin_edges) <= 1:
        return 0.0
        
    bin_edges[0] = -np.inf
    bin_edges[-1] = np.inf

    # Count occurrences in each bucket
    expected_counts, _ = np.histogram(expected, bins=bin_edges)
    actual_counts, _ = np.histogram(actual, bins=bin_edges)

    # Convert to fractions with Laplace smoothing to avoid division by zero
    expected_pct = (expected_counts + 1e-5) / (len(expected) + 1e-5 * len(expected_counts))
    actual_pct = (actual_counts + 1e-5) / (len(actual) + 1e-5 * len(actual_counts))

    # Calculate PSI
    psi_val = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return float(max(0.0, psi_val))


def calculate_ks_test(expected: np.ndarray, actual: np.ndarray) -> tuple:
    """
    Perform two-sample Kolmogorov-Smirnov test.
    Returns (statistic, p_value).
    If p_value < 0.05, we reject the null hypothesis that distributions are identical.
    """
    expected = expected[np.isfinite(expected)]
    actual = actual[np.isfinite(actual)]
    if len(expected) == 0 or len(actual) == 0:
        return 0.0, 1.0
    stat, p_val = ks_2samp(expected, actual)
    return float(stat), float(p_val)


def calculate_normalized_wasserstein(expected: np.ndarray, actual: np.ndarray) -> float:
    """
    Compute Earth Mover's (Wasserstein) distance, normalized by reference standard deviation
    to allow cross-feature comparability.
    """
    expected = expected[np.isfinite(expected)]
    actual = actual[np.isfinite(actual)]
    if len(expected) == 0 or len(actual) == 0:
        return 0.0
    raw_dist = float(wasserstein_distance(expected, actual))
    std_ref = float(np.std(expected))
    if std_ref > 1e-5:
        return float(raw_dist / std_ref)
    return float(raw_dist)


def detect_drift(
    reference_df: pd.DataFrame = None,
    current_df: pd.DataFrame = None,
    params_path: str = "mlops/params.yaml"
) -> dict:
    """
    Comprehensive drift detection evaluating PSI, KS test, and Wasserstein distance
    across configured numerical and behavioral features.
    """
    params = load_params(params_path)
    drift_cfg = params.get("drift", {})
    features_to_monitor = drift_cfg.get("features_to_monitor", [
        "amount", "transaction_velocity", "payee_trust_score",
        "amount_deviation", "hesitation_score", "edit_count"
    ])
    
    psi_warn = drift_cfg.get("psi_warning_threshold", 0.10)
    psi_alert = drift_cfg.get("psi_alert_threshold", 0.25)
    ks_p_thresh = drift_cfg.get("ks_p_value_threshold", 0.05)
    wass_thresh = drift_cfg.get("wasserstein_threshold", 0.20)

    # Load from disk if DataFrames not passed directly
    if reference_df is None:
        ref_path = params["data"]["reference_data_path"]
        if not os.path.exists(ref_path):
            ref_path = params["data"]["processed_path"]
        reference_df = pd.read_csv(ref_path)

    if current_df is None:
        cur_path = params["data"]["current_data_path"]
        if not os.path.exists(cur_path):
            cur_path = params["data"]["processed_path"]
        current_df = pd.read_csv(cur_path)

    feature_reports = {}
    psi_scores = []
    drift_detected_count = 0

    for col in features_to_monitor:
        if col in reference_df.columns and col in current_df.columns:
            ref_vals = reference_df[col].dropna().values
            cur_vals = current_df[col].dropna().values
            
            # 1. PSI
            psi_val = calculate_psi(ref_vals, cur_vals)
            psi_scores.append(psi_val)
            
            # 2. KS Test
            ks_stat, ks_pval = calculate_ks_test(ref_vals, cur_vals)
            
            # 3. Wasserstein Distance
            wass_dist = calculate_normalized_wasserstein(ref_vals, cur_vals)
            
            # Status Determination
            if psi_val >= psi_alert or (ks_pval < ks_p_thresh and wass_dist > wass_thresh):
                status = "DRIFT_ALERT"
                drift_detected_count += 1
            elif psi_val >= psi_warn:
                status = "DRIFT_WARNING"
            else:
                status = "STABLE"

            feature_reports[col] = {
                "psi": round(psi_val, 4),
                "ks_statistic": round(ks_stat, 4),
                "ks_p_value": round(ks_pval, 5),
                "wasserstein_distance": round(wass_dist, 4),
                "status": status
            }

    overall_drift_score = float(np.mean(psi_scores)) if psi_scores else 0.0
    overall_status = (
        "ALERT" if overall_drift_score >= psi_alert or drift_detected_count >= 2
        else "WARNING" if overall_drift_score >= psi_warn or drift_detected_count >= 1
        else "HEALTHY"
    )

    report = {
        "overall_status": overall_status,
        "overall_drift_score": round(overall_drift_score, 4),
        "drifted_features_count": drift_detected_count,
        "features_monitored_count": len(feature_reports),
        "thresholds": {
            "psi_warning": psi_warn,
            "psi_alert": psi_alert,
            "ks_p_value": ks_p_thresh,
            "wasserstein": wass_thresh
        },
        "features": feature_reports
    }

    # Save drift report
    report_path = "mlops/artifacts/drift_report.json"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    logger.info(f"Drift Analysis Completed: Status = {overall_status}, Mean PSI = {report['overall_drift_score']}")
    return report


if __name__ == "__main__":
    detect_drift()
