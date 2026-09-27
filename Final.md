# DeepBlue4 / Saarthi AI — 100% Free MLOps Project Documentation

## End-to-End MLOps Enhancement Using Only Free and Open-Source Tools

---

## 1. Project Title

### An End-to-End MLOps Framework for Real-Time UPI Fraud Detection and Risk Management

**Project Name:** DeepBlue4 / Saarthi AI  
**Domain:** MLOps, Machine Learning, FinTech, Fraud Detection  
**Implementation Model:** Local, Free and Open-Source

> **Important:** This version intentionally removes paid cloud platforms and paid managed ML services from the actual implementation. The complete MLOps workflow is designed to run locally using free/open-source software.

---

# 2. Project Overview

DeepBlue4 / Saarthi AI is a real-time UPI fraud prevention system that analyzes transaction context, user behavior, payee history and transaction patterns before allowing a payment to proceed.

The existing application contains:

- React + Vite frontend
- Node.js + Express backend
- MongoDB
- Redis
- Isolation Forest anomaly detection
- Hybrid rule-based + ML risk engine
- Behavioral profiling
- Payment integration
- Optional trusted-contact alerting

The project will be enhanced with a complete MLOps lifecycle using only free/local tools.

The enhanced system will cover:

- Data versioning
- Data validation
- Feature engineering
- Experiment tracking
- Model registry
- Automated ML pipelines
- REST API model serving
- Containerization
- CI/CD
- Monitoring
- Drift detection
- Explainable AI
- Responsible AI
- Reproducibility
- Testing
- Local cloud-MLOps simulation

---

# 3. Free-Only Tool Stack

| Requirement | Tool | Cost |
|---|---|---|
| Source-code versioning | Git | Free / Open Source |
| Remote code repository | GitHub Free | Free tier |
| Dataset versioning | DVC | Free / Open Source |
| Data processing | Pandas | Free / Open Source |
| Numerical processing | NumPy | Free / Open Source |
| ML | Scikit-learn | Free / Open Source |
| Data validation | Pandera | Free / Open Source |
| Experiment tracking | MLflow local | Free / Open Source |
| Model Registry | MLflow local | Free / Open Source |
| Workflow automation | Apache Airflow | Free / Open Source |
| API | FastAPI | Free / Open Source |
| API server | Uvicorn | Free / Open Source |
| Containerization | Docker | Free for the intended local/academic use |
| CI/CD | GitHub Actions | Free tier / public repository use |
| Monitoring | Prometheus | Free / Open Source |
| Dashboard | Grafana OSS | Free / Open Source |
| Explainability | SHAP | Free / Open Source |
| Explainability | LIME | Free / Open Source |
| Drift detection | Evidently OSS or custom PSI/KS implementation | Free / Open Source |
| Testing | Pytest | Free / Open Source |
| Database | MongoDB Community | Free / Open Source |
| Cache | Redis Community | Free / Open Source |
| Configuration | python-dotenv | Free / Open Source |
| Documentation | Markdown | Free |

### Tools deliberately NOT required

The following are not required for the actual implementation:

- AWS SageMaker
- AWS paid cloud resources
- Azure ML
- Google Vertex AI
- Databricks
- Weights & Biases
- Comet
- Neptune
- Grafana Cloud
- Managed MLflow services
- Paid databases
- Paid monitoring services
- Paid API services

---

# 4. Important Free-Only Principle

The project should run locally.

The preferred architecture is:

```text
Local Computer
     |
     +-- Git
     +-- DVC
     +-- MLflow
     +-- Airflow
     +-- FastAPI
     +-- Docker
     +-- Prometheus
     +-- Grafana
     +-- MongoDB Community
     +-- Redis Community
```

No paid cloud account is required.

No credit card is required for the ML workflow.

---

# 5. Existing System

## 5.1 Existing Technology

### Frontend

- React
- Vite
- Tailwind CSS
- Radix UI
- Framer Motion
- Zustand

### Backend

- Node.js
- Express.js
- MongoDB
- Redis

### Machine Learning

- Isolation Forest
- Hybrid rule-based + ML risk engine
- Behavioral profiling

### Existing External Integrations

The current application may contain payment and messaging integrations. These are treated as existing application functionality and are **not required for the MLOps implementation**.

The MLOps layer itself will use only free/local tools.

---

# 6. Problem Statement

A conventional ML project generally stops after:

```text
Dataset
   ↓
Training
   ↓
Model
   ↓
Prediction
```

A real MLOps workflow requires:

```text
Data
 ↓
Versioning
 ↓
Validation
 ↓
Features
 ↓
Training
 ↓
Experiment Tracking
 ↓
Evaluation
 ↓
Model Registry
 ↓
Deployment
 ↓
Monitoring
 ↓
Drift Detection
 ↓
Retraining
```

The goal is therefore to transform the existing UPI fraud detection system into a reproducible, automated and monitored MLOps project without depending on paid cloud services.

---

# 7. Objectives

1. Implement a complete ML lifecycle.
2. Version datasets using DVC.
3. Track experiments using MLflow.
4. Implement MLflow Model Registry locally.
5. Create a reusable feature engineering pipeline.
6. Implement data validation.
7. Automate ML workflows using Apache Airflow.
8. Serve the ML model using FastAPI.
9. Containerize the ML service using Docker.
10. Implement CI/CD using GitHub Actions.
11. Monitor predictions using Prometheus.
12. Visualize metrics using Grafana OSS.
13. Implement model/data drift detection.
14. Add SHAP/LIME explanations.
15. Apply Responsible AI principles.
16. Implement automated testing.
17. Make training reproducible.
18. Keep the complete implementation free and locally executable.

---

# 8. MLOps Lifecycle

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
Deployment
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

# 9. Syllabus Mapping

| Unit | Syllabus Concept | Free Project Implementation |
|---|---|---|
| Unit I | ML Lifecycle | Complete fraud ML lifecycle |
| Unit I | MLOps | Local MLOps architecture |
| Unit I | Versioning | Git + DVC |
| Unit I | Reproducibility | DVC + MLflow + configuration |
| Unit I | Monitoring | Prometheus + Grafana OSS |
| Unit II | Data Versioning | DVC |
| Unit II | Dataset Management | DVC-managed datasets |
| Unit II | Experiment Tracking | MLflow local |
| Unit II | Feature Engineering | Scikit-learn + Pandas pipeline |
| Unit II | Model Registry | MLflow local |
| Unit II | Data Validation | Pandera |
| Unit III | ML Pipelines | Python pipeline |
| Unit III | DAGs | Apache Airflow |
| Unit III | Workflow Automation | Airflow |
| Unit III | CI/CD | GitHub Actions |
| Unit III | Testing | Pytest |
| Unit IV | Model Deployment | FastAPI |
| Unit IV | REST API | FastAPI + Uvicorn |
| Unit IV | Docker | Docker |
| Unit IV | Real-Time Inference | FastAPI |
| Unit IV | Batch Inference | Airflow |
| Unit IV | Logging | Python logging |
| Unit IV | Monitoring | Prometheus + Grafana |
| Unit IV | Drift Detection | Evidently OSS / PSI / KS |
| Unit V | Responsible AI | Privacy, fairness, governance |
| Unit V | Explainability | SHAP + LIME |
| Unit V | Model Drift | Drift monitoring |
| Unit VI | Cloud MLOps Concepts | Local equivalent architecture |
| Unit VI | SageMaker Concepts | Documented theoretical mapping only |
| Unit VI | Finance Application | UPI fraud detection |
| Unit VI | Industrial Best Practices | Reproducibility, monitoring, CI/CD |

---

# 10. Enhanced Architecture

```text
                         React Frontend
                               |
                               v
                       Node.js Backend
                               |
                               v
                        FastAPI ML API
                               |
                    +----------+----------+
                    |                     |
                    v                     v
             Feature Pipeline       MLflow Model
                    |                 Registry
                    +---------+-----------+
                              |
                              v
                       Fraud Prediction
                              |
                  +-----------+-----------+
                  |           |           |
                  v           v           v
               MongoDB      Redis     Prometheus
                                         |
                                         v
                                      Grafana
                                         |
                                         v
                                  Drift Detection
```

---

# 11. Training Architecture

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
                 MLflow Tracking
                         |
                         v
                  Model Evaluation
                         |
                    +----+----+
                    |         |
                  FAIL       PASS
                    |         |
                    v         v
                  STOP    MLflow Registry
                              |
                              v
                         FastAPI Model
                              |
                              v
                            Docker
```

---

# 12. Data Management

The project should use a synthetic or anonymized dataset for academic development.

Possible features:

| Feature | Description |
|---|---|
| transaction_id | Transaction identifier |
| user_id_hash | Anonymized user identifier |
| amount | Transaction amount |
| hour | Transaction hour |
| day_of_week | Day of transaction |
| is_new_payee | New payee indicator |
| payee_trust_score | Historical payee trust |
| transaction_velocity | Recent transaction frequency |
| user_avg_amount | Historical average |
| amount_deviation | Difference from normal amount |
| hesitation_score | Behavioral signal |
| edit_count | Number of edits |
| intent_mismatch_score | Intent mismatch |
| vulnerability_score | Risk-related score |

Real payment credentials and unnecessary personal information must not be used.

---

# 13. DVC Dataset Versioning

DVC will version the datasets.

## Directory

```text
mlops/
├── data/
│   ├── raw/
│   ├── processed/
│   └── features/
├── dvc.yaml
└── dvc.lock
```

## Workflow

```text
Dataset
   ↓
DVC
   ↓
Version 1
   ↓
Version 2
   ↓
Version 3
```

DVC allows the ML experiment to identify exactly which dataset version was used.

---

# 14. Data Validation

Pandera will be used for data validation.

## Checks

### Schema

- Required columns
- Data types
- Expected fields

### Missing Values

- Amount
- Payee information
- Behavioral features

### Duplicate Records

- Duplicate transaction IDs
- Duplicate rows

### Range Checks

- Amount
- Scores
- Hour
- Velocity

### Consistency

- Timestamp
- Categorical values
- Feature relationships

If validation fails, model training must stop.

---

# 15. Feature Engineering

Create a dedicated feature pipeline.

## Features

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

### New Payee

```text
is_new_payee = 1
```

when the payee has not previously been observed.

### Transaction Velocity

Number of recent transactions within a defined time period.

### Late-Night Indicator

Indicates transactions during configured unusual hours.

### Behavioral Features

- hesitation score
- edit count
- confirmation timing
- interaction signals

---

# 16. Training-Serving Consistency

The same feature transformations should be used during:

```text
Training
   |
Validation
   |
Batch Inference
   |
Real-Time Inference
```

This reduces training-serving skew.

---

# 17. MLflow Local Experiment Tracking

MLflow will run locally.

It will track:

## Parameters

- model configuration
- contamination
- feature version
- preprocessing version
- random seed

## Metrics

- precision
- recall
- F1 where applicable
- false-positive rate
- false-negative rate
- inference latency
- anomaly evaluation metrics

## Artifacts

- model
- evaluation report
- plots
- feature configuration
- SHAP/LIME output
- drift reports

---

# 18. Local MLflow Architecture

```text
                 ML Training
                      |
                      v
                  MLflow
                Local Server
                      |
           +----------+----------+
           |                     |
           v                     v
        SQLite              Local Files
      Metadata DB          Model Artifacts
           |
           v
       MLflow UI
```

No paid MLflow hosting is required.

---

# 19. MLflow Model Registry

Maintain model versions locally.

```text
FraudDetectionModel
       |
       +-- Version 1
       +-- Version 2
       +-- Version 3
```

Lifecycle:

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

---

# 20. Existing Isolation Forest Model

The current project uses Isolation Forest for anomaly detection.

The MLOps enhancement should preserve the model where appropriate.

The added MLOps components are:

- reproducible training
- experiment tracking
- model registry
- evaluation
- deployment
- monitoring
- drift detection
- explainability

If ground-truth fraud labels are not available, the project should clearly distinguish anomaly detection from supervised classification.

---

# 21. Apache Airflow

Airflow will automate the ML pipeline locally.

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
MLflow Logging
  |
  v
Model Registration
  |
  v
Report Generation
```

Airflow is used locally and does not require a paid cloud workflow service.

---

# 22. Airflow Tasks

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

---

# 23. FastAPI Model Serving

Create a separate Python ML service.

```text
Node.js Backend
       |
       | HTTP
       v
FastAPI ML Service
       |
       v
Feature Pipeline
       |
       v
MLflow Model
       |
       v
Prediction
```

---

# 24. API Endpoints

```text
GET  /health
GET  /model-info
POST /predict
POST /explain
GET  /metrics
```

Example:

```json
{
  "risk_level": "HIGH",
  "anomaly_score": 0.82,
  "recommended_action": "DELAY",
  "model_version": "3"
}
```

---

# 25. Real-Time Inference

```text
User
 |
 v
React
 |
 v
Node.js
 |
 v
FastAPI
 |
 v
Feature Engineering
 |
 v
Isolation Forest
 |
 v
Risk Prediction
```

---

# 26. Batch Inference

Batch processing will be performed locally through Airflow.

Uses:

- historical transaction analysis
- model evaluation
- drift monitoring
- periodic inference
- reporting

```text
Airflow
   |
   v
Transaction Batch
   |
   v
Feature Pipeline
   |
   v
Model
   |
   v
Report
```

---

# 27. Docker

Docker will containerize the FastAPI ML service.

## Structure

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

- dependency isolation
- reproducible environment
- portable deployment
- easier local testing

---

# 28. Local Docker Architecture

```text
Docker Environment
|
+-- Node.js Backend
|
+-- FastAPI ML Service
|
+-- MongoDB Community
|
+-- Redis Community
|
+-- MLflow
|
+-- Prometheus
|
+-- Grafana
|
+-- Airflow
```

All services can be run locally.

---

# 29. CI/CD

GitHub Actions can be used for automated testing and build verification.

Recommended workflow:

```text
Git Push
   |
   v
Install Dependencies
   |
   v
Lint
   |
   v
Unit Tests
   |
   v
API Tests
   |
   v
Data Validation
   |
   v
Model Validation
   |
   v
Docker Build
```

No paid CI/CD platform is required.

---

# 30. Testing

## Unit Tests

Test:

- preprocessing
- feature generation
- model loading
- predictions
- drift calculation

## API Tests

Test:

- `/health`
- `/predict`
- `/explain`
- invalid requests
- missing features

## Pipeline Tests

Test:

- validation failure
- evaluation failure
- model registration gate

## Integration Tests

```text
Node.js → FastAPI
FastAPI → ML Model
FastAPI → Prometheus
```

---

# 31. Monitoring

Monitoring will use:

- Prometheus
- Grafana OSS
- Python logging

## Application Metrics

- request count
- response latency
- error count
- service availability

## ML Metrics

- prediction count
- high-risk prediction count
- anomaly score
- model version
- inference latency
- missing-feature count
- drift score

---

# 32. Prometheus

Recommended metrics:

```text
ml_prediction_total
ml_prediction_latency_seconds
ml_high_risk_prediction_total
ml_model_prediction_score
ml_feature_missing_total
ml_model_drift_score
```

Avoid using high-cardinality labels such as:

- user ID
- transaction ID
- email
- phone number

---

# 33. Grafana OSS Dashboard

Create a local Grafana dashboard.

```text
+------------------------------------------------+
|          FRAUD ML MONITORING                   |
+------------------------------------------------+
| Total Predictions | High Risk Predictions      |
|                   |                            |
+------------------------------------------------+
| Avg Latency       | Model Version              |
|                   |                            |
+------------------------------------------------+
| Anomaly Scores    | Drift Score                |
|                   |                            |
+------------------------------------------------+
| Missing Features  | API Errors                 |
|                   |                            |
+------------------------------------------------+
```

Dashboard panels:

1. Total predictions
2. High-risk predictions
3. Average inference latency
4. Anomaly score distribution
5. Current model version
6. Missing feature count
7. Drift score
8. API error rate

---

# 34. Drift Detection

Drift detection will be implemented locally.

Possible free approaches:

- Evidently OSS
- Population Stability Index
- Kolmogorov-Smirnov test
- Wasserstein distance

Compare:

```text
Reference Training Data
          VS
Current Production/Batch Data
```

---

# 35. Drift Features

Monitor:

- transaction amount
- transaction velocity
- payee trust score
- amount deviation
- hesitation score
- edit count
- anomaly score
- risk-level distribution

Workflow:

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
Low       High
 |         |
 v         v
Continue  Warning
           |
           v
      Evaluation Review
```

Drift does not automatically mean that the model is inaccurate.

---

# 36. Explainable AI

Use:

- SHAP
- LIME

Both are free/open-source libraries.

Example:

```text
Prediction: HIGH RISK

Important Factors:

1. New Payee
2. Large Amount Deviation
3. High Transaction Velocity
4. Low Payee Trust Score
5. Unusual Transaction Time
```

---

# 37. SHAP

SHAP can be used for:

- feature contribution
- individual prediction explanations
- global feature importance
- visualization

Example:

```text
Feature                  Contribution
--------------------------------------
amount_deviation          High
is_new_payee              High
transaction_velocity      Medium
payee_trust_score         Medium
hour                      Low
```

For anomaly detection, the interpretation must be documented carefully and should not be treated as causal proof.

---

# 38. LIME

LIME provides local explanations.

```text
Transaction
     |
     v
LIME
     |
     +---- Feature 1
     +---- Feature 2
     +---- Feature 3
```

---

# 39. Responsible AI

## Privacy

- Use anonymized datasets.
- Avoid unnecessary personal information.
- Never log PINs.
- Never log payment credentials.
- Protect secrets.
- Use `.env` locally.

## Fairness

Where appropriate, evaluate whether model behavior differs across legitimate evaluation groups.

## Security

- API validation
- access control
- rate limiting
- secure configuration
- audit logging

## Human Oversight

A high-risk prediction is a risk signal and should not be treated as an unquestionable decision.

---

# 40. Governance

Track:

```text
Dataset Version
       +
Code Version
       +
Feature Version
       +
Model Version
       +
Training Date
       +
Evaluation Metrics
       +
Deployment Version
       +
Monitoring Results
```

This creates traceability throughout the ML lifecycle.

---

# 41. Reproducibility

A model should be reproducible from:

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

Recommended tools:

- Git
- DVC
- MLflow
- requirements.txt
- params.yaml

---

# 42. Configuration

Use:

```text
.env
.env.example
params.yaml
```

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

Actual secrets must never be committed.

---

# 43. Recommended Repository Structure

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
│       ├── test.yml
│       ├── ml-pipeline.yml
│       └── docker.yml
│
├── docker-compose.yml
├── requirements.txt
├── README.md
└── .env.example
```

---

# 44. Local MLOps Architecture

```text
                         LOCAL COMPUTER
                              |
        +---------------------+----------------------+
        |                     |                      |
        v                     v                      v
       Git                   DVC                  Dataset
        |                     |                      |
        +---------------------+----------------------+
                              |
                              v
                       MLflow Local
                              |
                              v
                      Model Registry
                              |
                              v
                         Airflow
                              |
                              v
                          FastAPI
                              |
                              v
                           Docker
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
          MongoDB           Redis          ML Service
                                              |
                                              v
                                          Prometheus
                                              |
                                              v
                                           Grafana
```

---

# 45. Free-Only Replacement for Cloud MLOps

The syllabus includes AWS SageMaker.

For the actual project implementation, no paid cloud service is required.

## Syllabus Concept

```text
AWS SageMaker
```

## Free Local Equivalent

```text
DVC
  +
MLflow
  +
Airflow
  +
FastAPI
  +
Docker
  +
Prometheus
  +
Grafana
```

### Concept Mapping

| Cloud MLOps Concept | Free Local Implementation |
|---|---|
| Cloud dataset management | DVC |
| Training jobs | Airflow + Python |
| Experiment tracking | MLflow |
| Model registry | MLflow |
| Model endpoint | FastAPI |
| Container deployment | Docker |
| Monitoring | Prometheus |
| Dashboard | Grafana |
| Drift monitoring | Evidently OSS / PSI / KS |
| Explainability | SHAP/LIME |
| CI/CD | GitHub Actions |

AWS SageMaker can remain in the **theory/literature section** because it is part of the university syllabus, but it is not required for the actual implementation.

---

# 46. Academic Demonstration

## Demo 1 — DVC

```text
Dataset
   ↓
DVC
   ↓
Dataset Version
```

## Demo 2 — MLflow

```text
Run 1
Run 2
Run 3
```

Compare:

- parameters
- metrics
- artifacts

## Demo 3 — Model Registry

```text
FraudDetectionModel
       |
       +-- v1
       +-- v2
       +-- v3
```

## Demo 4 — Airflow

```text
Validation
   ↓
Features
   ↓
Training
   ↓
Evaluation
   ↓
Registration
```

## Demo 5 — FastAPI

Call:

```text
POST /predict
```

## Demo 6 — Docker

```text
Docker Build
     ↓
Docker Run
     ↓
FastAPI Container
```

## Demo 7 — Monitoring

Show Grafana:

- predictions
- latency
- high-risk count
- anomaly score
- drift score

## Demo 8 — Explainability

Show SHAP/LIME explanation.

## Demo 9 — CI/CD

```text
Git Push
   ↓
GitHub Actions
   ↓
Tests
   ↓
Build
```

---

# 47. Implementation Phases

## Phase 1 — Data and Model

1. Dataset
2. DVC
3. Data validation
4. Preprocessing
5. Feature engineering
6. Model training

## Phase 2 — Experiment Management

7. MLflow
8. Experiment tracking
9. Model evaluation
10. Model Registry

## Phase 3 — Automation

11. Airflow
12. Automated ML pipeline
13. Testing

## Phase 4 — Deployment

14. FastAPI
15. Docker
16. Node.js → FastAPI integration

## Phase 5 — Monitoring

17. Prometheus
18. Grafana
19. Logging
20. Drift detection

## Phase 6 — Explainability

21. SHAP
22. LIME
23. Responsible AI documentation

## Phase 7 — CI/CD

24. GitHub Actions
25. Automated tests
26. Docker build verification

---

# 48. Final Free Tool Stack

The final project should use:

```text
Git
GitHub Free
DVC
Python
Pandas
NumPy
Scikit-learn
Pandera
MLflow
Apache Airflow
FastAPI
Uvicorn
Docker
GitHub Actions
Prometheus
Grafana OSS
SHAP
LIME
Evidently OSS
Pytest
MongoDB Community
Redis Community
python-dotenv
Markdown
```

No paid MLOps platform is required.

---

# 49. Final End-to-End Workflow

```text
                    DATA
                      |
                      v
                     DVC
                      |
                      v
              DATA VALIDATION
                 Pandera
                      |
                      v
            FEATURE ENGINEERING
             Pandas + sklearn
                      |
                      v
               MODEL TRAINING
               Isolation Forest
                      |
                      v
                  MLFLOW
                      |
                      v
              MODEL EVALUATION
                      |
                      v
              MODEL REGISTRY
                 MLflow
                      |
                      v
                   AIRFLOW
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
                PROMETHEUS
                      |
                      v
              GRAFANA OSS
                      |
                      v
             DRIFT DETECTION
                      |
                      v
              SHAP / LIME
                      |
                      v
           EVALUATION / RETRAINING
```

---

# 50. Final Project Outcome

The final DeepBlue4 / Saarthi AI project will be a complete local MLOps implementation.

It will demonstrate:

```text
DATA VERSIONING
      ↓
DATA VALIDATION
      ↓
FEATURE ENGINEERING
      ↓
MODEL TRAINING
      ↓
EXPERIMENT TRACKING
      ↓
MODEL REGISTRY
      ↓
PIPELINE AUTOMATION
      ↓
MODEL SERVING
      ↓
CONTAINERIZATION
      ↓
CI/CD
      ↓
MONITORING
      ↓
DRIFT DETECTION
      ↓
EXPLAINABILITY
      ↓
RESPONSIBLE AI
      ↓
RETRAINING
```

The implementation is designed to satisfy the MLOps syllabus while keeping the actual project **free, local, reproducible and independent of paid cloud services**.

---

# 51. Final Checklist

## Unit I

- [ ] ML lifecycle documented
- [ ] MLOps architecture created
- [ ] Versioning implemented
- [ ] Reproducibility implemented
- [ ] Monitoring planned

## Unit II

- [ ] DVC implemented
- [ ] Dataset versioned
- [ ] Data validation implemented
- [ ] Feature engineering implemented
- [ ] MLflow implemented
- [ ] Model Registry implemented

## Unit III

- [ ] ML pipeline created
- [ ] Airflow DAG created
- [ ] Automated training implemented
- [ ] Automated evaluation implemented
- [ ] GitHub Actions implemented
- [ ] Tests implemented

## Unit IV

- [ ] FastAPI created
- [ ] Real-time inference implemented
- [ ] Batch inference implemented
- [ ] Docker implemented
- [ ] Prometheus implemented
- [ ] Grafana dashboard implemented
- [ ] Logging implemented
- [ ] Drift detection implemented

## Unit V

- [ ] SHAP implemented
- [ ] LIME implemented
- [ ] Privacy controls documented
- [ ] Fairness considerations documented
- [ ] Responsible AI documented
- [ ] Governance documented

## Unit VI

- [ ] Cloud MLOps concepts documented
- [ ] SageMaker concepts studied theoretically
- [ ] Local free equivalent implemented
- [ ] Finance fraud-detection use case demonstrated
- [ ] Industrial MLOps best practices documented

---

# 52. Conclusion

DeepBlue4 / Saarthi AI can be transformed into a complete MLOps project without requiring paid cloud services.

The core implementation uses free and open-source technologies:

**DVC → Pandera → Scikit-learn → MLflow → Airflow → FastAPI → Docker → GitHub Actions → Prometheus → Grafana → SHAP/LIME → Drift Detection**

This provides complete coverage of the university MLOps syllabus while keeping the implementation suitable for local development, academic demonstration, testing and project evaluation.
