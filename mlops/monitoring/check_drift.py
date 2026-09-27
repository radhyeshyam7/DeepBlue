"""
Automated Drift Detection Scheduled Job for DeepBlue4 / Saarthi AI
Executes PSI and KS-Test statistical checks against baseline dataset.
Can be triggered via Windows Task Scheduler, Cron, or background daemon.
"""

import sys
import os
import json
import logging
from datetime import datetime

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from mlops.monitoring.drift import detect_drift

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [DRIFT_CRON] %(message)s"
)
logger = logging.getLogger("drift_cron")

def run_drift_check_job():
    logger.info("=" * 60)
    logger.info("SCHEDULED FEATURE DRIFT DETECTION MONITORING JOB")
    logger.info("=" * 60)
    
    report = detect_drift()
    
    status = report.get("overall_status", "UNKNOWN")
    score = report.get("overall_drift_score", 0.0)
    monitored = report.get("features_monitored_count", 0)
    
    logger.info(f"Drift Analysis Status: {status} | Mean PSI: {score:.4f} | Monitored Features: {monitored}")
    
    if status == "ALERT":
        logger.warning("CRITICAL ALERT: Significant feature drift detected! Flagging for auto-retraining.")
    elif status == "WARNING":
        logger.info("WARNING: Moderate feature drift observed. Monitoring closely.")
    else:
        logger.info("STABLE: Production distributions are well within safety bounds.")
        
    log_file = "mlops/artifacts/latest_drift_report.json"
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        
    logger.info(f"Report saved to {log_file}")
    return report

if __name__ == "__main__":
    run_drift_check_job()
