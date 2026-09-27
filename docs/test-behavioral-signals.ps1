#!/usr/bin/env pwsh
<#
Test the behavioral signals endpoint
Sends a complete signal batch to the API
#>

$transactionId = "txn_test_$(Get-Date -Format 'yyyyMMddHHmmss')_$(Get-Random -Minimum 1000 -Maximum 9999)"
$sessionId = "session_test_$(Get-Random -Minimum 100000 -Maximum 999999)"

# First create a transaction
Write-Host "Creating test transaction..." -ForegroundColor Cyan

$txnPayload = @{
    user_id = "test_user_001"
    payee = "payee@upi"
    amount = 5000
    intent_type = "refund"
} | ConvertTo-Json

$txnResponse = Invoke-RestMethod `
    -Uri "http://localhost:3000/transaction/intent" `
    -Method POST `
    -ContentType "application/json" `
    -Body $txnPayload

$txnId = $txnResponse.transaction_id
Write-Host "✓ Transaction created: $txnId" -ForegroundColor Green

# Send behavioral signals
Write-Host "Sending behavioral signals..." -ForegroundColor Cyan

$signalPayload = @{
    transaction_id = $txnId
    session_id = $sessionId
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
        },
        @{
            event_type = "amount_changed"
            timestamp = [int64]((Get-Date).AddSeconds(-30).ToUniversalTime().Subtract([datetime]"1970-01-01")).TotalMilliseconds
            data = @{ new_amount = 5000; previous_amount = 5000 }
        },
        @{
            event_type = "intent_selected"
            timestamp = [int64]((Get-Date).AddSeconds(-20).ToUniversalTime().Subtract([datetime]"1970-01-01")).TotalMilliseconds
            data = @{ intent = "refund"; previous_intent = "" }
        },
        @{
            event_type = "review_started"
            timestamp = [int64]((Get-Date).AddSeconds(-10).ToUniversalTime().Subtract([datetime]"1970-01-01")).TotalMilliseconds
            data = @{ timestamp = [int64]((Get-Date).AddSeconds(-10).ToUniversalTime().Subtract([datetime]"1970-01-01")).TotalMilliseconds }
        },
        @{
            event_type = "back_to_edit"
            timestamp = [int64]((Get-Date).AddSeconds(-8).ToUniversalTime().Subtract([datetime]"1970-01-01")).TotalMilliseconds
            data = @{ field = "amount"; edit_cycle_count = 1 }
        },
        @{
            event_type = "confirmation_clicked"
            timestamp = [int64](Get-Date -Format "yyyy-MM-dd HH:mm:ss").ToUniversalTime().Subtract([datetime]"1970-01-01").TotalMilliseconds
            data = @{ confirmation_delay_ms = 5000 }
        }
    )
    frontend_version = "1.0.0"
    user_agent = "Test-Client/1.0"
} | ConvertTo-Json -Depth 10

Write-Host "Payload:" -ForegroundColor Yellow
Write-Host $signalPayload

try {
    $signalResponse = Invoke-RestMethod `
        -Uri "http://localhost:3000/signals" `
        -Method POST `
        -ContentType "application/json" `
        -Body $signalPayload

    Write-Host "`n✓ Signals submitted successfully!" -ForegroundColor Green
    Write-Host $signalResponse | ConvertTo-Json | Out-String

    # Retrieve the signals
    Write-Host "`nRetrieving signals..." -ForegroundColor Cyan
    $retrieveResponse = Invoke-RestMethod `
        -Uri "http://localhost:3000/signals/$txnId" `
        -Method GET

    Write-Host "✓ Signals retrieved successfully!" -ForegroundColor Green
    Write-Host $retrieveResponse | ConvertTo-Json | Out-String

} catch {
    Write-Host "✗ Error submitting signals:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.Exception.Response.Content
}

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Transaction ID:  $txnId" -ForegroundColor Green
Write-Host "Session ID:      $sessionId" -ForegroundColor Green
Write-Host "Signals sent:    10" -ForegroundColor Green
Write-Host "Events sent:     6" -ForegroundColor Green
Write-Host "`nBackend:  http://localhost:3000" -ForegroundColor Blue
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Blue
