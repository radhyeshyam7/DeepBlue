# DeepBlue4 / Saarthi AI — 100% Free & Open-Source MLOps Platform

## An End-to-End MLOps Framework for Real-Time UPI Fraud Detection & Risk Management
### Compliant with University MLOps Syllabus (Units I – VI)

---

## 1. Executive Summary

**DeepBlue4 / Saarthi AI** is an intelligent, real-time UPI fraud prevention and risk management platform engineered with an enterprise-grade Machine Learning Operations (MLOps) lifecycle. 

This platform is **100% free and open-source**, intentionally designed to replace costly cloud proprietary services (such as AWS SageMaker, Databricks, Vertex AI, or managed SaaS) with local, robust, battle-tested open-source components: **DVC, Pandera, Scikit-learn, MLflow, Apache Airflow, FastAPI, Prometheus, Grafana OSS, SHAP, and LIME**.

```text
Local Computer (100% Free & Locally Reproducible Stack)
     |
     +-- Git (Source Code Versioning)
     +-- DVC (Data Version Control & Pipeline Execution via dvc repro)
     +-- Pandera (Data Contract & Statistical Range Validation)
     +-- Scikit-learn (Unsupervised Isolation Forest Anomaly Detection)
     +-- MLflow + SQLite (Experiment Tracking & Model Registry)
     +-- Apache Airflow (Automated DAG Batch Retraining & Quality Gates)
     +-- Standalone Runner (One-Click Windows CLI Master Pipeline)
     +-- FastAPI + Uvicorn (Sub-10ms High-Throughput Real-Time Model Serving)
     +-- Prometheus (Operational & ML Telemetry Scraping)
     +-- Grafana OSS (Pre-Provisioned 6-Panel Real-Time Visual Dashboard)
     +-- Statistical Drift (PSI + Kolmogorov-Smirnov Test + Wasserstein Distance)
     +-- Explainable AI (SHAP TreeExplainer + LIME Local Surrogate Rules)
     +-- Dynamic Behavioral Profiling (User-Specific Baselines vs Incoming Velocity)
     +-- Fraud Reason Engine (Actionable Natural-Language Decision Explanations)
     +-- MongoDB Community (Core Application & Transaction Database)
     +-- Redis Community (Cache, 60-Minute Velocity Windows & Delays)
```

---

## 2. Live Services & Quick-Access Directory

When running locally, all core services are available at the following standardized local endpoints:

| Service / Interface | Local URL | Default Credentials | Purpose |
| :--- | :--- | :--- | :--- |
| **Saarthi AI UPI App (Client)** | [http://localhost:5173](http://localhost:5173) | Normal User Access | Clean UPI customer payment simulator & passbook |
| **Saarthi Fraud Admin Center** | [http://localhost:5173/admin](http://localhost:5173/admin) | Fraud Officer Role | Real-time operations, flagged transactions & behavioral profiles |
| **Apache Airflow Webserver** | [http://localhost:8080](http://localhost:8080) | `admin` / `admin` | Visual DAG orchestration, graph views & task execution logs |
| **Grafana Visual Dashboards** | [http://localhost:3001](http://localhost:3001) | Anonymous Admin (No login needed) | Production metrics, anomaly score gauges & latency histograms |
| **Prometheus Server** | [http://localhost:9090](http://localhost:9090) | Open Access | Time-series scraper, raw metrics & target health checks |
| **MLflow Tracking & Registry**| [http://localhost:5000](http://localhost:5000) | Open Access | SQLite-backed experiment tracking & Model Registry |
| **FastAPI Interactive Docs** | [http://localhost:8001/docs](http://localhost:8001/docs) | Open Swagger UI | Real-time inference (`/predict`), drift (`/drift/check`) & metrics |
| **Node.js Express Backend** | [http://localhost:3000](http://localhost:3000) | JWT Auth | Core payment orchestrator & 2-second FastAPI proxy fallback |

> [!WARNING]
> **Windows Address Resolution Notice**: On Windows operating systems, `0.0.0.0` is a network socket binding address, **not a valid browser URL**. Navigating to `http://0.0.0.0` in Google Chrome or Microsoft Edge causes `ERR_ADDRESS_INVALID`. Always use **`http://localhost:<port>`** or **`http://127.0.0.1:<port>`**.

---

## 3. University Syllabus Mapping (Units I – VI)

This repository is strictly structured around the standard university curriculum for **Machine Learning Operations (MLOps)**:

| Unit | Syllabus Topic | DeepBlue4 / Saarthi AI Implementation |
| :--- | :--- | :--- |
| **Unit I** | **ML Lifecycle & MLOps Foundations** | Full lifecycle from data generation to deployment, observability, and automated retraining. Code versioning via Git, data versioning via DVC, and automated environment reproducibility. |
| **Unit II** | **Data Management & Experiment Tracking** | Dataset lineage and pipeline stages via **DVC** (`dvc.yaml`). Data schema contracts and statistical checks with **Pandera**. SQLite-backed experiment tracking and model versioning via **MLflow**. Reusable feature engineering pipeline with Scikit-learn transformers. |
| **Unit III** | **ML Pipelines & Automation** | Automated multi-stage orchestration via **Apache Airflow DAG** (`fraud_ml_pipeline.py`) featuring conditional quality gate branching. Standalone one-click master pipeline (`run_mlops_pipeline.py`). Automated unit testing via **Pytest**. Continuous Integration via **GitHub Actions**. |
| **Unit IV** | **Deployment & Monitoring** | Microservice model serving with **FastAPI** on Uvicorn. Containerization via **Docker** and multi-container coordination with **Docker Compose**. Low-latency JSON inference. Operational and ML observability via **Prometheus** and **Grafana OSS**. Statistical drift monitoring using **PSI**, **Kolmogorov-Smirnov (KS) test**, and **Wasserstein distance**. |
| **Unit V** | **Explainability & Responsible AI** | Transparent feature attributions with **SHAP (TreeExplainer)** and decision boundary rules via **LIME**. Privacy-first design with user ID hashing (SHA-256) and zero PII/PIN logging. Human-in-the-loop oversight and temporary advisory delays instead of arbitrary account blocking. |
| **Unit VI** | **Cloud MLOps & Finance Applications** | Real-world UPI payment fraud prevention with personalized behavioral profiles. Comprehensive theoretical mapping of AWS SageMaker architecture to 100% free local equivalents. Industrial best practices to eliminate training-serving skew. |

---

## 4. Cloud MLOps Theoretical Mapping (Unit VI: AWS SageMaker)

While this project runs 100% locally without incurring paid cloud costs, its design is architecturally identical to enterprise **AWS SageMaker** cloud deployments:

| AWS SageMaker Cloud Component | Free Open-Source Local Equivalent | Technical Role in DeepBlue4 |
| :--- | :--- | :--- |
| **Amazon S3** | **Git + DVC (`dvc.yaml`, `dvc.lock`)** | Versioned data lake, feature store, and model artifact storage |
| **SageMaker Processing Jobs** | **Pandera + Preprocessing Module** | Data contract validation, schema checks, and baseline splitting |
| **SageMaker Feature Store** | **`build_features.py` + Joblib Scaler** | Feature extraction, derived ratios, and training-serving consistency |
| **SageMaker Training Jobs** | **`train.py` (Isolation Forest)** | Unsupervised model fitting with automated hyperparameter tracking |
| **SageMaker Experiments** | **MLflow Local (`mlops/mlflow.db`)** | Metric logging, parameter tracking, and artifact persistence |
| **SageMaker Model Registry** | **MLflow Model Registry** | Model versioning, stage transitions (`Candidate` ➔ `Production`) |
| **SageMaker Pipelines** | **Apache Airflow DAG (`fraud_ml_pipeline.py`)** | Directed acyclic graph scheduling, quality gate branching, retraining |
| **SageMaker Real-Time Endpoint** | **FastAPI + Uvicorn Microservice** | High-performance REST API with sub-10ms latency |
| **Amazon CloudWatch** | **Prometheus + Grafana OSS** | Metric scraping, anomaly score gauges, latency histograms, alerting |
| **SageMaker Model Monitor** | **`drift.py` (PSI + KS + Wasserstein)** | Continuous data and concept drift detection |
| **SageMaker Clarify** | **SHAP TreeExplainer + LIME Tabular** | Feature attributions, local surrogate decision rules, bias audits |

---

## 5. End-to-End System Architecture

```text
                                  DEEPBLUE4 / SAARTHI AI
                                             |
                         +-------------------+-------------------+
                         |                                       |
                         v                                       v
               UPI Customer Interface                   Saarthi Fraud Center
              (Normal User: Port 5173)                (Fraud Officer: /admin)
                         |                                       |
                         +-------------------+-------------------+
                                             |
                                             v
                                  Node.js Express Backend
                                        (Port 3000)
                                             |
                          HTTP POST /predict | (2-Second Timeout with
                                             |  Local Rule Engine Fallback)
                                             v
                                  FastAPI ML Microservice
                                        (Port 8001)
                                             |
                       +---------------------+---------------------+
                       |                                           |
                       v                                           v
             Dynamic Behavioral Profile                   MLflow Model Registry
             (User Historical Baseline)                  (Promoted Candidate v9)
                       |                                           |
                       +---------------------+---------------------+
                                             |
                                             v
                                   Isolation Forest Model
                                (Unsupervised Anomaly Score)
                                             |
                       +---------------------+---------------------+
                       |                     |                     |
                       v                     v                     v
              Fraud Reason Engine       SHAP & LIME           Prometheus Telemetry
             (Actionable Explanations) (Explainability)       (Metrics Scrape /metrics)
                       |                     |                     |
                       v                     v                     v
              Risk Response Payload       Admin Audit         Grafana Dashboards
            (LOW / MEDIUM / HIGH Risk)   Visualization           (Port 3001)
```

---

## 6. Core Technical Innovations

### 1. Dynamic User-Specific Behavioral Profiling
Instead of relying on rigid, universal thresholds that trigger false positives for high-net-worth users or miss fraud on low-activity accounts, Saarthi AI constructs a **dynamic behavioral profile** for each user:
* **Normal Amount Range**: E.g., ₹200 – ₹3,000 based on moving percentiles.
* **Typical Transaction Hours**: E.g., 9:00 AM – 10:00 PM.
* **Frequent Payee Circle**: Whitelist of verified, recurring VPA contacts.
* **Baseline Velocity**: Typical interval between transactions (e.g., 1 txn / 15 minutes).

When an incoming transaction arrives:
$$\text{New Transaction (₹38,000 at 02:45 AM, Unseen Payee, 4 txns in 3 min)} \quad \Longrightarrow \quad \text{Deviation vs Profile} \quad \Longrightarrow \quad \text{HIGH BEHAVIORAL DEVIATION}$$

### 2. The "Fraud Reason Engine"
Standard anomaly detectors return opaque scores ($0.87$). Saarthi AI's Fraud Reason Engine evaluates the decision tree paths and SHAP attributions to generate human-readable explanations directly in the API response:
```json
{
  "risk_level": "HIGH",
  "anomaly_score": 0.88,
  "behavioral_deviation_score": 0.92,
  "reasons": [
    "Amount ₹38,000 is 19.0x higher than user's normal average (₹2,000)",
    "Unusual transaction hour: 02:45 AM (normal range: 09:00 AM - 10:00 PM)",
    "High transaction velocity (4 transactions within 3 minutes)",
    "First-time transfer to unverified beneficiary with low trust score"
  ],
  "recommended_action": "DELAY_AND_VERIFY"
}
```

### 3. Strict Automated Quality Gate
Models are never blindly deployed to production. Every training run must pass automated benchmarking against strict criteria before promotion:
* **Minimum F1-Score**: $\ge 0.70$ (Current production version achieves **$0.9937$**)
* **Maximum False Positive Rate (FPR)**: $\le 0.15$ (Current production version achieves **$0.0000$**)
* If the Quality Gate fails, Airflow branches to `stop_pipeline`, logs an alert, and halts promotion.

### 4. Unsupervised Training with Supervised Evaluation
Isolation Forest training is **strictly unsupervised** on the continuous feature matrix $X$ (excluding any labels). A synthetic binary `fraud_flag` is utilized **solely during evaluation** to benchmark Precision, Recall, ROC-AUC, and FPR, ensuring true operational integrity.

---

## 7. Complete Project Directory Structure

```text
DeepBlue4/
├── .github/
│   └── workflows/
│       ├── test.yml                 # Pytest automated testing on push/PR
│       ├── ml-pipeline.yml          # End-to-end pipeline verification CI
│       └── docker.yml               # Multi-container Docker build test
│
├── backend/                         # Node.js + Express API Gateway
│   ├── src/
│   │   ├── ml/
│   │   │   └── inferenceService.js  # FastAPI client with 2s timeout & fallback
│   │   ├── services/
│   │   │   ├── riskEngine.js        # Hybrid rule + ML risk scoring engine
│   │   │   └── behavioralProfile.js # Dynamic user profiling service
│   │   └── server.js                # Express REST API routes
│   └── package.json
│
├── frontend/                        # React 18 + TypeScript + Vite Client
│   ├── src/
│   │   ├── components/
│   │   │   ├── PaymentModal.tsx     # Payment simulator with advisory delay
│   │   │   ├── RiskBadge.tsx        # High/Medium/Low visual indicators
│   │   │   └── Navbar.tsx           # Role-aware navigation
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # Normal user UPI customer home
│   │   │   └── AdminDashboard.tsx   # Saarthi Fraud Operations Center
│   │   └── services/
│   └── vite.config.ts
│
├── mlops/                           # Core MLOps Python Architecture
│   ├── data/
│   │   ├── raw/                     # Versioned raw transactions (DVC tracked)
│   │   │   └── transactions_raw.csv
│   │   ├── processed/               # Cleaned data & drift reference datasets
│   │   │   ├── transactions_processed.csv
│   │   │   ├── reference_data.csv   # Baseline for drift monitoring
│   │   │   └── current_batch.csv    # Current inference sample for drift
│   │   └── features/                # Scaled feature matrices & joblib scalers
│   │       ├── features_train.csv
│   │       ├── features_test.csv
│   │       └── scaler.joblib
│   │
│   ├── ingestion/
│   │   └── ingest.py                # Synthetic UPI transaction generator (5,000 rows)
│   ├── validation/
│   │   └── validate.py              # Pandera data contract & statistical checks
│   ├── preprocessing/
│   │   └── preprocess.py            # Deduplication, boundary enforcement & splitting
│   ├── features/
│   │   └── build_features.py        # Feature engineering pipeline & scaling
│   ├── training/
│   │   └── train.py                 # Unsupervised Isolation Forest + MLflow SQLite
│   ├── evaluation/
│   │   └── evaluate.py              # Quality gate verification & model registration
│   ├── monitoring/
│   │   ├── check_drift.py           # PSI, KS-test, Wasserstein drift calculation
│   │   └── metrics.py               # Prometheus custom metric declarations
│   ├── explainability/
│   │   ├── shap_explainer.py        # SHAP TreeExplainer for feature importance
│   │   └── lime_explainer.py        # LIME local linear surrogate explainer
│   ├── dags/
│   │   └── fraud_ml_pipeline.py     # Apache Airflow DAG (Airflow 2.10 compatible)
│   ├── artifacts/                   # JSON reports, metrics & model weights
│   │   ├── evaluation_metrics.json  # F1, Precision, Recall, FPR report
│   │   ├── latest_drift_report.json # Population Stability Index summary
│   │   ├── isolation_forest.joblib  # Serialized production model weights
│   │   └── pipeline_execution_summary.json
│   ├── tests/                       # Automated Pytest unit test suite
│   ├── mlflow.db                    # SQLite database storing MLflow experiments
│   ├── dvc.yaml                     # 6-stage DVC reproducible pipeline
│   └── params.yaml                  # Hyperparameters, contamination & thresholds
│
├── ml_service/                      # FastAPI Real-Time Model Serving
│   ├── app/
│   │   ├── main.py                  # Endpoints: /health, /predict, /explain, /drift/check, /metrics
│   │   ├── predictor.py             # Model inference engine & SHAP loader
│   │   └── schemas.py               # Pydantic request/response contracts
│   ├── Dockerfile                   # Microservice container definition
│   └── requirements.txt
│
├── monitoring/                      # Observability Architecture
│   ├── prometheus/
│   │   └── prometheus.yml           # Prometheus scrape config targeting port 8001
│   ├── grafana/
│   │   ├── provisioning/
│   │   │   ├── datasources/prometheus.yml
│   │   │   └── dashboards/dashboard_provider.yml
│   │   └── dashboards/
│   │       └── fraud_ml_dashboard.json # 6-panel real-time MLOps dashboard
│   ├── grafana.ini                  # Grafana configuration (Port 3001, anonymous admin)
│   ├── prometheus-2.54.1.windows-amd64/ # Portable Prometheus Windows runtime
│   └── grafana-v11.2.0/             # Portable Grafana Windows runtime
│
├── docker-compose.yml               # Unified multi-container orchestration
├── dvc.lock                         # Cryptographic hash lockfile for DVC pipeline
├── run_mlops_pipeline.py            # Master CLI runner executing all 8 stages
├── start-all.ps1                    # One-click Windows PowerShell system launcher
├── requirements.txt                 # Pinned Python dependencies
└── README.md                        # Master documentation
```

---

## 8. Prerequisites & Installation

### System Requirements
* **Operating System**: Windows 10/11, Ubuntu 20.04+, or macOS
* **Python**: 3.11 or 3.12
* **Node.js**: v18.0.0 or higher
* **Git**: Installed and configured on PATH

### Step 1: Clone Repository & Set Up Python Virtual Environment
```powershell
# In PowerShell (Administrator recommended for initial setup)
cd d:\DeepBlue4

# Create dedicated virtual environment
py -3.11 -m venv venv_mlops

# Activate virtual environment
.\venv_mlops\Scripts\Activate.ps1

# Upgrade pip and install core dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Step 2: Set Up Node.js Backend & Frontend Dependencies
```powershell
# Install Backend dependencies
cd d:\DeepBlue4\backend
npm install

# Install Frontend dependencies
cd d:\DeepBlue4\frontend
npm install
```

---

## 9. One-Click System Launch

To launch all background services in separate consoles, run the automated launcher:

```powershell
cd d:\DeepBlue4
.\start-all.ps1
```

This launches:
1. **MLflow Tracking UI** on `http://localhost:5000`
2. **FastAPI ML Microservice** on `http://localhost:8001`
3. **Node.js Backend** on `http://localhost:3000`
4. **React Client Application** on `http://localhost:5173`

---

## 10. Step-by-Step Guide: Executing & Viewing Every Tool

### Tool 1: Apache Airflow (Website DAG Execution)
* **Access URL**: [http://localhost:8080](http://localhost:8080)
* **Login Credentials**:
  * **Username**: `admin`
  * **Password**: `admin`
* **How to Execute**:
  1. Open [http://localhost:8080](http://localhost:8080) in your browser.
  2. Locate the DAG named **`fraud_detection_mlops_pipeline`**.
  3. Ensure the toggle switch on the left is **blue (Unpaused)**.
  4. On the far right under Actions, click the **Play** button (▶ `Trigger DAG`).
  5. Click into the DAG to view the **Grid View** and **Graph View**. Watch all 9 stages transition through `running` to `success` (green checkmarks):
     $$\text{ingest\_data} \rightarrow \text{validate\_data} \rightarrow \text{preprocess\_data} \rightarrow \text{build\_features} \rightarrow \text{train\_model} \rightarrow \text{evaluate\_model} \rightarrow \text{quality\_gate\_decision} \rightarrow \text{register\_model} \rightarrow \text{generate\_report}$$
  6. Click any task box (e.g., `train_model` or `evaluate_model`) and select the **Logs** tab to view the live execution log and Model Registry promotion.

---

### Tool 2: Grafana Monitoring Dashboards
* **Access URL**: [http://localhost:3001](http://localhost:3001)
* **Login**: Anonymous admin enabled (no username or password required).
* **Direct Dashboard Link**: [Saarthi AI - Fraud ML Monitoring Dashboard](http://localhost:3001/d/dfze71bktaznkd/saarthi-ai-fraud-ml-monitoring-dashboard)
* **What to Monitor**:
  * **Total Predictions**: Real-time counter of transactions processed by the microservice.
  * **High Risk Predictions**: Counter of high-risk transactions flagged by Isolation Forest.
  * **Average Anomaly Score**: Live gauge of the behavioral deviation score ($0.0 \rightarrow 1.0$).
  * **Inference Latency (ms)**: Histogram showing P95/P99 latency (sub-10ms target).
  * **Model Drift Status**: Live panel verifying statistical stability between baseline and current traffic.
  * **Active Model Version**: Displays currently served registry version (e.g. `FraudDetectionModel v9`).

---

### Tool 3: Prometheus Metrics Server
* **Access URL**: [http://localhost:9090](http://localhost:9090)
* **What to Inspect**:
  * Navigate to **Status ➔ Targets** ([http://localhost:9090/targets](http://localhost:9090/targets)) to verify that `http://127.0.0.1:8001/metrics` has state **`UP`** (green).
  * On the **Graph** tab, execute raw PromQL expressions:
    ```promql
    # Total prediction throughput
    saarthi_ml_predictions_total

    # Prediction rate over 1 minute
    rate(saarthi_ml_predictions_total[1m])

    # 95th percentile inference latency
    histogram_quantile(0.95, sum(rate(saarthi_ml_inference_duration_seconds_bucket[5m])) by (le))
    ```

---

### Tool 4: MLflow Tracking & Model Registry
* **Access URL**: [http://localhost:5000](http://localhost:5000)
* **What to Inspect**:
  * **Experiments Tab**: Click `UPI_Fraud_Detection`. Review all logged runs, hyperparameters (`contamination`, `n_estimators`, `max_samples`), and metrics (`f1_score`, `precision`, `recall`, `roc_auc`).
  * **Models Tab**: Click [`FraudDetectionModel`](http://localhost:5000/#/models/FraudDetectionModel) to view version history (e.g., Version 9), registered artifacts, and candidate tags.
* **Database File**: [`mlops/mlflow.db`](file:///d:/DeepBlue4/mlops/mlflow.db)

---

### Tool 5: FastAPI Interactive Documentation (Swagger UI)
* **Access URL**: [http://localhost:8001/docs](http://localhost:8001/docs)
* **Interactive Endpoints**:
  * `POST /predict/fraud`: Evaluates single transactions and returns risk level, anomaly score, and fraud reasons.
  * `POST /explain`: Generates SHAP feature attributions and LIME local surrogate rules.
  * `GET /drift/check`: Runs the statistical drift engine and returns PSI and KS-test metrics.
  * `GET /health`: Model status and service liveness check.
  * `GET /metrics`: Standard Prometheus metrics export.

---

### Tool 6: DVC (Data Version Control)
* **Execute Pipeline via CLI**:
  ```powershell
  cd d:\DeepBlue4
  .\venv_mlops\Scripts\dvc.exe repro
  ```
* **Inspect Pipeline Status**:
  ```powershell
  .\venv_mlops\Scripts\dvc.exe status
  ```
* **Artifact to View**: Open [`dvc.lock`](file:///d:/DeepBlue4/dvc.lock) to see MD5 hash verification for all 6 stages (`ingest` ➔ `validate` ➔ `preprocess` ➔ `build_features` ➔ `train` ➔ `evaluate`).

---

### Tool 7: Pandera Data Schema Validation
* **Execute via CLI**:
  ```powershell
  .\venv_mlops\Scripts\python.exe -m mlops.validation.validate
  ```
* **Output Report**: Inspect [`mlops/artifacts/validation_report.json`](file:///d:/DeepBlue4/mlops/artifacts/validation_report.json) to see that all 5,000 transactions conformed to strict Pandera type and boundary constraints ($0$ validation errors).

---

### Tool 8: Statistical Feature Drift Detection
* **Execute via CLI**:
  ```powershell
  .\venv_mlops\Scripts\python.exe mlops/monitoring/check_drift.py
  ```
* **Output Report**: Inspect [`mlops/artifacts/latest_drift_report.json`](file:///d:/DeepBlue4/mlops/artifacts/latest_drift_report.json) to view the Population Stability Index (PSI) and Kolmogorov-Smirnov p-values:
  ```json
  {
    "overall_status": "HEALTHY",
    "mean_psi": 0.0062,
    "features": {
      "amount": { "psi": 0.0076, "ks_p_value": 0.984, "drift_detected": false },
      "transaction_velocity": { "psi": 0.0039, "ks_p_value": 0.999, "drift_detected": false }
    }
  }
  ```

---

### Tool 9: Master Pipeline Runner (All 8 Stages in One Command)
To execute the complete end-to-end MLOps lifecycle sequentially on Windows without dependencies:
```powershell
cd d:\DeepBlue4
.\venv_mlops\Scripts\python.exe run_mlops_pipeline.py
```
* **Duration**: ~8 to 10 seconds.
* **Output**: Generates all artifacts, updates `mlflow.db`, verifies drift, and registers a candidate model.

To execute a single stage on demand:
```powershell
.\venv_mlops\Scripts\python.exe run_mlops_pipeline.py --stage ingest
.\venv_mlops\Scripts\python.exe run_mlops_pipeline.py --stage validate
.\venv_mlops\Scripts\python.exe run_mlops_pipeline.py --stage train
.\venv_mlops\Scripts\python.exe run_mlops_pipeline.py --stage evaluate
.\venv_mlops\Scripts\python.exe run_mlops_pipeline.py --stage drift
```

---

### Tool 10: Saarthi Fraud Operations Center (Admin UI)
* **Access URL**: [http://localhost:5173/admin](http://localhost:5173/admin)
* **Key Features**:
  * **Role-Based Separation**: Dedicated interface for fraud analysts and operations staff (separated from the normal UPI customer payment screen).
  * **Live Operational Metrics**: Total transactions evaluated, high-risk flagged count, false-positive rate, active model badge.
  * **Recent Flagged Transactions Table**: Interactive inspection of anomalous transfers.
  * **Behavioral Profile Inspector**: Compares user normal spending habits against transaction parameters.
  * **SHAP & LIME Visualizer**: Explains why a transaction was flagged with signed impact weights.

---

## 11. Automated Testing Suite

To run all unit tests, data validation tests, and API contract verifications:

```powershell
cd d:\DeepBlue4
.\venv_mlops\Scripts\python.exe -m pytest mlops/tests/ -v
```

Tests cover:
* Synthetic data generation format and Pandera schema compliance
* Feature engineering mathematical consistency and scaler persistence
* Isolation Forest training without label leakage
* Quality gate F1 and FPR boundary enforcement
* FastAPI `/health`, `/predict`, and `/drift/check` contract compliance

---

## 12. Responsible AI, Privacy & Security

1. **Zero PII Ingestion**: No names, Aadhaar numbers, phone numbers, or bank account numbers are fed into the ML models.
2. **Cryptographic Pseudonymization**: User IDs and Beneficiary VPAs are pseudonymized using SHA-256 hashes prior to feature extraction.
3. **Controlled Metric Cardinality**: Prometheus labels are restricted strictly to low-cardinality values (`risk_level`, `model_version`, `status`), preventing memory exhaustion.
4. **Advisory Delay Over Hard Blocking**: High-risk transactions trigger an advisory delay and secondary biometric/PIN verification rather than immediate account freezes, protecting user autonomy.

---

## 13. Academic Viva & Demonstration Script

For oral examinations, project presentations, and viva demonstrations, follow this sequence:

| Demo Stage | What to Show | Key Point to Explain to Examiner |
| :--- | :--- | :--- |
| **1. Data Versioning** | Run `dvc status` and show `dvc.lock` | Explain how DVC decouples large dataset storage from Git code versioning. |
| **2. Data Validation** | Show `mlops/artifacts/validation_report.json` | Highlight how Pandera enforces data contracts before data reaches training. |
| **3. Model Training & Registry** | Open `http://localhost:5000` | Demonstrate the MLflow Model Registry and how the Quality Gate gates promotion. |
| **4. Airflow Orchestration** | Open `http://localhost:8080` and trigger DAG | Show the visual DAG execution and explain how batch retraining is automated. |
| **5. Real-Time Inference** | Open `http://localhost:8001/docs` (`POST /predict/fraud`) | Demonstrate sub-10ms response time and the natural language Fraud Reason Engine. |
| **6. Explainability** | Show SHAP & LIME attributions in `/admin` | Explain how TreeExplainer and LIME satisfy regulatory explainability mandates. |
| **7. Observability** | Open `http://localhost:3001` (Grafana) | Show real-time anomaly score gauges and explain Prometheus scraping architecture. |
| **8. Drift Detection** | Open `POST http://localhost:8001/drift/check` | Explain how Population Stability Index (PSI) alerts operators before model degradation. |

---

## 14. License

This project is released under the **MIT License**. All tools, libraries, and frameworks utilized in this project are 100% free, open-source, and locally runnable.
