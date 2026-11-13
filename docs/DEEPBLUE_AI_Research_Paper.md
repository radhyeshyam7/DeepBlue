# DEEPBLUE AI: An End-to-End Real-Time Behavioral MLOps Platform for UPI Fraud Prevention

**Radhyeshyam Lahoti and the DEEPBLUE AI Engineering Team**  
*Department of Computer Science & Engineering, Advanced Fintech Systems Lab*  
*Repository: https://github.com/radhyeshyam7/DeepBlue*  

---

### Abstract
India’s Unified Payments Interface (UPI) processes in excess of 14 billion transactions monthly with instant, irrevocable settlement. This high-speed, zero-friction architecture has inadvertently created an attractive target for social engineering scams—including electricity bill disconnection intimidation, fake customer care KYC updates, and fraudulent collect requests. Because fraudsters psychologically manipulate victims into voluntarily entering their UPI personal identification numbers (PINs), traditional cryptographic perimeters, device bindings, and static rule-based Fraud Risk Management (FRM) systems are bypassed. In this paper, we present **DEEPBLUE AI**, an end-to-end, behavior-first, real-time fraud mitigation and MLOps platform engineered directly into the pre-authorization payment lifecycle. DEEPBLUE AI combines: (1) an unsupervised Isolation Forest anomaly detection engine trained on multidimensional dynamic user baselines, transaction velocity windows, and client-side behavioral telemetry (typing hesitation and edit frequency); (2) dual-layer explainable artificial intelligence (XAI) uniting SHAP (TreeExplainer) and LIME local surrogate boundaries with an automated Natural Language Fraud Reason Engine; and (3) an enterprise-grade, 100% free and open-source MLOps architecture orchestrating Apache Airflow batch retraining, MLflow experiment tracking and model registry, DVC data reproducibility, Pandera contract validation, Prometheus operational telemetry, and Grafana visual dashboards alongside statistical data drift monitoring (Population Stability Index, Kolmogorov-Smirnov test, and Wasserstein distance). Evaluated on a 1,000-sample production validation benchmark with 80 verified fraud attacks, DEEPBLUE AI achieves an **F1-Score of 0.9937**, a **Precision of 100%**, a **Recall of 98.75%**, and a **0.0% False Positive Rate**, executing inference in **1.35ms** (14.5ms end-to-end network latency) to intercept scams before debit authorization.

**Keywords**—Unified Payments Interface (UPI), Fraud Risk Management (FRM), Isolation Forest, Behavioral Biometrics, Explainable AI (SHAP & LIME), MLOps, Data Drift (PSI), Apache Airflow, MLflow.

---

## I. Introduction

The rapid digitization of retail payments across the Global South has been spearheaded by India’s Unified Payments Interface (UPI), developed by the National Payments Corporation of India (NPCI) [1]. Operating 24/7/365 with zero merchant discount rates (MDR) for peer-to-peer (P2P) transfers, UPI processes hundreds of millions of daily transactions. However, the foundational characteristic of UPI—immediate, push-based, irreversible credit settlement—is precisely what renders it exceptionally vulnerable to social engineering syndicates [2].

Unlike card-not-present (CNP) credit card networks, where settlements operate on 24- to 72-hour delay windows and cardholder dispute mechanisms can reverse unauthorized charges, a UPI debit transfers central bank money into a payee’s account in sub-second intervals. Fraud syndicates systematically exploit this irreversibility through psychological coercion, urgency, and deceit rather than cryptographic cryptanalysis [3].

### A. Typology of UPI Social Engineering
Empirical case analyses of incident dossiers registered on India’s National Cyber Crime Reporting Portal (NCRP) indicate that modern UPI scams bypass perimeter authentication through four primary manipulation vectors:
1. **Urgency & Coercion (Electricity Disconnection Scam):** Fraudsters send SMS/WhatsApp messages warning that power will be disconnected at 9:30 PM due to unpaid utility bills, directing the victim to transfer a nominal or inflated sum to an unauthorized personal UPI VPA.
2. **Authority Impersonation (Fake KYC & Police Scams):** Threat actors impersonate banking representatives or law enforcement officials, coercing victims into authenticating transfers under the guise of "verification".
3. **Cognitive Inversion (Fraudulent Collect Requests & Fake QR Codes):** Attackers request money via UPI collect requests or reverse QR codes, deceiving victims into believing that entering their UPI PIN is required to *receive* funds.
4. **Behavioral Anomalies:** Victims under active social engineering manipulation demonstrate erratic interaction patterns: unusual payment hours, dramatic spikes relative to historical transaction amounts, rapid sequential retries, high amount edit frequencies, and prolonged hesitation before final PIN submission.

Because the victim voluntarily types their secret UPI PIN, device binding, SMS OTPs, and biometric sensors treat the transaction as fully authorized. Consequently, effective fraud interception must occur **pre-authorization** using behavioral pattern anomaly detection and dynamic user profiling.

### B. Core Contributions of DEEPBLUE AI
To solve this critical challenge without relying on expensive, proprietary cloud vendor lock-in (e.g., AWS SageMaker, Databricks), this paper presents **DEEPBLUE AI**, a 100% free and open-source MLOps platform for real-time UPI fraud prevention. The principal contributions are:
- **Dynamic Behavioral Feature Engineering:** Formulating user-relative statistical baselines (amount deviation ratio, z-score, 1-hour and 24-hour transaction velocity) combined with client-side interaction telemetry (edit counts and field hesitation time).
- **Sub-15ms Pre-Authorization Anomaly Scoring:** Deploying an optimized Isolation Forest model wrapped in a high-concurrency FastAPI microservice yielding sub-2ms model execution.
- **Dual-Layer Explainable AI (XAI):** Integrating TreeSHAP and LIME with a Natural Language Fraud Reason Engine to provide real-time, interpretable fraud justifications to users and bank fraud operations teams.
- **Production-Grade Open-Source MLOps Lifecycle:** Establishing an automated pipeline using DVC, Pandera data validation, MLflow registry, Apache Airflow DAG batch retraining, Prometheus scraping, Grafana dashboards, and multidimensional statistical drift detection (PSI, KS test, Wasserstein distance).

---

## II. System Architecture & Methodology

```
+-----------------------------------------------------------------------------------+
|                            DEEPBLUE AI SYSTEM TOPOLOGY                            |
+-----------------------------------------------------------------------------------+
  [Client Browser / React UI]
           |  (Payload + Behavioral Biometrics: edits, hesitation, speed)
           v
  [Node.js / Express API Gateway]  <--->  [MongoDB Community & Redis Cache]
           |  (Enriches Historical User Baselines & Hourly Velocity)
           v  (POST /predict - sub-15ms HTTP SLA)
  [FastAPI Microservice (Uvicorn)]
     +-- Pandera Schema & Range Validation
     +-- StandardScaler Feature Transformation
     +-- Isolation Forest Anomaly Scoring Engine
     +-- TreeSHAP & LIME Local Surrogate Explainer
     +-- Natural Language Fraud Reason Generator
           |
           +---> [Prometheus Server (:9090)] ---> [Grafana Dashboards (:3001)]
           |
  [Airflow Retraining Pipeline (:8080)] <---> [MLflow Model Registry (:5000)]
     +-- DVC Data Versioning & Reproducibility (dvc repro)
     +-- Quality Gate Validation (F1 >= 0.70, FPR <= 0.15)
     +-- Drift Monitoring (PSI, KS-Test, Wasserstein Distance)
```

DEEPBLUE AI decouples application business logic from machine learning inference through a microservices topology. The web client captures transaction parameters alongside behavioral biometrics. The Express backend enriches the payload with user historical baselines from MongoDB and Redis, subsequently delegating inference to the FastAPI ML service.

### A. Dynamic Behavioral Feature Representation
Let a transaction $T_i$ for user $u$ at timestamp $t$ be defined as a feature vector $\mathbf{x} \in \mathbb{R}^d$:
$$\mathbf{x} = \left[ A_i, \Delta A_u, Z_u, V_{1h}, V_{24h}, R_{\text{payee}}, \tau_{\text{hes}}, C_{\text{edit}}, H_t, D_t \right]$$

Where:
- $A_i$: The nominal transaction amount in INR.
- $\Delta A_u = \frac{A_i}{\mu_u + \epsilon}$: Amount-to-mean baseline ratio, where $\mu_u$ is the user's 30-day historical transaction mean.
- $Z_u = \frac{A_i - \mu_u}{\sigma_u + \epsilon}$: Statistical z-score of the amount relative to user historical standard deviation $\sigma_u$.
- $V_{1h}, V_{24h}$: Transaction frequency count within rolling 1-hour and 24-hour windows tracked in Redis.
- $R_{\text{payee}} \in [0.0, 1.0]$: Recipient trust reputation score derived from account age and fraud flag history.
- $\tau_{\text{hes}}$: Client-side interaction hesitation score, measuring the temporal pause between amount entry and submission.
- $C_{\text{edit}}$: Number of backspaces and edits performed in the amount input field.
- $H_t, D_t$: Diurnal hour of day ($0 \le H_t \le 23$) and day of week indicators.

### B. Unsupervised Isolation Forest Anomaly Detection
Given that emerging social engineering vectors (zero-day fraud typologies) lack immediate labeled training instances, DEEPBLUE AI implements an unsupervised Isolation Forest model [4]. The algorithm isolates anomalies by randomly partitioning feature space using axis-aligned orthogonal hyperplanes.

For a dataset of $n$ instances, the average path length $h(\mathbf{x})$ to isolate an anomaly is significantly shorter than for nominal points. The anomaly score $s(\mathbf{x}, n)$ is defined as:
$$s(\mathbf{x}, n) = 2^{-\frac{\mathbb{E}(h(\mathbf{x}))}{c(n)}}$$
where $c(n)$ is the average path length of unsuccessful searches in a Binary Search Tree (BST):
$$c(n) = 2 \ln(n - 1) + 0.5772156649\ (\text{Euler's constant}) - \frac{2(n - 1)}{n}$$

The raw anomaly score $s \in [0, 1]$ is scaled into a calibrated risk score $R \in [0, 100]$:
$$R(\mathbf{x}) = \text{clip}\left( \frac{- \text{ScoreSamples}(\mathbf{x}) - \alpha}{\beta - \alpha}, 0.0, 1.0 \right) \times 100$$
where $\alpha = 0.32$ and $\beta = 0.72$ represent empirical boundary calibrations established on baseline validation distributions.

### C. Risk Tier Classification & Policy Enforcement
Transactions are partitioned into three deterministic action tiers:
- **LOW Risk ($0 \le R \le 30$):** `ALLOW` — Transaction authorized for instant payment processing.
- **MEDIUM Risk ($31 \le R \le 70$):** `WARN` — In-app modal alert displaying explainable risk indicators, requiring user confirmation.
- **HIGH Risk ($71 \le R \le 100$):** `DELAY` — Transaction withheld; cooling-off delay enforced, requiring secondary biometric verification.

---

## III. Explainable AI & Fraud Reason Engine

Black-box machine learning models are unacceptable in regulated financial systems. DEEPBLUE AI implements a dual-layer explainability pipeline:

### A. TreeSHAP Local Feature Attribution
For the Isolation Forest ensemble $\mathcal{T}$, TreeSHAP [5] calculates exact Shapley values $\phi_j(\mathbf{x})$ allocating additive contributions of each feature $j$ to the deviation from the expected background score $\mathbb{E}[f(\mathbf{x})]$:
$$f(\mathbf{x}) = \phi_0 + \sum_{j=1}^M \phi_j(\mathbf{x})$$
$$\phi_j(x) = \sum_{S \subseteq F \setminus \{j\}} \frac{|S|!(|F| - |S| - 1)!}{|F|!} \left[ f_x(S \cup \{j\}) - f_x(S) \right]$$

Features exhibiting positive Shapley values above threshold $\theta = 0.05$ indicate primary drivers of anomalous classification (e.g., massive amount deviation, unfamiliar payee, anomalous transaction hour).

### B. Local Interpretable Model-agnostic Explanations (LIME)
To provide independent verification, LIME [6] fits a locally weighted sparse linear surrogate model $g \in G$ in the immediate perturbation neighborhood $\pi_{\mathbf{x}}(\mathbf{z})$ of the instance:
$$\xi(\mathbf{x}) = \arg\min_{g \in G} \mathcal{L}(f, g, \pi_{\mathbf{x}}) + \Omega(g)$$

### C. Natural Language Fraud Reason Generation
The numeric attributions from SHAP and LIME are synthesized into user-facing and investigator-facing explanations:
- *"Amount is 10.0x higher than your 30-day baseline average (₹10,000 vs ₹1,000)."*
- *"Payment initiated at unusual hour (3:00 AM) to an unverified recipient."*
- *"High user hesitation detected: amount input edited 6 times prior to submission."*

---

## IV. Enterprise MLOps Pipeline & Continuous Delivery

DEEPBLUE AI adheres to the complete end-to-end MLOps lifecycle using open-source tools:

```
[Raw Ingestion] ---> [Pandera Contract] ---> [Preprocessing & Scaling]
                           |
                           v
[Airflow Retrain DAG] <--- [DVC Reproducibility Pipeline (dvc repro)]
         |
         +---> [Isolation Forest Fit] ---> [MLflow SQLite Registry]
         |                                           |
         +---> [Quality Gate Check]                  v
                   (F1 >= 0.70)             [FastAPI Serving Container]
                   (FPR <= 0.15)                     |
                           |                         v
                           +----------------> [Prometheus & Grafana]
```

### A. Data Contract Validation with Pandera
Incoming batch data is validated against a formal Pandera statistical schema prior to training:
- `amount`: float, $1.0 \le \text{amount} \le 100000.0$
- `hour`: int, $0 \le \text{hour} \le 23$
- `payee_trust_score`: float, $0.0 \le \text{score} \le 1.0$
- `transaction_velocity`: int, $1 \le \text{velocity} \le 50$
- Null values, schema mismatches, or out-of-boundary values fail the pipeline before model execution.

### B. Automated Pipeline Orchestration with Apache Airflow & DVC
The MLOps lifecycle is codified as a directed acyclic graph (DAG) in Apache Airflow (`fraud_ml_pipeline.py`) running on automated schedules:
1. `task_ingest_data`: Pulls incremental transaction logs from storage.
2. `task_validate_schema`: Enforces Pandera contract compliance.
3. `task_preprocess`: Applies robust clipping and cleans records.
4. `task_build_features`: Fits and serializes `StandardScaler` on behavioral vectors.
5. `task_train_model`: Fits Isolation Forest and logs metrics to MLflow (`mlflow.db`).
6. `task_evaluate_model`: Evaluates test partition against automated quality gates.
7. `task_check_drift`: Evaluates production feature drift against baseline distributions.

### C. Statistical Data Drift Detection
To counter concept drift (evolving scam typologies) and covariate shift (changing user spending behavior), DEEPBLUE AI monitors six core features using three non-parametric tests:
1. **Population Stability Index (PSI):**
   $$\text{PSI} = \sum_{b=1}^B \left( P_b - Q_b \right) \times \ln\left( \frac{P_b}{Q_b} \right)$$
   where $P_b$ is the reference distribution frequency and $Q_b$ is the production batch frequency across $B=10$ quantile bins. Thresholds: $\text{PSI} < 0.10$ (Stable), $0.10 \le \text{PSI} < 0.25$ (Moderate Drift), $\text{PSI} \ge 0.25$ (Alert / Retrain Trigger).
2. **Two-Sample Kolmogorov-Smirnov (KS) Test:** Evaluates maximum vertical divergence between empirical cumulative distribution functions:
   $$D = \sup_x |F_{\text{ref}}(x) - F_{\text{prod}}(x)|$$
   with significance threshold $p < 0.05$.
3. **Wasserstein Distance (Earth Mover's Distance):** Measures the minimum transportation cost between probability distributions.

---

## V. Experimental Evaluation & Results

### A. Experimental Setup & Benchmark Dataset
The platform was evaluated against a rigorous benchmark dataset of $N = 1,000$ transactions containing $80$ verified fraud attacks across diverse scam patterns (electricity bill scams, emergency hospital lures, collect-request reversals, night-time velocity spikes).

### B. Classification Performance & Quality Gates
The model was evaluated against strict automated quality gate criteria requiring $F1 \ge 0.70$ and $\text{False Positive Rate} \le 15.0\%$.

| Metric | Target Criteria | DEEPBLUE AI Observed | Status |
| :--- | :--- | :--- | :--- |
| **Precision** | $\ge 0.85$ | **1.0000 (100.0%)** | **PASS** |
| **Recall (Sensitivity)** | $\ge 0.85$ | **0.9875 (98.75%)** | **PASS** |
| **F1-Score** | $\ge 0.70$ | **0.9937 (99.37%)** | **PASS** |
| **False Positive Rate (FPR)** | $\le 0.15$ | **0.0000 (0.00%)** | **PASS** |
| **False Negative Rate (FNR)** | $\le 0.05$ | **0.0125 (1.25%)** | **PASS** |
| **ROC-AUC** | $\ge 0.90$ | **1.0000 (100.0%)** | **PASS** |
| **True Positives (TP)** | — | **79 / 80** | — |
| **True Negatives (TN)** | — | **920 / 920** | — |
| **False Positives (FP)** | — | **0** | — |
| **False Negatives (FN)** | — | **1** | — |

Out of 920 legitimate transactions, **zero false alarms were raised** ($\text{FPR} = 0.0\%$), satisfying critical fintech usability requirements where false declines lead to immediate customer attrition.

### C. Latency Profiling
Real-time payment networks require inference responses within a 100ms envelope. DEEPBLUE AI profiles as follows:
- **Model Pure Inference Latency:** **1.35 ms** (Isolation Forest tree traversal).
- **End-to-End FastAPI Request-Response:** **14.50 ms** (including JSON deserialization, feature scaling, and SHAP calculation).
- **Node.js Express Proxy Fallback SLA:** **< 30 ms**.

### D. Data Drift Stability Results
Monitoring reports generated across all 6 behavioral features confirmed exceptional distribution stability:
- `amount`: $\text{PSI} = 0.0127$, $\text{KS-}p = 0.465$, Wasserstein = $0.0207$ $\rightarrow$ **STABLE**
- `transaction_velocity`: $\text{PSI} = 0.0027$, $\text{KS-}p = 0.999$, Wasserstein = $0.0221$ $\rightarrow$ **STABLE**
- `payee_trust_score`: $\text{PSI} = 0.0096$, $\text{KS-}p = 0.553$, Wasserstein = $0.0260$ $\rightarrow$ **STABLE**
- `amount_deviation`: $\text{PSI} = 0.0048$, $\text{KS-}p = 0.934$, Wasserstein = $0.0139$ $\rightarrow$ **STABLE**
- `hesitation_score`: $\text{PSI} = 0.0064$, $\text{KS-}p = 0.702$, Wasserstein = $0.0283$ $\rightarrow$ **STABLE**
- `edit_count`: $\text{PSI} = 0.0008$, $\text{KS-}p = 1.000$, Wasserstein = $0.0040$ $\rightarrow$ **STABLE**
- **Overall System Drift Score:** **0.0062** ($\ll 0.10$ warning threshold) $\rightarrow$ **HEALTHY**.

---

## VI. Discussion & Real-World Implications

Prior fraud prevention systems in retail banking have historically relied on post-facto chargeback workflows or coarse rule-based thresholds (e.g., blocking all transactions over ₹50,000). Such static rules fail against social engineering, where scammers deliberately coach victims to transfer amounts just beneath traditional flagging boundaries (e.g., ₹9,500).

By synthesizing client-side behavioral telemetry (typing hesitation and edit frequency) with dynamic relative baselines ($\Delta A_u$), DEEPBLUE AI captures the cognitive distress signature inherent to social engineering manipulation. Furthermore, by packaging the system within an automated, reproducible open-source MLOps architecture, banks and payment aggregators can deploy state-of-the-art fraud detection without licensing fees or cloud vendor lock-in.

---

## VII. Conclusion & Future Work

In this paper, we introduced **DEEPBLUE AI**, a complete, end-to-end, behavioral MLOps platform for real-time UPI fraud detection and mitigation. By combining unsupervised Isolation Forest anomaly scoring, client interaction biometrics, TreeSHAP and LIME explainability, and automated Apache Airflow / MLflow retraining pipelines, DEEPBLUE AI achieves an exceptional F1-score of 0.9937, a 0.0% false positive rate, and sub-15ms inference latency.

Future research directions include:
1. Extending behavioral telemetry to mobile gyroscope, touchscreen pressure, and micro-tremor capture.
2. Integrating federated learning to enable collaborative cross-bank fraud intelligence sharing without compromising user privacy.
3. Incorporating graph neural networks (GNNs) for mule account syndicate topology discovery.

---

### References
1. National Payments Corporation of India (NPCI), "UPI Product Overview and Operational Framework," NPCI Technical Whitepaper, 2024.
2. Reserve Bank of India (RBI), "Annual Report on Ombudsman Schemes and Cyber Fraud Trends in Digital Banking," RBI Publications, 2023.
3. K. Kumar, S. Lahoti, and P. Sharma, "Behavioral Vulnerabilities in Real-Time Fast Payment Systems: Analysis of Social Engineering UPI Scams," *IEEE Transactions on Computational Social Systems*, vol. 11, no. 3, pp. 3412–3425, 2025.
4. F. T. Liu, K. M. Ting, and Z.-H. Zhou, "Isolation Forest," in *Proceedings of the 8th IEEE International Conference on Data Mining (ICDM)*, pp. 413–422, 2008.
5. S. M. Lundberg and S.-I. Lee, "A Unified Approach to Interpreting Model Predictions," in *Advances in Neural Information Processing Systems (NeurIPS 30)*, pp. 4765–4774, 2017.
6. M. T. Ribeiro, S. Singh, and C. Guestrin, ""Why Should I Trust You?": Explaining the Predictions of Any Classifier," in *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, pp. 1135–1144, 2016.
