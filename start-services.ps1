# ==============================================================================
# DEEPBLUE AI - Start All Services (Full Platform Launcher)
# ==============================================================================

$Root = "D:\DeepBlue4"
Set-Location $Root

$LogsDir = Join-Path $Root "logs"
if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null }

$MongoData = Join-Path $Root "mongodb_data"
if (-not (Test-Path $MongoData)) { New-Item -ItemType Directory -Path $MongoData -Force | Out-Null }

function Test-PortActive {
    param([int]$Port)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect('127.0.0.1', $Port)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       DEEPBLUE AI MLOps & FRAUD PREVENTION PLATFORM       " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. MongoDB (Port 27017)
if (-not (Test-PortActive -Port 27017)) {
    Write-Host "[1/8] Starting MongoDB (port 27017)..." -ForegroundColor Yellow
    $mongoBin = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe"
    if (-not (Test-Path $mongoBin)) {
        $mongoBin = (Get-ChildItem -Path "C:\Program Files\MongoDB\Server\*\bin\mongod.exe" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
    }
    Start-Process -FilePath $mongoBin -ArgumentList "--dbpath `"$MongoData`" --port 27017 --bind_ip 127.0.0.1" `
        -RedirectStandardOutput (Join-Path $LogsDir "mongodb.log") `
        -RedirectStandardError (Join-Path $LogsDir "mongodb_err.log") `
        -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/8] MongoDB is already running on port 27017." -ForegroundColor Green
}

# 2. FastAPI ML Microservice (Port 8001)
if (-not (Test-PortActive -Port 8001)) {
    Write-Host "[2/8] Starting FastAPI ML Microservice (port 8001)..." -ForegroundColor Yellow
    $uvicorn = Join-Path $Root "venv_mlops\Scripts\uvicorn.exe"
    Start-Process -FilePath $uvicorn -ArgumentList "ml_service.app.main:app --host 127.0.0.1 --port 8001" `
        -WorkingDirectory $Root `
        -RedirectStandardOutput (Join-Path $LogsDir "fastapi.log") `
        -RedirectStandardError (Join-Path $LogsDir "fastapi_err.log") `
        -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "[2/8] FastAPI is already running on port 8001." -ForegroundColor Green
}

# 3. Node.js Backend Gateway (Port 3000)
if (-not (Test-PortActive -Port 3000)) {
    Write-Host "[3/8] Starting Node.js Backend Gateway (port 3000)..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" `
        -WorkingDirectory (Join-Path $Root "backend") `
        -RedirectStandardOutput (Join-Path $LogsDir "backend.log") `
        -RedirectStandardError (Join-Path $LogsDir "backend_err.log") `
        -WindowStyle Hidden
    Start-Sleep -Seconds 3
} else {
    Write-Host "[3/8] Backend is already running on port 3000." -ForegroundColor Green
}

# 4. React Vite Frontend (Port 5173)
if (-not (Test-PortActive -Port 5173)) {
    Write-Host "[4/8] Starting React Frontend UI (port 5173)..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" `
        -WorkingDirectory (Join-Path $Root "frontend") `
        -RedirectStandardOutput (Join-Path $LogsDir "frontend.log") `
        -RedirectStandardError (Join-Path $LogsDir "frontend_err.log") `
        -WindowStyle Hidden
    Start-Sleep -Seconds 3
} else {
    Write-Host "[4/8] Frontend is already running on port 5173." -ForegroundColor Green
}

# 5. MLflow Tracking UI (Port 5000)
if (-not (Test-PortActive -Port 5000)) {
    Write-Host "[5/8] Starting MLflow Tracking UI (port 5000)..." -ForegroundColor Yellow
    $python = Join-Path $Root "venv_mlops\Scripts\python.exe"
    Start-Process -FilePath $python -ArgumentList "-m mlflow ui --backend-store-uri sqlite:///D:/DeepBlue4/mlops/mlflow.db --artifacts-destination D:/DeepBlue4/mlops/mlruns --host 127.0.0.1 --port 5000" `
        -WorkingDirectory $Root `
        -RedirectStandardOutput (Join-Path $LogsDir "mlflow.log") `
        -RedirectStandardError (Join-Path $LogsDir "mlflow_err.log") `
        -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "[5/8] MLflow UI is already running on port 5000." -ForegroundColor Green
}

# 6. Prometheus Scraper Daemon (Port 9090)
if (-not (Test-PortActive -Port 9090)) {
    Write-Host "[6/8] Starting Prometheus Monitoring Daemon (port 9090)..." -ForegroundColor Yellow
    $promExe = Join-Path $Root "monitoring\prometheus-2.54.1.windows-amd64\prometheus.exe"
    $promCfg = Join-Path $Root "monitoring\prometheus\prometheus.yml"
    $promData = Join-Path $Root "monitoring\prometheus-data"
    Start-Process -FilePath $promExe -ArgumentList "--config.file=`"$promCfg`" --storage.tsdb.path=`"$promData`"" `
        -WorkingDirectory $Root `
        -RedirectStandardOutput (Join-Path $LogsDir "prometheus.log") `
        -RedirectStandardError (Join-Path $LogsDir "prometheus_err.log") `
        -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "[6/8] Prometheus is already running on port 9090." -ForegroundColor Green
}

# 7. Grafana Server (Port 3001)
if (-not (Test-PortActive -Port 3001)) {
    Write-Host "[7/8] Starting Grafana Server (port 3001)..." -ForegroundColor Yellow
    $grafanaExe = Join-Path $Root "monitoring\grafana-v11.2.0\bin\grafana-server.exe"
    $grafanaCfg = Join-Path $Root "monitoring\grafana.ini"
    $grafanaHome = Join-Path $Root "monitoring\grafana-v11.2.0"
    Start-Process -FilePath $grafanaExe -ArgumentList "--config=`"$grafanaCfg`" --homepath=`"$grafanaHome`"" `
        -WorkingDirectory $grafanaHome `
        -RedirectStandardOutput (Join-Path $LogsDir "grafana.log") `
        -RedirectStandardError (Join-Path $LogsDir "grafana_err.log") `
        -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "[7/8] Grafana is already running on port 3001." -ForegroundColor Green
}

# 8. Apache Airflow (Port 8080 - WSL)
if (-not (Test-PortActive -Port 8080)) {
    Write-Host "[8/8] Checking Apache Airflow Standalone in WSL (port 8080)..." -ForegroundColor Yellow
    try {
        Start-Process -FilePath "wsl.exe" -ArgumentList "-e bash -c `"export PATH=/home/radhyeshyam_lahoti/airflow_venv/bin:`$PATH; export AIRFLOW_HOME=/home/radhyeshyam_lahoti/airflow; export AIRFLOW__CORE__DAGS_FOLDER=/home/radhyeshyam_lahoti/airflow/dags; export AIRFLOW__CORE__LOAD_EXAMPLES=False; airflow standalone`"" `
            -RedirectStandardOutput (Join-Path $LogsDir "airflow.log") `
            -RedirectStandardError (Join-Path $LogsDir "airflow_err.log") `
            -WindowStyle Hidden
        Start-Sleep -Seconds 3
    } catch {
        Write-Host "Airflow standalone in WSL skipped or not installed in WSL." -ForegroundColor DarkGray
    }
} else {
    Write-Host "[8/8] Airflow is already running on port 8080." -ForegroundColor Green
}

Write-Host "`nWaiting for all services to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 4

Write-Host "`n=== DEEPBLUE AI PORT STATUS AUDIT ===" -ForegroundColor Cyan
$services = @(
    @{ Name="DEEPBLUE Web UI"; Port=5173; Url="http://localhost:5173" },
    @{ Name="Node.js Gateway"; Port=3000; Url="http://localhost:3000" },
    @{ Name="FastAPI Microservice"; Port=8001; Url="http://localhost:8001/docs" },
    @{ Name="MLflow Registry"; Port=5000; Url="http://localhost:5000" },
    @{ Name="Prometheus Telemetry"; Port=9090; Url="http://localhost:9090" },
    @{ Name="Grafana Dashboards"; Port=3001; Url="http://localhost:3001" },
    @{ Name="Airflow Orchestrator"; Port=8080; Url="http://localhost:8080" },
    @{ Name="MongoDB Community"; Port=27017; Url="localhost:27017" }
)

foreach ($s in $services) {
    if (Test-PortActive -Port $s.Port) {
        Write-Host ("[ONLINE]  " + $s.Name.PadRight(24) + " -> " + $s.Url) -ForegroundColor Green
    } else {
        Write-Host ("[OFFLINE] " + $s.Name.PadRight(24) + " -> " + $s.Url) -ForegroundColor Red
    }
}

Write-Host "`nAll logs stored in: $LogsDir" -ForegroundColor Gray
Write-Host "To stop all services, run: .\stop-services.ps1`n" -ForegroundColor Gray
