"""
Pydantic Request & Response Schemas for FastAPI ML Service
Matches exact contract expected by DeepBlue4 / Saarthi AI Node.js backend.
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, ConfigDict


class TransactionFeaturesInput(BaseModel):
    """Input payload for fraud prediction / explainability."""
    # Transaction context
    amount: float = Field(..., gt=0.0, description="Transaction amount in INR")
    user_avg_amount: Optional[float] = Field(1000.0, gt=0.0, description="User historical average amount")
    hour: Optional[int] = Field(12, ge=0, le=23, description="Transaction hour (0-23)")
    day_of_week: Optional[int] = Field(2, ge=0, le=6, description="Day of week (0=Mon, 6=Sun)")
    
    # Payee relationship
    is_new_payee: Optional[int] = Field(0, ge=0, le=1, description="1 if new payee, 0 otherwise")
    payee_trust_score: Optional[float] = Field(0.85, ge=0.0, le=1.0, description="Payee trust score [0, 1]")
    
    # Behavioral & Velocity
    transaction_velocity: Optional[int] = Field(1, ge=0, description="Recent transaction count in past hour")
    hesitation_score: Optional[float] = Field(0.1, ge=0.0, le=1.0, description="Behavioral hesitation score [0, 1]")
    edit_count: Optional[int] = Field(0, ge=0, description="Count of edits made to payment amount")
    intent_mismatch_score: Optional[float] = Field(0.0, ge=0.0, le=1.0, description="Intent mismatch indicator")
    vulnerability_score: Optional[float] = Field(0.1, ge=0.0, le=1.0, description="User vulnerability score")

    # Optional pre-extracted raw features dictionary (for backwards compatibility)
    features: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "amount": 25000.0,
                "user_avg_amount": 1200.0,
                "hour": 2,
                "day_of_week": 5,
                "is_new_payee": 1,
                "payee_trust_score": 0.15,
                "transaction_velocity": 8,
                "hesitation_score": 0.78,
                "edit_count": 3,
                "intent_mismatch_score": 0.65,
                "vulnerability_score": 0.70
            }
        }
    )


class FeatureContribution(BaseModel):
    feature: str
    importance: float
    value: float
    direction: str


class PredictionResponse(BaseModel):
    """Standardized response format matching existing risk engine contract."""
    risk_level: str = Field(..., description="Risk category: LOW, MEDIUM, or HIGH")
    anomaly_score: float = Field(..., description="Anomaly score between 0.0 and 1.0")
    risk_score_100: int = Field(0, description="Numerical risk score on scale 0-100")
    recommended_action: str = Field(..., description="Recommended action: ALLOW, WARN, or DELAY")
    model_version: str = Field(..., description="Model version from registry")
    explanation_available: bool = Field(True, description="Whether explanation breakdown is available")
    fraud_reasons: List[str] = Field(
        default_factory=list,
        description="Human-readable explanation bullet points from Fraud Reason Engine"
    )
    shap_percentage_bars: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Normalized visual percentage bars (0-100%) for SHAP contributions"
    )
    top_contributing_features: List[FeatureContribution] = Field(
        default_factory=list,
        description="Top contributing features explaining the score"
    )


class LimeRuleExplanation(BaseModel):
    rule: str
    weight: float
    impact: str


class ExplanationResponse(BaseModel):
    risk_level: str
    anomaly_score: float
    model_version: str
    shap_explanations: List[FeatureContribution]
    lime_explanations: List[LimeRuleExplanation]


class ModelInfoResponse(BaseModel):
    model_name: str
    model_version: str
    algorithm: str
    features_count: int
    feature_names: List[str]
    status: str


class HealthResponse(BaseModel):
    status: str
    service: str
    model_loaded: bool
    timestamp: str
