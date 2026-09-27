"""
FastAPI REST API Service for Real-Time UPI Fraud Detection & Explainability
Exposes /health, /model-info, /predict, /explain, and Prometheus /metrics endpoints.
Connects directly with Node.js backend.
"""

import time
import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from ml_service.app.schemas import (
    TransactionFeaturesInput,
    PredictionResponse,
    ExplanationResponse,
    ModelInfoResponse,
    HealthResponse
)
from ml_service.app.predictor import predictor
from mlops.features.build_features import FEATURE_COLUMNS
from mlops.monitoring.metrics import (
    ML_PREDICTIONS_TOTAL,
    ML_HIGH_RISK_PREDICTIONS_TOTAL,
    ML_PREDICTION_LATENCY_SECONDS,
    ML_MODEL_PREDICTION_SCORE,
    ML_PREDICTION_ERRORS_TOTAL,
    ML_MODEL_INFO
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for model loading and metrics startup."""
    logger.info("Initializing FastAPI ML Service...")
    predictor.load_artifacts()
    ML_MODEL_INFO.info({
        "model_name": "FraudDetectionModel",
        "model_version": predictor.model_version,
        "algorithm": "IsolationForest",
        "environment": ENVIRONMENT
    })
    logger.info(f"ML Service running. Model loaded = {predictor.is_loaded}")
    yield
    logger.info("Shutting down FastAPI ML Service...")


app = FastAPI(
    title="DeepBlue4 / Saarthi AI - Real-Time Fraud ML Service",
    description="100% Free & Open-Source MLOps Inference Service for UPI Fraud Prevention",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local backend & frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Service health check endpoint."""
    return HealthResponse(
        status="OK" if predictor.is_loaded else "DEGRADED",
        service="DeepBlue4 FastAPI ML Service",
        model_loaded=predictor.is_loaded,
        timestamp=datetime.utcnow().isoformat()
    )


@app.get("/model-info", response_model=ModelInfoResponse)
async def model_info():
    """Returns active model metadata, version, and feature contract."""
    return ModelInfoResponse(
        model_name="FraudDetectionModel",
        model_version=predictor.model_version,
        algorithm="IsolationForest",
        features_count=len(FEATURE_COLUMNS),
        feature_names=FEATURE_COLUMNS,
        status="LOADED" if predictor.is_loaded else "NOT_LOADED"
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict_fraud(payload: TransactionFeaturesInput):
    """
    Real-time fraud prediction endpoint.
    Invoked by Node.js backend on POST /transaction/intent.
    """
    start_time = time.perf_counter()
    model_ver = predictor.model_version

    try:
        data_dict = payload.model_dump()
        # Merge pre-extracted features if provided
        if payload.features:
            data_dict.update(payload.features)

        risk_level, score, risk_score_100, action, top_features, fraud_reasons, shap_bars = predictor.predict(data_dict)
        duration = time.perf_counter() - start_time

        # Update Prometheus Metrics (Low Cardinality only!)
        ML_PREDICTION_LATENCY_SECONDS.labels(model_version=model_ver).observe(duration)
        ML_PREDICTIONS_TOTAL.labels(
            risk_level=risk_level,
            model_version=model_ver,
            environment=ENVIRONMENT
        ).inc()

        if risk_level == "HIGH":
            ML_HIGH_RISK_PREDICTIONS_TOTAL.labels(
                model_version=model_ver,
                environment=ENVIRONMENT
            ).inc()

        ML_MODEL_PREDICTION_SCORE.labels(model_version=model_ver).set(score)

        return PredictionResponse(
            risk_level=risk_level,
            anomaly_score=score,
            risk_score_100=risk_score_100,
            recommended_action=action,
            model_version=model_ver,
            explanation_available=True,
            fraud_reasons=fraud_reasons,
            shap_percentage_bars=shap_bars,
            top_contributing_features=top_features
        )

    except Exception as e:
        ML_PREDICTION_ERRORS_TOTAL.labels(
            model_version=model_ver,
            error_type=type(e).__name__
        ).inc()
        logger.error(f"Inference error in /predict: {e}", exc_info=True)
        # Graceful fallback response
        return PredictionResponse(
            risk_level="MEDIUM",
            anomaly_score=0.50,
            recommended_action="WARN",
            model_version=model_ver,
            explanation_available=False,
            top_contributing_features=[]
        )


@app.post("/explain", response_model=ExplanationResponse)
async def explain_transaction(payload: TransactionFeaturesInput):
    """
    Explainability endpoint providing SHAP and LIME breakdown for a transaction.
    """
    try:
        data_dict = payload.model_dump()
        if payload.features:
            data_dict.update(payload.features)

        explanation = predictor.explain(data_dict)
        return ExplanationResponse(**explanation)
    except Exception as e:
        logger.error(f"Explainability error in /explain: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.api_route("/drift/check", methods=["GET", "POST"])
async def check_drift():
    """Statistical Drift Detection Endpoint (PSI, KS-Test, Wasserstein)."""
    try:
        from mlops.monitoring.drift import detect_drift
        report = detect_drift()
        return report
    except Exception as e:
        logger.error(f"Drift detection error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics")
async def metrics():
    """Prometheus scraping endpoint."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml_service.app.main:app", host="0.0.0.0", port=8001, reload=True)
