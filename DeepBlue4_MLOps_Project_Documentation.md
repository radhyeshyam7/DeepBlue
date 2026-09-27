# DeepBlue4 / Saarthi AI — MLOps Project Documentation

## End-to-End MLOps Enhancement Plan

---

## 1. Project Title

### An End-to-End MLOps Framework for Real-Time UPI Fraud Detection and Risk Management

**Project Name:** DeepBlue4 / Saarthi AI  
**Domain:** Machine Learning Operations, FinTech, Fraud Detection  
**Application:** Real-Time Intelligent UPI Fraud Prevention

---

# 2. Project Overview

DeepBlue4 / Saarthi AI is a real-time UPI fraud prevention system designed to analyze transaction context, user behavior, payee history and transaction patterns before allowing a payment to proceed.

The existing application is a full-stack system containing:

- React + Vite frontend
- Node.js + Express backend
- MongoDB database
- Redis
- Isolation Forest anomaly detection
- Hybrid rule-based + ML risk engine
- Behavioral profiling
- Cashfree payment integration
- Optional Twilio trusted-contact alerts

The current system already performs real-time risk evaluation. The objective of the MLOps enhancement is to add a complete machine-learning lifecycle around the existing application.

The enhanced system will cover:

- Data versioning
- Data validation
- Feature engineering
- Experiment tracking
- Model versioning
- Automated ML pipelines
- Model deployment
- Containerization
- CI/CD
- Monitoring
- Drift detection
- Explainability
- Responsible AI
- Cloud deployment

---

# 3. Existing System

## 3.1 Existing Technology Stack

### Frontend

- React 18
- Vite
- Tailwind CSS
- Radix UI
- Framer Motion
- Zustand

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Redis

### Machine Learning

- Isolation Forest
- Hybrid rule-based + ML risk engine
- Behavioral profiling

### External Services

- Cashfree Payments
- Twilio

---

# 4. Existing System Architecture

```text
                    React Frontend
                          |
                          |
                          v
                 Node.js / Express
                          |
                          v
                 Hybrid Risk Engine
                    /          \
                   /            \
                  v              v
          Rule-Based Engine   Isolation Forest
                  \              /
                   \            /
                    v          v
                     Risk Score
                          |
             +------------+------------+
             |                         |
             v                         v
          MongoDB                   Redis
             |
             v
      Transaction History
             |
             +----------------------+
             |                      |
             v                      v
        Cashfree                 Twilio
        Payment                  Alerts
```

---

# 5. Problem Statement

Traditional ML projects often stop after training a model and achieving an evaluation score.

A production-oriented ML system requires much more:

- Dataset management
- Data validation
- Reproducible training
- Feature consistency
- Experiment tracking
- Model versioning
- Automated pipelines
- Deployment
- Monitoring
- Drift detection
- Explainability
- Continuous testing
- Controlled retraining

Therefore, the existing UPI fraud detection system will be enhanced into an end-to-end MLOps platform.

---

# 6. Objectives

The major objectives are:

1. Build a reproducible ML lifecycle.
2. Version datasets using DVC.
3. Track experiments using MLflow.
4. Implement feature engineering as a reusable pipeline.
5. Validate datasets before training.
6. Automate ML workflows using Apache Airflow.
7. Deploy the ML model using FastAPI.
8. Containerize the ML service using Docker.
9. Implement CI/CD using GitHub Actions.
10. Monitor the ML service using Prometheus and Grafana.
11. Detect data and model drift.
12. Add SHAP/LIME explainability.
13. Apply Responsible AI principles.
14. Implement model versioning using MLflow Model Registry.
15. Provide an AWS SageMaker deployment path.
16. Maintain reproducibility and traceability throughout the ML lifecycle.

---

# 7. MLOps Lifecycle

The complete lifecycle will be:

```text
Problem Formulation
        ↓
Data Collection
        ↓
Data Versioning
        ↓
Data Validation
        ↓
Preprocessing
        ↓
Feature Engineering
        ↓
Model Training
        ↓
Experiment Tracking
        ↓
Model Evaluation
        ↓
Model Registry
        ↓
Model Deployment
        ↓
Real-Time Prediction
        ↓
Monitoring
        ↓
Drift Detection
        ↓
Evaluation / Retraining
```

---

# 8. Syllabus Mapping

| Unit | Syllabus Topic | Project Implementation |
|---|---|---|
| Unit I | ML Lifecycle | Complete fraud-detection lifecycle |
| Unit I | MLOps concepts | End-to-end MLOps architecture |
| Unit I | Versioning | Git + DVC |
| Unit I | Reproducibility | DVC + MLflow + configuration |
| Unit I | Monitoring | Prometheus + Grafana |
| Unit II | Data Versioning | DVC |
| Unit II | Dataset Management | Versioned transaction dataset |
| Unit II | Experiment Tracking | MLflow |
| Unit II | Feature Engineering | Automated feature pipeline |
| Unit II | Model Registry | MLflow Model Registry |
| Unit II | Data Validation | Schema and quality validation |
| Unit III | ML Pipelines | Automated training pipeline |
| Unit III | DAGs | Airflow DAG |
| Unit III | Workflow Automation | Airflow |
| Unit III | CI/CD | GitHub Actions |
| Unit III | Testing | Unit + API + pipeline tests |
| Unit IV | Model Deployment | FastAPI |
| Unit IV | REST API | Prediction API |
| Unit IV | Docker | Containerized ML service |
| Unit IV | Real-Time Inference | FastAPI |
| Unit IV | Batch Inference | Airflow scheduled jobs |
| Unit IV | Monitoring | Prometheus + Grafana |
| Unit IV | Drift Detection | Statistical drift monitoring |
| Unit V | Responsible AI | Privacy, fairness and governance |
| Unit V | Explainability | SHAP + LIME |
| Unit V | Model Drift | Drift dashboard |
| Unit VI | Cloud MLOps | AWS architecture |
| Unit VI | SageMaker | Training and deployment path |
| Unit VI | Industry Application | Finance / fraud detection |

---

# 9. Enhanced MLOps Architecture

```text
                         USER
                          |
                          v
                  React Frontend
                          |
                          v
                 Node.js / Express
                          |
                          v
                  FastAPI ML Service
                          |
              +-----------+-----------+
              |                       |
              v                       v
       Feature Pipeline          MLflow Model
              |                    Registry
              |                       |
              +-----------+-----------+
                          |
                          v
                  Fraud Prediction
                          |
             +------------+-------------+
             |            |             |
             v            v             v
          MongoDB       Redis       Prometheus
                                       |
                                       v
                                    Grafana
                                       |
                                       v
                                Drift Detection
```

---

# 10. Training Architecture

```text
                 Versioned Dataset
                       |
                       v
                      DVC
                       |
                       v
                Data Validation
                       |
                       v
                 Preprocessing
                       |
                       v
              Feature Engineering
                       |
                       v
                 Model Training
                       |
                       v
              MLflow Experiment
                 Tracking
                       |
                       v
                 Evaluation
                       |
                +------+------+
                |             |
              FAIL           PASS
                |             |
                v             v
             Stop       Model Registry
                              |
                              v
                         Deployment
```

---

# 11. Data Management

## 11.1 Dataset

The project should use an anonymized or synthetic transaction dataset for academic experimentation.

Possible features:

| Feature | Description |
|---|---|
| transaction_id | Unique transaction identifier |
| user_id_hash | Anonymized user identifier |
| amount | Transaction amount |
| hour | Transaction hour |
| day_of_week | Day of transaction |
| is_new_payee | Whether payee is new |
| payee_trust_score | Historical trust score |
| transaction_velocity | Recent transaction frequency |
| user_avg_amount | Historical average transaction amount |
| amount_deviation | Deviation from historical amount |
| hesitation_score | Behavioral hesitation signal |
| edit_count | Number of transaction edits |
| intent_mismatch_score | Intent mismatch indicator |
| vulnerability_score | Risk-related behavioral score |

Sensitive real-world payment credentials must not be used.

---

# 12. Data Versioning Using DVC

DVC will be used to version datasets separately from source code.

## Structure

```text
mlops/
├── data/
│   ├── raw/
│   ├── processed/
│   └── features/
├── dvc.yaml
└── dvc.lock
```

## Benefits

- Dataset versioning
- Reproducibility
- Dataset history
- Pipeline reproducibility
- Separation of code and large data files

---

# 13. Data Validation

Data validation should happen before model training.

## Validation Checks

### Schema

- Required columns exist
- Correct data types
- Expected column names

### Missing Data

- Missing amount
- Missing payee information
- Missing behavioral features

### Duplicate Data

- Duplicate transaction IDs
- Duplicate records

### Range Checks

- Transaction amount should be valid
- Scores should remain within configured ranges
- Hour should be between 0 and 23

### Consistency Checks

- Timestamp format
- Categorical values
- Feature relationships

---

# 14. Data Processing Pipeline

```text
Raw Data
   |
   v
Schema Validation
   |
   v
Missing Value Handling
   |
   v
Duplicate Removal
   |
   v
Outlier / Range Validation
   |
   v
Feature Transformation
   |
   v
Processed Dataset
```

---

# 15. Feature Engineering

A dedicated feature engineering pipeline should be implemented.

## Derived Features

### Amount Deviation

```text
amount_deviation =
current_amount - historical_average
```

### Amount Ratio

```text
amount_ratio =
current_amount / historical_average
```

### New Payee Indicator

```text
is_new_payee = 1
```

when the payee has not previously been observed for the user.

### Transaction Velocity

Measures the number of recent transactions in a configured time window.

### Late-Night Indicator

Identifies transactions occurring during a configured unusual time period.

### Behavioral Features

- hesitation score
- edit count
- confirmation timing
- interaction-related signals

---

# 16. Training-Serving Consistency

The same feature transformation logic should be used for:

```text
Training
   |
   v
Validation
   |
   v
Batch Inference
   |
   v
Real-Time Inference
```

This reduces training-serving skew.

---

# 17. MLflow Experiment Tracking

MLflow will track machine-learning experiments.

## Parameters

Examples:

- model configuration
- contamination
- feature version
- preprocessing version
- random seed

## Metrics

Examples:

- precision
- recall
- F1 score
- false-positive rate
- false-negative rate
- inference latency
- anomaly-related evaluation metrics

## Artifacts

Examples:

- trained model
- evaluation report
- plots
- feature configuration
- explainability output
- drift report

---

# 18. Model Registry

MLflow Model Registry will maintain model versions.

```text
FraudDetectionModel

Version 1
     ↓
Version 2
     ↓
Version 3
```

Possible lifecycle:

```text
Training
   ↓
Validation
   ↓
Candidate
   ↓
Approved
   ↓
Production
   ↓
Archived
```

The application should load a controlled model version rather than an arbitrary local model file.

---

# 19. Existing ML Model

The current project uses Isolation Forest as the ML anomaly-detection component.

The enhanced MLOps architecture should preserve this model where appropriate.

The MLOps system should add:

- reproducible training
- experiment tracking
- model versioning
- evaluation
- deployment
- monitoring
- drift detection
- explainability

The system should distinguish anomaly detection from supervised classification if ground-truth fraud labels are unavailable.

---

# 20. Airflow ML Pipeline

An Apache Airflow DAG will automate the ML workflow.

## DAG

```text
                Start
                  |
                  v
           Data Ingestion
                  |
                  v
           Data Validation
                  |
                  v
            Preprocessing
                  |
                  v
        Feature Engineering
                  |
                  v
           Model Training
                  |
                  v
           Model Evaluation
                  |
                  v
        MLflow Experiment Log
                  |
                  v
          Model Registration
                  |
                  v
             Report
```

---

# 21. Airflow Tasks

Recommended tasks:

1. `ingest_data`
2. `validate_data`
3. `preprocess_data`
4. `build_features`
5. `train_model`
6. `evaluate_model`
7. `log_to_mlflow`
8. `register_model`
9. `generate_report`

If validation fails, downstream training should not continue.

---

# 22. FastAPI Model Serving

The ML model should be exposed through a dedicated FastAPI service.

## Architecture

```text
Node.js Backend
       |
       | HTTP
       v
FastAPI ML Service
       |
       v
Feature Transformation
       |
       v
MLflow Model
       |
       v
Prediction
```

---

# 23. API Endpoints

Recommended endpoints:

```text
GET  /health
GET  /model-info
POST /predict
POST /explain
GET  /metrics
```

## Example Prediction

```json
{
  "risk_level": "HIGH",
  "anomaly_score": 0.82,
  "recommended_action": "DELAY",
  "model_version": "3"
}
```

The API should validate incoming requests before prediction.

---

# 24. Real-Time Inference

Real-time inference will be used when a user initiates a transaction.

```text
User Initiates Transaction
          |
          v
     React Frontend
          |
          v
     Node.js Backend
          |
          v
      FastAPI ML
          |
          v
     Feature Pipeline
          |
          v
     ML Model
          |
          v
    Risk Prediction
```

---

# 25. Batch Inference

Batch inference can be used for:

- historical transaction analysis
- drift analysis
- periodic evaluation
- monitoring
- offline model validation

```text
Airflow
   ↓
Transaction Batch
   ↓
Feature Engineering
   ↓
Model Inference
   ↓
Monitoring Report
```

---

# 26. Docker Containerization

The FastAPI service should be containerized.

## Recommended Structure

```text
ml-service/
├── app/
│   ├── main.py
│   ├── predictor.py
│   └── schemas.py
├── requirements.txt
├── Dockerfile
└── .dockerignore
```

Docker provides:

- consistent runtime
- dependency isolation
- reproducibility
- easier deployment

---

# 27. Docker Compose

A local MLOps environment can contain:

```text
+------------------+
| React Frontend   |
+------------------+
         |
+------------------+
| Node Backend     |
+------------------+
         |
+------------------+
| FastAPI ML       |
+------------------+
    |          |
    v          v
 MLflow      MongoDB
    |
    v
Model Registry

Prometheus
    |
    v
Grafana
```

Redis can continue to support the existing application.

---

# 28. CI/CD Using GitHub Actions

GitHub Actions should automate:

```text
Git Push
   ↓
Install Dependencies
   ↓
Lint
   ↓
Unit Tests
   ↓
API Tests
   ↓
Data Validation
   ↓
Model Validation
   ↓
Docker Build
```

Recommended workflows:

```text
.github/
└── workflows/
    ├── test.yml
    ├── ml-pipeline.yml
    └── docker.yml
```

Secrets should be stored using GitHub Secrets.

---

# 29. Testing

## Unit Testing

Test:

- feature generation
- preprocessing
- model loading
- prediction
- drift calculations

## API Testing

Test:

- `/health`
- `/predict`
- `/explain`
- invalid requests
- missing features

## Pipeline Testing

Test:

- validation failure
- evaluation failure
- model registration conditions

## Integration Testing

Test:

```text
Node.js → FastAPI
FastAPI → Model
FastAPI → Prometheus
```

---

# 30. Monitoring

The system should monitor both the application and the ML model.

## Application Metrics

- request count
- response latency
- error rate
- API availability

## ML Metrics

- prediction count
- high-risk prediction count
- anomaly score
- model version
- inference latency
- feature missing rate
- drift score

---

# 31. Prometheus

Recommended metrics:

```text
ml_prediction_total
ml_prediction_latency_seconds
ml_high_risk_prediction_total
ml_model_prediction_score
ml_feature_missing_total
ml_model_drift_score
```

Avoid high-cardinality metric labels such as:

- user ID
- transaction ID
- email
- phone number

---

# 32. Grafana Dashboard

The dashboard should display:

```text
+------------------------------------------------+
|          FRAUD ML MONITORING DASHBOARD         |
+------------------------------------------------+
| Total Predictions | High Risk Predictions      |
|      12,540       |          437               |
+------------------------------------------------+
| Average Latency   | Model Version              |
|       42 ms       |             v3             |
+------------------------------------------------+
| Anomaly Score     | Drift Score                |
|     Graph         |           0.17             |
+------------------------------------------------+
| Feature Quality   | API Error Rate             |
|     Graph         |           Graph            |
+------------------------------------------------+
```

---

# 33. Model Drift Detection

Model monitoring should compare the production data distribution with a reference distribution.

```text
Training Data
     |
     | Reference Distribution
     v
   Compare
     ^
     |
Production Data
```

Possible techniques:

- Population Stability Index (PSI)
- Kolmogorov-Smirnov test
- Wasserstein distance

---

# 34. Drift Monitoring Features

Monitor features such as:

- transaction amount
- transaction velocity
- payee trust score
- amount deviation
- hesitation score
- edit count
- anomaly score
- risk-level distribution

Example:

```text
Reference Data
      |
      v
Current Data
      |
      v
Drift Calculation
      |
 +----+----+
 |         |
Low      High
 |         |
 v         v
Normal   Warning
Monitoring  |
            v
       Evaluation Review
```

Drift indicates a distribution change; it does not automatically prove that the model has become inaccurate.

---

# 35. Explainable AI

The project should include SHAP and/or LIME.

## Example Explanation

```text
Prediction: HIGH RISK

Important Factors:

1. New Payee
2. Large Amount Deviation
3. High Transaction Velocity
4. Low Payee Trust Score
5. Late-Night Transaction
```

Explainability should be used to show feature contribution, not as proof of causation.

---

# 36. SHAP

SHAP can be used to:

- understand feature contributions
- visualize important features
- explain individual predictions
- analyze global feature importance

Example output:

```text
Feature                  Contribution
--------------------------------------
amount_deviation          High
is_new_payee              High
transaction_velocity      Medium
payee_trust_score         Medium
hour                      Low
```

---

# 37. LIME

LIME can be used for local explanations.

For a particular transaction:

```text
Transaction
     |
     v
LIME Explanation
     |
     +---- Feature 1
     +---- Feature 2
     +---- Feature 3
```

---

# 38. Responsible AI

The project should include a Responsible AI layer.

## Privacy

- Use anonymized datasets.
- Avoid storing unnecessary personal information.
- Never log PINs.
- Never log payment credentials.
- Protect API keys and database credentials.
- Use environment variables for secrets.

## Fairness

Evaluate whether model behavior differs across legitimate evaluation groups when appropriate and legally/ethically justified.

## Security

- API validation
- authentication
- rate limiting
- secure secrets
- access control
- audit logging

## Human Oversight

A high-risk prediction should be treated as a risk signal rather than an infallible statement.

---

# 39. Governance

The system should maintain:

- model version
- training date
- dataset version
- feature version
- evaluation results
- deployment history
- monitoring results
- drift history

This provides traceability.

---

# 40. Reproducibility

A model should be reproducible using:

```text
Code Version
+
Dataset Version
+
Feature Version
+
Configuration
+
Dependencies
+
Random Seed
+
Model Version
```

Example:

```text
Git Commit
    +
DVC Dataset
    +
params.yaml
    +
requirements.txt
    +
MLflow Run
```

---

# 41. Configuration Management

Avoid hardcoding environment-specific values.

Use environment variables or configuration files.

Examples:

```text
MODEL_NAME
MODEL_VERSION
MLFLOW_TRACKING_URI
MONGODB_URI
REDIS_URL
PROMETHEUS_PORT
ENVIRONMENT
```

Use:

```text
.env
```

for local secrets and:

```text
.env.example
```

for documentation.

Never commit actual credentials.

---

# 42. Recommended Repository Structure

```text
DeepBlue4/
│
├── frontend/
│
├── backend/
│
├── mlops/
│   ├── data/
│   │   ├── raw/
│   │   ├── processed/
│   │   └── features/
│   │
│   ├── ingestion/
│   │   └── ingest.py
│   │
│   ├── validation/
│   │   └── validate.py
│   │
│   ├── preprocessing/
│   │   └── preprocess.py
│   │
│   ├── features/
│   │   └── build_features.py
│   │
│   ├── training/
│   │   └── train.py
│   │
│   ├── evaluation/
│   │   └── evaluate.py
│   │
│   ├── explainability/
│   │   ├── shap_explainer.py
│   │   └── lime_explainer.py
│   │
│   ├── monitoring/
│   │   ├── drift.py
│   │   └── metrics.py
│   │
│   ├── dags/
│   │   └── fraud_ml_pipeline.py
│   │
│   ├── tests/
│   │
│   ├── dvc.yaml
│   └── params.yaml
│
├── ml-service/
│   ├── app/
│   │   ├── main.py
│   │   ├── predictor.py
│   │   └── schemas.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml
│   └── grafana/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── README.md
└── .env.example
```

---

# 43. AWS SageMaker

AWS SageMaker can provide a cloud-based MLOps deployment path.

## Workflow

```text
Versioned Dataset
       |
       v
AWS Storage
       |
       v
SageMaker Training Job
       |
       v
Model Artifact
       |
       v
Model Deployment
       |
       v
SageMaker Endpoint
       |
       v
Monitoring
```

Topics demonstrated:

- SageMaker Studio
- Training Jobs
- Model deployment
- Endpoint monitoring

If cloud credentials or budget are unavailable, the local implementation can be used for the academic demonstration and the AWS workflow can be documented separately.

---

# 44. Final End-to-End Architecture

```text
                         USER
                          |
                          v
                  React Frontend
                          |
                          v
                 Node.js Backend
                          |
                          v
                  FastAPI ML API
                          |
              +-----------+-----------+
              |                       |
              v                       v
      Feature Engineering       MLflow Registry
              |                       |
              +-----------+-----------+
                          |
                          v
                   ML Prediction
                          |
             +------------+-------------+
             |            |             |
             v            v             v
          MongoDB       Redis       Prometheus
                                       |
                                       v
                                    Grafana
                                       |
                                       v
                                Drift Detection
                                       |
                                       v
                              Evaluation Review
```

---

# 45. Complete Training Workflow

```text
                    DVC Dataset
                         |
                         v
                  Data Validation
                         |
                         v
                   Preprocessing
                         |
                         v
                Feature Engineering
                         |
                         v
                   Model Training
                         |
                         v
               MLflow Experiment
                    Tracking
                         |
                         v
                  Model Evaluation
                         |
                    +----+----+
                    |         |
                  FAIL       PASS
                    |         |
                    v         v
                   Stop   Model Registry
                               |
                               v
                           Deployment
```

---

# 46. Complete Production Workflow

```text
                 User Transaction
                        |
                        v
                 React Frontend
                        |
                        v
                Node.js Backend
                        |
                        v
                 FastAPI ML API
                        |
                        v
                Feature Pipeline
                        |
                        v
                MLflow Model
                        |
                        v
                  Prediction
                        |
             +----------+----------+
             |          |          |
             v          v          v
          MongoDB     Redis     Metrics
                                  |
                                  v
                              Prometheus
                                  |
                                  v
                               Grafana
                                  |
                                  v
                           Drift Detection
                                  |
                                  v
                         Evaluation / Review
```

---

# 47. Enhancement Priority

## Phase 1 — Core MLOps

Implement first:

1. DVC
2. Data validation
3. Feature engineering
4. MLflow
5. Model Registry

## Phase 2 — Automation

6. Airflow
7. Automated training pipeline
8. Automated evaluation
9. GitHub Actions
10. Testing

## Phase 3 — Deployment

11. FastAPI
12. Docker
13. Docker Compose
14. Node.js → FastAPI integration

## Phase 4 — Monitoring

15. Prometheus
16. Grafana
17. Logging
18. Drift detection
19. Alerts

## Phase 5 — Responsible AI

20. SHAP
21. LIME
22. Privacy checks
23. Fairness analysis
24. Governance documentation

## Phase 6 — Cloud

25. AWS SageMaker
26. Cloud model deployment
27. Cloud monitoring

---

# 48. Academic Demonstration Flow

The project demonstration can follow this sequence.

## Demo 1 — Dataset Versioning

Show:

```text
DVC
 ↓
Dataset Version
 ↓
Git Commit
```

## Demo 2 — Experiment Tracking

Run multiple configurations and show them in MLflow.

```text
MLflow
 ├── Run 1
 ├── Run 2
 └── Run 3
```

## Demo 3 — Model Registry

Show:

```text
FraudDetectionModel
       |
       +-- Version 1
       +-- Version 2
       +-- Version 3
```

## Demo 4 — Airflow

Run:

```text
Validation
   ↓
Preprocessing
   ↓
Feature Engineering
   ↓
Training
   ↓
Evaluation
   ↓
Registration
```

## Demo 5 — FastAPI

Send:

```text
POST /predict
```

and display the prediction.

## Demo 6 — Docker

Demonstrate:

```text
Docker Build
     ↓
Docker Run
     ↓
FastAPI Container
```

## Demo 7 — Monitoring

Show Grafana:

- prediction count
- latency
- high-risk predictions
- anomaly score
- model version
- drift score

## Demo 8 — Explainability

Show SHAP/LIME explanation for a prediction.

## Demo 9 — CI/CD

Push code and demonstrate:

```text
GitHub
   ↓
GitHub Actions
   ↓
Tests
   ↓
Build
```

---

# 49. Expected Benefits

The enhanced project provides:

### Technical Benefits

- Reproducible ML training
- Dataset versioning
- Experiment traceability
- Model version control
- Automated workflows
- Containerized deployment
- Continuous testing
- Real-time monitoring
- Drift detection
- Explainable predictions

### Academic Benefits

The project directly demonstrates concepts from all six MLOps units.

### Industry Benefits

The architecture resembles a real ML production workflow by connecting:

```text
Data
→ Model
→ Experiment
→ Registry
→ Deployment
→ Monitoring
→ Drift
→ Retraining
```

---

# 50. Final Project Outcome

The final DeepBlue4 / Saarthi AI system will evolve from a fraud-detection application into an **end-to-end MLOps-enabled fraud detection platform**.

The complete lifecycle will be:

```text
                DATA
                  |
                  v
                DVC
                  |
                  v
          DATA VALIDATION
                  |
                  v
        FEATURE ENGINEERING
                  |
                  v
           MODEL TRAINING
                  |
                  v
              MLFLOW
                  |
                  v
          MODEL EVALUATION
                  |
                  v
          MODEL REGISTRY
                  |
                  v
             FASTAPI
                  |
                  v
              DOCKER
                  |
                  v
          REAL-TIME SERVICE
                  |
                  v
         PROMETHEUS + GRAFANA
                  |
                  v
          DRIFT DETECTION
                  |
                  v
        EVALUATION / RETRAINING
```

This architecture covers the complete academic MLOps lifecycle while retaining the existing fraud-prevention application as the core business system.
