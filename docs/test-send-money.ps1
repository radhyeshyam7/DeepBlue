# Test: Send 2 currency to another person

Write-Host "`n=== Testing: Send 2 Currency ===" -ForegroundColor Cyan

# Step 1: Submit transaction intent
Write-Host "`n[Step 1] Submitting transaction intent..." -ForegroundColor Yellow

$transactionIntent = @{
    user_id = "my_user_001"
    amount = 2
    payee_id = "friend@upi"
    intent_type = "purchase"
    behavioral_signals = @{
        hesitation_time_ms = 500
        amount_edit_count = 0
        confirmation_delay_ms = 1000
    }
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor Gray
Write-Host $transactionIntent -ForegroundColor White

$intentResponse = Invoke-RestMethod -Uri "http://localhost:3000/transaction/intent" `
    -Method Post -Body $transactionIntent -ContentType "application/json"

Write-Host "`n✅ Transaction Intent Submitted" -ForegroundColor Green
Write-Host "Transaction ID: $($intentResponse.transaction_id)" -ForegroundColor Cyan
Write-Host "Status: $($intentResponse.status)" -ForegroundColor White

# Step 2: Get risk decision
Write-Host "`n[Step 2] Getting risk decision from ML model..." -ForegroundColor Yellow

$decisionBody = @{
    transaction_id = $intentResponse.transaction_id
} | ConvertTo-Json

$decision = Invoke-RestMethod -Uri "http://localhost:3000/transaction/decision" `
    -Method Post -Body $decisionBody -ContentType "application/json"

Write-Host "`n=== RISK ANALYSIS RESULT ===" -ForegroundColor Cyan
Write-Host "Risk Level: $($decision.risk_level)" -ForegroundColor $(
    switch($decision.risk_level) {
        "HIGH" { "Red" }
        "MEDIUM" { "Yellow" }
        "LOW" { "Green" }
        default { "White" }
    }
)
Write-Host "Action: $($decision.action)" -ForegroundColor White
Write-Host "Reason Codes: $($decision.reason_codes -join ', ')" -ForegroundColor Gray

if ($decision.ml_score) {
    Write-Host "`nML Anomaly Score: $($decision.ml_score)" -ForegroundColor Magenta
}

if ($decision.features) {
    Write-Host "`nFeatures Analyzed:" -ForegroundColor Yellow
    $decision.features | ConvertTo-Json | Write-Host -ForegroundColor Gray
}

# Step 3: Submit feedback (user proceeded with transaction)
Write-Host "`n[Step 3] Submitting user feedback..." -ForegroundColor Yellow

$feedbackBody = @{
    transaction_id = $intentResponse.transaction_id
    user_action = "PROCEEDED"
} | ConvertTo-Json

$feedback = Invoke-RestMethod -Uri "http://localhost:3000/transaction/feedback" `
    -Method Post -Body $feedbackBody -ContentType "application/json"

Write-Host "✅ Feedback submitted: $($feedback.status)" -ForegroundColor Green

Write-Host "`n=== Test Complete! ===" -ForegroundColor Cyan
