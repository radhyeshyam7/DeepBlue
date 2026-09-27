# DeepBlue4 / Saarthi AI - FastAPI ML Service Container
FROM python:3.11-slim

WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY ml_service/requirements.txt /workspace/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code and model artifacts
COPY ml_service/ /workspace/ml_service/
COPY mlops/ /workspace/mlops/

# Set Python path to workspace root
ENV PYTHONPATH=/workspace
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "ml_service.app.main:app", "--host", "0.0.0.0", "--port", "8001"]
