"""
Prometheus Metrics Instrumentation for DeepBlue4 / Saarthi AI
Defines standardized, low-cardinality Prometheus metrics for real-time inference monitoring.

Strict Privacy & Performance Rule:
Never include PII, user IDs, phone numbers, or transaction IDs in metric labels.
"""

from prometheus_client import Counter, Histogram, Gauge, Info

# 1. Prediction Volume & Rates
ML_PREDICTIONS_TOTAL = Counter(
    "ml_prediction_total",
    "Total count of real-time fraud ML predictions evaluated",
    ["risk_level", "model_version", "environment"]
)

ML_HIGH_RISK_PREDICTIONS_TOTAL = Counter(
    "ml_high_risk_prediction_total",
    "Count of transactions flagged as HIGH risk requiring intervention",
    ["model_version", "environment"]
)

# 2. Latency
ML_PREDICTION_LATENCY_SECONDS = Histogram(
    "ml_prediction_latency_seconds",
    "Inference latency duration in seconds",
    ["model_version"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 1.0]
)

# 3. Anomaly Scoring & Drift
ML_MODEL_PREDICTION_SCORE = Gauge(
    "ml_model_prediction_score",
    "Most recent anomaly score emitted by Isolation Forest",
    ["model_version"]
)

ML_MODEL_DRIFT_SCORE = Gauge(
    "ml_model_drift_score",
    "Latest Population Stability Index (PSI) drift score",
    ["model_version"]
)

# 4. Data Quality & Errors
ML_FEATURE_MISSING_TOTAL = Counter(
    "ml_feature_missing_total",
    "Total count of missing or imputed feature occurrences in inference requests",
    ["model_version"]
)

ML_PREDICTION_ERRORS_TOTAL = Counter(
    "ml_prediction_errors_total",
    "Count of exceptions or fallback invocations during inference",
    ["model_version", "error_type"]
)

# 5. Model Version & Metadata Info
ML_MODEL_INFO = Info(
    "ml_model_info",
    "Current active ML model metadata and registry version"
)
