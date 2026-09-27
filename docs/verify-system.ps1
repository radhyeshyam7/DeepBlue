# DeepBlue System Verification Script
# Run this to verify all components are working

Write-Host "========================================"
Write-Host "DeepBlue System Verification"
Write-Host "========================================"
Write-Host ""

# Check if MongoDB is running
Write-Host "1. Checking MongoDB..."
$mongoRunning = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
if ($mongoRunning.TcpTestSucceeded) {
    Write-Host "   [OK] MongoDB is running on port 27017" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] MongoDB is NOT running" -ForegroundColor Red
    Write-Host "   Start MongoDB: mongod --dbpath /path/to/data"
}
Write-Host ""

# Check if backend dependencies are installed
Write-Host "2. Checking Backend Dependencies..."
if (Test-Path "backend/node_modules") {
    Write-Host "   [OK] Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Backend dependencies NOT installed" -ForegroundColor Red
    Write-Host "   Run: cd backend; npm install"
}
Write-Host ""

# Check if frontend dependencies are installed
Write-Host "3. Checking Frontend Dependencies..."
if (Test-Path "frontend/node_modules") {
    Write-Host "   [OK] Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Frontend dependencies NOT installed" -ForegroundColor Red
    Write-Host "   Run: cd frontend; npm install"
}
Write-Host ""

# Check if key backend files exist
Write-Host "4. Checking Backend Files..."
$backendFiles = @(
    "backend/src/server.js",
    "backend/src/routes/auth.js",
    "backend/src/routes/transaction.js",
    "backend/src/services/pinVerification.js",
    "backend/src/models/User.js",
    "backend/scripts/setup-user-pin.js"
)
$backendOk = $true
foreach ($file in $backendFiles) {
    if (Test-Path $file) {
        Write-Host "   [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] $file MISSING" -ForegroundColor Red
        $backendOk = $false
    }
}
Write-Host ""

# Check if key frontend files exist
Write-Host "5. Checking Frontend Files..."
$frontendFiles = @(
    "frontend/src/App.tsx",
    "frontend/src/components/ProfilePage.tsx",
    "frontend/src/components/TransactionHistory.tsx",
    "frontend/src/api/transactionApi.ts"
)
$frontendOk = $true
foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        Write-Host "   [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] $file MISSING" -ForegroundColor Red
        $frontendOk = $false
    }
}
Write-Host ""

# Check if backend is running
Write-Host "6. Checking Backend Server..."
$backendRunning = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
if ($backendRunning.TcpTestSucceeded) {
    Write-Host "   [OK] Backend is running on port 3000" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Backend is NOT running" -ForegroundColor Red
    Write-Host "   Start: cd backend; npm start"
}
Write-Host ""

# Check if frontend is running
Write-Host "7. Checking Frontend Server..."
$frontendRunning = Test-NetConnection -ComputerName localhost -Port 5173 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
if ($frontendRunning.TcpTestSucceeded) {
    Write-Host "   [OK] Frontend is running on port 5173" -ForegroundColor Green
    Write-Host "   Open: http://localhost:5173"
} else {
    Write-Host "   [FAIL] Frontend is NOT running" -ForegroundColor Red
    Write-Host "   Start: cd frontend; npm run dev"
}
Write-Host ""

# Summary
Write-Host "========================================"
Write-Host "Verification Complete"
Write-Host "========================================"
Write-Host ""

Write-Host "Next Steps:"
Write-Host "1. Setup test user: node backend/scripts/setup-user-pin.js user_001 1234"
Write-Host "2. Open browser: http://localhost:5173"
Write-Host "3. Login as user_001 and test!"
Write-Host ""

Write-Host "Documentation:"
Write-Host "- SYSTEM_READY.md - Complete system overview"
Write-Host "- TEST_COMPLETE_SYSTEM.md - Comprehensive test guide"
Write-Host "- FINAL_IMPLEMENTATION_SUMMARY.md - Implementation details"
Write-Host ""

if ($backendOk -and $frontendOk) {
    Write-Host "System Status: READY" -ForegroundColor Green
} else {
    Write-Host "System Status: NEEDS SETUP" -ForegroundColor Yellow
}
Write-Host ""
