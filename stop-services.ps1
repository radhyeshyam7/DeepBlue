# ==============================================================================
# DEEPBLUE AI - Stop All Services Script
# ==============================================================================

Write-Host "Stopping all DEEPBLUE AI processes..." -ForegroundColor Yellow

# 1. Stop by process names
$processNames = @("uvicorn", "prometheus", "grafana-server", "grafana")
foreach ($name in $processNames) {
    Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# 2. Stop node / vite processes listening on ports
$ports = @(5173, 3000, 8001, 5000, 9090, 3001)
foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $conns) {
            if ($conn.OwningProcess -and $conn.OwningProcess -ne $PID) {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}

# 3. Stop WSL Airflow if running
try {
    wsl.exe -e pkill -f "airflow" 2>$null
} catch {}

# 4. Remove stale prometheus lock if exists
$promLock = "D:\DeepBlue4\monitoring\prometheus-data\lock"
if (Test-Path $promLock) {
    Remove-Item -Path $promLock -Force -ErrorAction SilentlyContinue
}

Write-Host "All DEEPBLUE AI application services and dev servers stopped successfully." -ForegroundColor Green
Write-Host "(MongoDB remains available on port 27017)" -ForegroundColor Cyan
