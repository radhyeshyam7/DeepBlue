# Phase 2 Testing Script for PowerShell (Windows)
# Usage: .\test-phase2.ps1

$BaseUrl = "http://localhost:3000"

Write-Host "🧪 Testing Phase 2 System" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1️⃣ Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    Write-Host "✅ Server is running" -ForegroundColor Green
    $health | ConvertTo-Json
} catch {
    Write-Host "❌ Server not responding" -ForegroundColor Red
    exit 1
}

# Test 2: ML Health Check
Write-Host "`n2️⃣ ML Health Check..." -ForegroundColor Yellow
try {
    $mlHealth = Invoke-RestMethod -Uri "$BaseUrl/ml/health" -Method Get
    Write-Host "✅ ML service is ready" -ForegroundColor Green
    $mlHealth | ConvertTo-Json
} catch {
    Write-Host "⚠️  ML service not available (will use fallback)" -ForegroundColor Yellow
}

# Test 3: High Risk Transaction
Write-Host "`n3️⃣ High Risk Transaction (New User + Large Amount)..." -ForegroundColor Yellow
$intentBody = @{
    user_id = "test_user_001"
    amount = 75000
    payee_id = "unknown_merchant_001"
    intent_type = "purchase"
    behavioral_signals = @{
        hesitation_time_ms = 5000
        amount_edit_count = 8
        confirmation_delay_ms = 7000
    }
} | ConvertTo-Json -Depth 3

try {
    $intentResponse = Invoke-RestMethod -Uri "$BaseUrl/transaction/intent" `
        -Method Post -Body $intentBody -ContentType "application/json"
    
    $txId = $intentResponse.transaction_id
    Write-Host "✅ Transaction created: $txId" -ForegroundColor Green
    
    # Get decision
    Write-Host "`n4️⃣ Risk Decision..." -ForegroundColor Yellow
    $decisionBody = @{
        transaction_id = $txId
    } | ConvertTo-Json
    
    $decision = Invoke-RestMethod -Uri "$BaseUrl/transaction/decision" `
        -Method Post -Body $decisionBody -ContentType "application/json"
    
    Write-Host "`n📊 Decision Results:" -ForegroundColor Cyan
    Write-Host "Risk Level: $($decision.risk_level)" -ForegroundColor $(if ($decision.risk_level -eq "HIGH") { "Red" } elseif ($decision.risk_level -eq "MEDIUM") { "Yellow" } else { "Green" })
    Write-Host "Action: $($decision.action)" -ForegroundColor Cyan
    Write-Host "ML Anomaly Score: $($decision.ml_anomaly_score)" -ForegroundColor Cyan
    Write-Host "Risk Score: $($decision.risk_score)" -ForegroundColor Cyan
    Write-Host "Reason Codes: $($decision.reason_codes -join ', ')" -ForegroundColor Cyan
    
    if ($decision.ml_top_features) {
        Write-Host "ML Top Features: $($decision.ml_top_features -join ', ')" -ForegroundColor Cyan
    }
    
    Write-Host "`nFull Response:" -ForegroundColor Cyan
    $decision | ConvertTo-Json -Depth 5
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    $_.Exception.Response | Format-List
}

# Test 4: Low Risk Transaction
Write-Host "`n5️⃣ Low Risk Transaction (Regular User)..." -ForegroundColor Yellow
Write-Host "Creating baseline (5 transactions)..." -ForegroundColor Gray

for ($i = 1; $i -le 5; $i++) {
    $lowRiskBody = @{
        user_id = "regular_user_001"
        amount = 1000
        payee_id = "known_payee_001"
        intent_type = "purchase"
    } | ConvertTo-Json
    
    try {
        $lowRiskResponse = Invoke-RestMethod -Uri "$BaseUrl/transaction/intent" `
            -Method Post -Body $lowRiskBody -ContentType "application/json"
        Write-Host "  Transaction $i created" -ForegroundColor Gray
    } catch {
        Write-Host "  ⚠️  Transaction $i failed" -ForegroundColor Yellow
    }
    Start-Sleep -Milliseconds 100
}

# Submit 6th transaction (should be LOW risk)
Write-Host "`nSubmitting 6th transaction (should be LOW risk)..." -ForegroundColor Gray
$lowRiskBody = @{
    user_id = "regular_user_001"
    amount = 1200
    payee_id = "known_payee_001"
    intent_type = "purchase"
} | ConvertTo-Json

try {
    $lowRiskResponse = Invoke-RestMethod -Uri "$BaseUrl/transaction/intent" `
        -Method Post -Body $lowRiskBody -ContentType "application/json"
    
    $lowRiskTxId = $lowRiskResponse.transaction_id
    
    $lowRiskDecisionBody = @{
        transaction_id = $lowRiskTxId
    } | ConvertTo-Json
    
    $lowRiskDecision = Invoke-RestMethod -Uri "$BaseUrl/transaction/decision" `
        -Method Post -Body $lowRiskDecisionBody -ContentType "application/json"
    
    Write-Host "`n📊 Low Risk Decision:" -ForegroundColor Cyan
    Write-Host "Risk Level: $($lowRiskDecision.risk_level)" -ForegroundColor Green
    Write-Host "Action: $($lowRiskDecision.action)" -ForegroundColor Green
    Write-Host "ML Anomaly Score: $($lowRiskDecision.ml_anomaly_score)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n✅ Testing Complete!" -ForegroundColor Green
Write-Host "`n💡 Tip: Check the decision responses above to see ML contributions!" -ForegroundColor Yellow
