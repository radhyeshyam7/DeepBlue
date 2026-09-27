"""
API Integration Tests for FastAPI ML Service
"""

import pytest
from fastapi.testclient import TestClient
from ml_service.app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["service"] == "DeepBlue4 FastAPI ML Service"


def test_model_info_endpoint():
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["model_name"] == "FraudDetectionModel"
    assert "feature_names" in data
    assert len(data["feature_names"]) > 0


def test_predict_endpoint_valid():
    payload = {
        "amount": 1500.0,
        "user_avg_amount": 1200.0,
        "hour": 14,
        "day_of_week": 2,
        "is_new_payee": 0,
        "payee_trust_score": 0.95,
        "transaction_velocity": 1,
        "hesitation_score": 0.1,
        "edit_count": 0,
        "intent_mismatch_score": 0.0,
        "vulnerability_score": 0.1
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
    assert 0.0 <= data["anomaly_score"] <= 1.0
    assert data["recommended_action"] in ["ALLOW", "WARN", "DELAY"]
    assert "model_version" in data


def test_predict_endpoint_high_risk():
    payload = {
        "amount": 75000.0,
        "user_avg_amount": 500.0,
        "hour": 3,
        "day_of_week": 6,
        "is_new_payee": 1,
        "payee_trust_score": 0.05,
        "transaction_velocity": 12,
        "hesitation_score": 0.92,
        "edit_count": 5,
        "intent_mismatch_score": 0.85,
        "vulnerability_score": 0.90
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
    assert 0.0 <= data["anomaly_score"] <= 1.0


def test_explain_endpoint():
    payload = {
        "amount": 25000.0,
        "user_avg_amount": 1000.0,
        "hour": 2,
        "is_new_payee": 1,
        "payee_trust_score": 0.1
    }
    response = client.post("/explain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "shap_explanations" in data
    assert "lime_explanations" in data


def test_metrics_endpoint():
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "ml_prediction_total" in response.text
