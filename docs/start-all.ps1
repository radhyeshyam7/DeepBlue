# DeepBlue - Start All Services Script (PowerShell)
# This script helps start MongoDB, Redis, Backend, and Frontend

Write-Host "🚀 DeepBlue Startup Script" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js v14+" -ForegroundColor Red
    exit 1
}

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

# Check MongoDB
Write-Host "`nChecking MongoDB..." -ForegroundColor Yellow
try {
    $mongoTest = mongosh --eval "db.version()" --quiet 2>$null
    if ($LASTEXITCODE -eq 0 -or $mongoTest) {
        Write-Host "✅ MongoDB is accessible" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MongoDB may not be running. Starting check..." -ForegroundColor Yellow
        Write-Host "   Please ensure MongoDB is running on port 27017" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  MongoDB check failed. Please verify MongoDB is installed and running" -ForegroundColor Yellow
}

# Check Redis
Write-Host "`nChecking Redis..." -ForegroundColor Yellow
if (Test-Port -Port 6379) {
    Write-Host "✅ Redis is running on port 6379" -ForegroundColor Green
} else {
    Write-Host "⚠️  Redis is not running on port 6379" -ForegroundColor Yellow
    Write-Host "   Backend will work without Redis (degraded mode)" -ForegroundColor Yellow
}

# Check Backend Port
Write-Host "`nChecking Backend port..." -ForegroundColor Yellow
if (Test-Port -Port 3000) {
    Write-Host "⚠️  Port 3000 is already in use" -ForegroundColor Yellow
    Write-Host "   Backend may already be running, or another service is using port 3000" -ForegroundColor Yellow
} else {
    Write-Host "✅ Port 3000 is available" -ForegroundColor Green
}

# Check Frontend Port
Write-Host "`nChecking Frontend port..." -ForegroundColor Yellow
if (Test-Port -Port 5173) {
    Write-Host "⚠️  Port 5173 is already in use" -ForegroundColor Yellow
    Write-Host "   Frontend may already be running, or another service is using port 5173" -ForegroundColor Yellow
} else {
    Write-Host "✅ Port 5173 is available" -ForegroundColor Green
}

Write-Host "`n" -NoNewline
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Starting Services..." -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "📦 Starting Backend..." -ForegroundColor Yellow
Write-Host "   Make sure you've run 'npm install' and 'npm run train-model' in the backend folder" -ForegroundColor Gray

$backendPath = Join-Path $PSScriptRoot "backend"
if (Test-Path $backendPath) {
    Write-Host "   Backend folder found: $backendPath" -ForegroundColor Gray
    
    # Check if node_modules exists
    $nodeModules = Join-Path $backendPath "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Host "   ⚠️  Backend dependencies not installed. Run 'npm install' in backend folder" -ForegroundColor Yellow
    }
    
    # Check if ML model exists
    $modelPath = Join-Path $backendPath "src\models\ml_model.json"
    if (-not (Test-Path $modelPath)) {
        Write-Host "   ⚠️  ML model not found. Run 'npm run train-model' in backend folder" -ForegroundColor Yellow
    }
    
    Write-Host "`n   To start backend, run:" -ForegroundColor Cyan
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor White
} else {
    Write-Host "   ❌ Backend folder not found" -ForegroundColor Red
}

Write-Host ""

# Start Frontend
Write-Host "🎨 Starting Frontend..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "frontend"
if (Test-Path $frontendPath) {
    Write-Host "   Frontend folder found: $frontendPath" -ForegroundColor Gray
    
    # Check if node_modules exists
    $nodeModules = Join-Path $frontendPath "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Host "   ⚠️  Frontend dependencies not installed. Run 'npm install' in frontend folder" -ForegroundColor Yellow
    }
    
    Write-Host "`n   To start frontend, run:" -ForegroundColor Cyan
    Write-Host "   cd frontend" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor White
} else {
    Write-Host "   ❌ Frontend folder not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Setup Instructions" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Install Backend Dependencies:" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   npm install" -ForegroundColor White
Write-Host ""
Write-Host "2. Train ML Model (first time only):" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   npm run train-model" -ForegroundColor White
Write-Host ""
Write-Host "3. Install Frontend Dependencies:" -ForegroundColor Yellow
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm install" -ForegroundColor White
Write-Host ""
Write-Host "4. Start Backend (in one terminal):" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "5. Start Frontend (in another terminal):" -ForegroundColor Yellow
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "URLs" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Backend API:  http://localhost:3000" -ForegroundColor Green
Write-Host "Frontend UI:  http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "For detailed instructions, see STARTUP_GUIDE.md" -ForegroundColor Gray
Write-Host ""
