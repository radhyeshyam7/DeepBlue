#!/usr/bin/env pwsh

Write-Host "Testing Behavioral Signals System..." -ForegroundColor Cyan

# Generate unique IDs
$randomUser = "test_user_$(Get-Random -Minimum 10000 -Maximum 99999)"
$randomEmail = "$randomUser@test.com"

Write-Host "Creating transaction..." -ForegroundColor Yellow
$txnPayload = @{
    user_id = $randomUser
    user_email = $randomEmail
    payee_id = "payee@upi"
    amount = 5000
    intent_type = "refund"
} | ConvertTo-Json

try {
    $txnResponse = Invoke-RestMethod -Uri "http://localhost:3000/transaction/intent" -Method POST -ContentType "application/json" -Body $txnPayload -TimeoutSec 10
    $txnId = $txnResponse.transaction_id
    Write-Host "✅ Transaction created: $txnId" -ForegroundColor Green
} catch {
    Write-Host "❌ Transaction creation failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nSending behavioral signals..." -ForegroundColor Yellow
$signalPayload = @{
    transaction_id = $txnId
    session_id = "session_test_123"
    timestamp = [int64]((Get-Date).AddSeconds(-5).ToUniversalTime().Subtract([datetime]"1970-01-01")).TotalMilliseconds
    signals = @{
        amount_edit_count = 2
        payee_change_count = 0
        intent_change_count = 1
        edit_cycle_count = 1
        confirmation_delay_ms = 5000
        total_interaction_time_ms = 35000
        hesitation_score = 0.35
        warning_shown_count = 0
        warning_ignored_count = 0
        device_id = "device_test_123"
    }
    events = @(
        @{
            event_type = "amount_changed"
            timestamp = [int64]((Get-Date).AddSeconds(-35).ToUniversalTime().Subtract([datetime]"1970-01-01")).TotalMilliseconds
            data = @{ new_amount = 5000; previous_amount = 0 }
        }
    )
    frontend_version = "1.0.0"
} | ConvertTo-Json -Depth 10

try {
    $signalResponse = Invoke-RestMethod -Uri "http://localhost:3000/signals/behavioral-signals" -Method POST -ContentType "application/json" -Body $signalPayload -TimeoutSec 10
    Write-Host "✅ Signals submitted successfully!" -ForegroundColor Green
    Write-Host "Response: $($signalResponse | ConvertTo-Json)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Signal submission failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Test Complete - Behavioral signal system is working!" -ForegroundColor Green
