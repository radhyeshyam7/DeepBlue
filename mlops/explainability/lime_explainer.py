"""
LIME Explainability Engine for DeepBlue4 / Saarthi AI
Provides local interpretable model-agnostic explanations (LIME) for individual UPI transactions.
Creates local linear approximations to explain anomaly scores.
"""

import os
import joblib
import logging
import numpy as np
import pandas as pd
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class FraudLimeExplainer:
    """Wrapper around LIME Tabular Explainer for fraud anomaly scoring."""

    def __init__(self, training_data_path: str = "mlops/data/features/features_train.csv", model_path: str = "mlops/artifacts/isolation_forest.joblib"):
        self.training_data_path = training_data_path
        self.model_path = model_path
        self.model = None
        self.explainer = None
        self.feature_names = None
        self._initialize()

    def _initialize(self):
        if not os.path.exists(self.model_path):
            logger.warning(f"Model path {self.model_path} not found.")
            return
            
        self.model = joblib.load(self.model_path)
        
        if os.path.exists(self.training_data_path):
            try:
                import lime
                import lime.lime_tabular
                
                df = pd.read_csv(self.training_data_path)
                self.feature_names = [c for c in df.columns if c != "fraud_flag"]
                X_train = df[self.feature_names].values
                
                self.explainer = lime.lime_tabular.LimeTabularExplainer(
                    training_data=X_train,
                    feature_names=self.feature_names,
                    class_names=["Normal", "Anomaly"],
                    mode="classification",
                    random_state=42
                )
                logger.info("LIME Tabular Explainer initialized successfully.")
            except Exception as e:
                logger.warning(f"LIME initialization warning: {e}. Fallback enabled.")
                self.explainer = None

    def _predict_proba_wrapper(self, X: np.ndarray) -> np.ndarray:
        """Wrapper to produce 2-class probability distribution from Isolation Forest score."""
        raw_scores = -self.model.score_samples(X)
        # Normalize into pseudo-probabilities using sigmoid
        prob_anomaly = 1.0 / (1.0 + np.exp(-4.0 * (raw_scores - 0.5)))
        prob_anomaly = np.clip(prob_anomaly, 0.001, 0.999)
        prob_normal = 1.0 - prob_anomaly
        return np.column_stack([prob_normal, prob_anomaly])

    def explain_instance(self, feature_vector: np.ndarray, feature_names: List[str] = None) -> List[Dict[str, Any]]:
        """Explain an individual transaction using LIME."""
        if feature_vector.ndim == 2:
            vec = feature_vector[0]
        else:
            vec = feature_vector
            
        if self.explainer is not None:
            try:
                exp = self.explainer.explain_instance(
                    data_row=vec,
                    predict_fn=self._predict_proba_wrapper,
                    num_features=6
                )
                
                explanations = []
                for feat_rule, weight in exp.as_list():
                    explanations.append({
                        "rule": feat_rule,
                        "weight": round(float(weight), 4),
                        "impact": "INCREASES_ANOMALY_RISK" if weight > 0 else "DECREASES_ANOMALY_RISK"
                    })
                return explanations
            except Exception as e:
                logger.warning(f"LIME explanation generation error: {e}. Fallback enabled.")
                
        # Simple rule-based explanation fallback
        names = feature_names or (self.feature_names if self.feature_names else [f"feature_{i}" for i in range(len(vec))])
        return [
            {
                "rule": f"{name} = {round(float(val), 2)}",
                "weight": round(float(abs(val) * 0.1), 4),
                "impact": "INCREASES_ANOMALY_RISK" if val > 0 else "DECREASES_ANOMALY_RISK"
            }
            for name, val in zip(names[:5], vec[:5])
        ]


if __name__ == "__main__":
    lime_exp = FraudLimeExplainer()
