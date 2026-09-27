"""
ML Predictor & Explainability Orchestrator for FastAPI Service
Handles model loading, feature scaling, inference, risk classification,
and SHAP / LIME explainability for DeepBlue4 / Saarthi AI.
"""

import os
import joblib
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

from mlops.features.build_features import extract_single_feature_vector, FEATURE_COLUMNS
from mlops.explainability.shap_explainer import FraudShapExplainer
from mlops.explainability.lime_explainer import FraudLimeExplainer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class FraudPredictor:
    """Manages ML inference and explainability."""

    def __init__(
        self,
        model_path: str = "mlops/artifacts/isolation_forest.joblib",
        scaler_path: str = "mlops/data/features/scaler.joblib",
        model_version: str = "v1.0.0"
    ):
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.model_version = model_version
        self.model = None
        self.scaler = None
        self.shap_explainer = None
        self.lime_explainer = None
        self.load_artifacts()

    def load_artifacts(self):
        """Loads trained Isolation Forest model, scaler, and explainers."""
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                logger.info(f"Loaded Isolation Forest model from: {self.model_path}")
            except Exception as e:
                logger.error(f"Error loading model from {self.model_path}: {e}")
                self.model = None
        else:
            logger.warning(f"Model path not found: {self.model_path}")

        if os.path.exists(self.scaler_path):
            try:
                self.scaler = joblib.load(self.scaler_path)
                logger.info(f"Loaded feature scaler from: {self.scaler_path}")
            except Exception as e:
                logger.warning(f"Error loading scaler: {e}")
                self.scaler = None
        else:
            logger.warning(f"Scaler path not found: {self.scaler_path}")

        # Initialize explainers
        self.shap_explainer = FraudShapExplainer(model_path=self.model_path)
        self.lime_explainer = FraudLimeExplainer(model_path=self.model_path)

    @property
    def is_loaded(self) -> bool:
        return self.model is not None

    def predict(self, input_dict: Dict[str, Any]) -> Tuple[str, float, int, str, list, list, list]:
        """
        Runs fraud inference on transaction payload.
        Returns (risk_level, anomaly_score, risk_score_100, recommended_action, top_features, fraud_reasons, shap_percentage_bars).
        """
        if not self.is_loaded:
            # Fallback if model not loaded
            logger.warning("Predictor invoked without loaded model. Using fallback.")
            return "MEDIUM", 0.50, 50, "WARN", [], ["Baseline fallback assessment"], []

        # Extract features and scale consistently
        X_scaled = extract_single_feature_vector(input_dict, scaler=self.scaler)
        
        # Isolation Forest scoring
        raw_score = float(-self.model.score_samples(X_scaled)[0])
        
        # Normalize into [0.0, 1.0] range
        # Typical raw scores are in [0.30, 0.75]
        normalized_score = float(np.clip((raw_score - 0.32) / 0.40, 0.0, 1.0))
        normalized_score = round(normalized_score, 4)

        # Numerical Risk Score from 0 to 100
        risk_score_100 = int(round(normalized_score * 100))

        # Risk Classification & Action Mapping:
        # 0-30: LOW (ALLOW)
        # 31-70: MEDIUM (WARN)
        # 71-100: HIGH (DELAY)
        if risk_score_100 >= 71:
            risk_level = "HIGH"
            recommended_action = "DELAY"
        elif risk_score_100 >= 31:
            risk_level = "MEDIUM"
            recommended_action = "WARN"
        else:
            risk_level = "LOW"
            recommended_action = "ALLOW"

        # Fraud Reason Engine - Human-readable explanations
        amount = float(input_dict.get("amount", 1000.0))
        user_avg = float(input_dict.get("user_avg_amount", 1000.0))
        hour = int(input_dict.get("hour", 12))
        is_new = int(input_dict.get("is_new_payee", 0))
        trust = float(input_dict.get("payee_trust_score", 0.85))
        velocity = int(input_dict.get("transaction_velocity", 1))
        edits = int(input_dict.get("edit_count", 0))
        hesitation = float(input_dict.get("hesitation_score", 0.1))

        fraud_reasons = []
        if user_avg > 0 and (amount / user_avg) >= 2.0:
            ratio = round(amount / user_avg, 1)
            fraud_reasons.append(f"Amount is {ratio}× higher than user's normal baseline (₹{amount:,.0f} vs ₹{user_avg:,.0f})")
        if is_new == 1:
            fraud_reasons.append("New payee detected (first transaction with this recipient)")
        if hour < 6 or hour >= 22:
            fraud_reasons.append(f"Transaction occurred during unusual nocturnal hours ({hour:02d}:00)")
        if velocity >= 4:
            fraud_reasons.append(f"High transaction velocity detected ({velocity} transactions within window)")
        if trust <= 0.35:
            fraud_reasons.append(f"Payee trust score is critically low ({trust:.2f} on 0–1 scale)")
        if edits >= 2 or hesitation >= 0.60:
            fraud_reasons.append(f"Behavioral hesitation detected ({edits} amount edits, {int(hesitation*100)}% hesitation)")

        if not fraud_reasons:
            if risk_level == "LOW":
                fraud_reasons.append("Transaction perfectly aligns with user's historical behavioral baseline")
            else:
                fraud_reasons.append("Subtle behavioral & velocity deviation flagged by Isolation Forest")

        # Compute SHAP feature attributions
        top_features = []
        shap_bars = []
        if self.shap_explainer:
            try:
                top_features = self.shap_explainer.explain_instance(X_scaled, FEATURE_COLUMNS)[:5]
                # Normalize into percentage bars for visual chart
                total_importance = sum(abs(f["importance"]) for f in top_features) or 1.0
                for f in top_features:
                    pct = int(round((abs(f["importance"]) / total_importance) * 100))
                    clean_name = f["feature"].replace("_", " ").title()
                    shap_bars.append({
                        "feature_key": f["feature"],
                        "feature_name": clean_name,
                        "importance": f["importance"],
                        "percentage": max(10, pct),
                        "direction": f["direction"]
                    })
            except Exception as e:
                logger.warning(f"SHAP explanation failed: {e}")

        return risk_level, normalized_score, risk_score_100, recommended_action, top_features, fraud_reasons, shap_bars

    def explain(self, input_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive SHAP and LIME explanations."""
        if not self.is_loaded:
            return {"error": "Model not loaded"}

        X_scaled = extract_single_feature_vector(input_dict, scaler=self.scaler)
        risk_level, score, risk_score_100, action, shap_contribs, fraud_reasons, shap_bars = self.predict(input_dict)
        
        lime_rules = []
        if self.lime_explainer:
            try:
                lime_rules = self.lime_explainer.explain_instance(X_scaled, FEATURE_COLUMNS)
            except Exception as e:
                logger.warning(f"LIME explanation failed: {e}")

        return {
            "risk_level": risk_level,
            "anomaly_score": score,
            "recommended_action": action,
            "model_version": self.model_version,
            "shap_explanations": shap_contribs,
            "lime_explanations": lime_rules
        }


# Global singleton instance
predictor = FraudPredictor()
