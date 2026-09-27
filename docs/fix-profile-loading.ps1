Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing Profile/History Loading Issue" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking if backend is running..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   [OK] Backend is running on port 3000" -ForegroundColor Green
    Write-Host "   MongoDB: $($health.mongodb)" -ForegroundColor Cyan
} catch {
    Write-Host "   [FAIL] Backend is NOT running" -ForegroundColor Red
    Write-Host ""
    Write-Host "   To fix:" -ForegroundColor Yellow
    Write-Host "   1. Open new terminal" -ForegroundColor White
    Write-Host "   2. cd backend" -ForegroundColor White
    Write-Host "   3. npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "   Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "2. Backend is healthy!" -ForegroundColor Green
Write-Host ""

# Check if frontend is running
Write-Host "3. Checking if frontend is running..." -ForegroundColor Yellow
try {
    $frontend = Test-NetConnection -ComputerName localhost -Port 5173 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($frontend.TcpTestSucceeded) {
        Write-Host "   [OK] Frontend is running on port 5173" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Frontend is NOT running" -ForegroundColor Yellow
        Write-Host "   Start frontend: cd frontend; npm run dev" -ForegroundColor White
    }
} catch {
    Write-Host "   [WARN] Could not check frontend status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps to Fix Profile/History" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Open browser: http://localhost:5173" -ForegroundColor White
Write-Host ""

Write-Host "2. Open browser console (Press F12)" -ForegroundColor White
Write-Host ""

Write-Host "3. Clear auth state by running this in console:" -ForegroundColor White
Write-Host "   localStorage.removeItem('deepblue-auth')" -ForegroundColor Cyan
Write-Host ""

Write-Host "4. Refresh the page (F5)" -ForegroundColor White
Write-Host ""

Write-Host "5. Click 'Sign Up' and create new account:" -ForegroundColor White
Write-Host "   - Name: Your Name" -ForegroundColor Cyan
Write-Host "   - Email: your@email.com" -ForegroundColor Cyan
Write-Host "   - Password: 1234 (4 digits)" -ForegroundColor Cyan
Write-Host ""

Write-Host "6. After signup, go to Profile tab" -ForegroundColor White
Write-Host "   → Should load successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "7. Go to History tab" -ForegroundColor White
Write-Host "   → Should load successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Debug Info" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "If profile still doesn't load, check console for:" -ForegroundColor Yellow
Write-Host "- 'ProfilePage: Loading profile for user: <user_id>'" -ForegroundColor White
Write-Host "- 'ProfilePage: Response status: 200'" -ForegroundColor White
Write-Host "- 'ProfilePage: Profile loaded: { ... }'" -ForegroundColor White
Write-Host ""

Write-Host "If you see errors, check:" -ForegroundColor Yellow
Write-Host "- Backend is running: http://localhost:3000/health" -ForegroundColor White
Write-Host "- MongoDB is running" -ForegroundColor White
Write-Host "- User exists in database" -ForegroundColor White
Write-Host ""

Write-Host "For more help, see: PROFILE_HISTORY_FIX.md" -ForegroundColor Cyan
Write-Host ""
