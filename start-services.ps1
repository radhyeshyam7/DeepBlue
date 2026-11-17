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
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect('127.0.0.1', $Port)
        $client.Close()
        return $true
    } catch {
        try {
            $client6 = New-Object System.Net.Sockets.TcpClient
            $client6.Connect('::1', $Port)
            $client6.Close()
            return $true
        } catch {
            return $false
        }
    }
}

function Start-DetachedProcess {
    param(
        [string]$CommandLine,
        [string]$WorkingDirectory = $Root
    )
    $args = @{
        CommandLine = $CommandLine
        CurrentDirectory = $WorkingDirectory
    }
    Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments $args | Out-Null
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       DEEPBLUE AI MLOps & FRAUD PREVENTION PLATFORM       " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. MongoDB (Port 27017)
if (-not (Test-PortActive -Port 27017)) {
    Write-Host "[1/8] Starting MongoDB (port 27017)..." -ForegroundColor Yellow
    try {
        Start-Service -Name MongoDB -ErrorAction SilentlyContinue
    } catch {}
    if (-not (Test-PortActive -Port 27017)) {
        $mongoBin = (Get-ChildItem -Path "C:\Program Files\MongoDB\Server\*\bin\mongod.exe" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
        if ($mongoBin) {
            Start-DetachedProcess -CommandLine "`"$mongoBin`" --dbpath `"$MongoData`" --port 27017 --bind_ip 127.0.0.1" -WorkingDirectory $Root
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/8] MongoDB is already running on port 27017." -ForegroundColor Green
}

# 2. FastAPI ML Microservice (Port 8001)
if (-not (Test-PortActive -Port 8001)) {
    Write-Host "[2/8] Starting FastAPI ML Microservice (port 8001)..." -ForegroundColor Yellow
    $py = Join-Path $Root "venv_mlops\Scripts\python.exe"
    $cmd = "cmd.exe /c `"`"$py`" -m uvicorn ml_service.app.main:app --host 127.0.0.1 --port 8001 > `"$LogsDir\fastapi.log`" 2> `"$LogsDir\fastapi_err.log`"`""
    Start-DetachedProcess -CommandLine $cmd -WorkingDirectory $Root
    Start-Sleep -Seconds 2
} else {
    Write-Host "[2/8] FastAPI is already running on port 8001." -ForegroundColor Green
}

# 3. Node.js Backend Gateway (Port 3000)
if (-not (Test-PortActive -Port 3000)) {
    Write-Host "[3/8] Starting Node.js Backend Gateway (port 3000)..." -ForegroundColor Yellow
    $backendDir = Join-Path $Root "backend"
    $cmd = "cmd.exe /c `"npm run dev > `"$LogsDir\backend.log`" 2> `"$LogsDir\backend_err.log`"`""
    Start-DetachedProcess -CommandLine $cmd -WorkingDirectory $backendDir
    Start-Sleep -Seconds 3
} else {
    Write-Host "[3/8] Backend is already running on port 3000." -ForegroundColor Green
}

# 4. React Vite Frontend (Port 5173)
if (-not (Test-PortActive -Port 5173)) {
    Write-Host "[4/8] Starting React Frontend UI (port 5173)..." -ForegroundColor Yellow
    $frontendDir = Join-Path $Root "frontend"
    $cmd = "cmd.exe /c `"npm run dev > `"$LogsDir\frontend.log`" 2> `"$LogsDir\frontend_err.log`"`""
    Start-DetachedProcess -CommandLine $cmd -WorkingDirectory $frontendDir
    Start-Sleep -Seconds 3
} else {
    Write-Host "[4/8] Frontend is already running on port 5173." -ForegroundColor Green
}

# 5. MLflow Tracking UI (Port 5000)
if (-not (Test-PortActive -Port 5000)) {
    Write-Host "[5/8] Starting MLflow Tracking UI (port 5000)..." -ForegroundColor Yellow
    $py = Join-Path $Root "venv_mlops\Scripts\python.exe"
    $cmd = "cmd.exe /c `"`"$py`" -m mlflow ui --backend-store-uri sqlite:///D:/DeepBlue4/mlops/mlflow.db --artifacts-destination D:/DeepBlue4/mlops/mlruns --host 127.0.0.1 --port 5000 > `"$LogsDir\mlflow.log`" 2> `"$LogsDir\mlflow_err.log`"`""
    Start-DetachedProcess -CommandLine $cmd -WorkingDirectory $Root
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
    $cmd = "cmd.exe /c `"`"$promExe`" --config.file=`"$promCfg`" --storage.tsdb.path=`"$promData`" > `"$LogsDir\prometheus.log`" 2> `"$LogsDir\prometheus_err.log`"`""
    Start-DetachedProcess -CommandLine $cmd -WorkingDirectory $Root
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
    $cmd = "cmd.exe /c `"`"$grafanaExe`" --config=`"$grafanaCfg`" --homepath=`"$grafanaHome`" > `"$LogsDir\grafana.log`" 2> `"$LogsDir\grafana_err.log`"`""
    Start-DetachedProcess -CommandLine $cmd -WorkingDirectory $grafanaHome
    Start-Sleep -Seconds 2
} else {
    Write-Host "[7/8] Grafana is already running on port 3001." -ForegroundColor Green
}

# 8. Apache Airflow (Port 8080 - WSL)
if (-not (Test-PortActive -Port 8080)) {
    Write-Host "[8/8] Checking Apache Airflow Standalone in WSL (port 8080)..." -ForegroundColor Yellow
    try {
        $cmd = "cmd.exe /c `"wsl.exe -e /home/radhyeshyam_lahoti/run_airflow.sh > `"$LogsDir\airflow.log`" 2> `"$LogsDir\airflow_err.log`"`""
        Start-DetachedProcess -CommandLine $cmd -WorkingDirectory $Root
        Start-Sleep -Seconds 3
    } catch {
        Write-Host "Airflow standalone in WSL skipped or not installed in WSL." -ForegroundColor DarkGray
    }
} else {
    Write-Host "[8/8] Airflow is already running on port 8080." -ForegroundColor Green
}

Write-Host "`nWaiting for all services to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 6

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
