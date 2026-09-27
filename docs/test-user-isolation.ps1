# Test User Isolation Script
# Verifies that users are properly isolated

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing User Isolation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

# Test 1: Register User A
Write-Host "Test 1: Register User A" -ForegroundColor Yellow
$userA = @{
    user_id = "alice_test_$(Get-Date -Format 'yyyyMMddHHmmss')"
    name = "Alice Test"
    email = "alice@test.com"
    phone = "+1234567890"
    pin = "1234"
} | ConvertTo-Json

try {
    $responseA = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $userA -ContentType "application/json"
    Write-Host "   [OK] User A registered: $($responseA.user.user_id)" -ForegroundColor Green
    $userAId = $responseA.user.user_id
} catch {
    Write-Host "   [FAIL] Failed to register User A" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Create transaction for User A
Write-Host "Test 2: Create transaction for User A" -ForegroundColor Yellow
$txnA = @{
    user_id = $userAId
    amount = 500
    payee_id = "merchant_001"
    intent_type = "purchase"
} | ConvertTo-Json

try {
    $txnResponseA = Invoke-RestMethod -Uri "$baseUrl/transaction/intent" -Method Post -Body $txnA -ContentType "application/json"
    Write-Host "   [OK] Transaction created: $($txnResponseA.transaction_id)" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Failed to create transaction for User A" -ForegroundColor Red
}
Write-Host ""

# Test 3: Register User B
Write-Host "Test 3: Register User B" -ForegroundColor Yellow
$userB = @{
    user_id = "bob_test_$(Get-Date -Format 'yyyyMMddHHmmss')"
    name = "Bob Test"
    email = "bob@test.com"
    phone = "+0987654321"
    pin = "5678"
} | ConvertTo-Json

try {
    $responseB = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $userB -ContentType "application/json"
    Write-Host "   [OK] User B registered: $($responseB.user.user_id)" -ForegroundColor Green
    $userBId = $responseB.user.user_id
} catch {
    Write-Host "   [FAIL] Failed to register User B" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 4: Check User A's profile
Write-Host "Test 4: Check User A's profile" -ForegroundColor Yellow
try {
    $profileA = Invoke-RestMethod -Uri "$baseUrl/auth/user/$userAId" -Method Get
    if ($profileA.user.name -eq "Alice Test") {
        Write-Host "   [OK] User A profile correct: $($profileA.user.name)" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] User A profile incorrect: $($profileA.user.name)" -ForegroundColor Red
    }
} catch {
    Write-Host "   [FAIL] Failed to get User A profile" -ForegroundColor Red
}
Write-Host ""

# Test 5: Check User B's profile
Write-Host "Test 5: Check User B's profile" -ForegroundColor Yellow
try {
    $profileB = Invoke-RestMethod -Uri "$baseUrl/auth/user/$userBId" -Method Get
    if ($profileB.user.name -eq "Bob Test") {
        Write-Host "   [OK] User B profile correct: $($profileB.user.name)" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] User B profile incorrect: $($profileB.user.name)" -ForegroundColor Red
    }
} catch {
    Write-Host "   [FAIL] Failed to get User B profile" -ForegroundColor Red
}
Write-Host ""

# Test 6: Check User A's transaction history
Write-Host "Test 6: Check User A's transaction history" -ForegroundColor Yellow
try {
    $historyA = Invoke-RestMethod -Uri "$baseUrl/transaction/history/$userAId" -Method Get
    $countA = $historyA.transactions.Count
    Write-Host "   [OK] User A has $countA transaction(s)" -ForegroundColor Green
    if ($countA -gt 0) {
        Write-Host "   Transaction: $($historyA.transactions[0].payee) - `$$($historyA.transactions[0].amount)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   [FAIL] Failed to get User A history" -ForegroundColor Red
}
Write-Host ""

# Test 7: Check User B's transaction history (should be empty)
Write-Host "Test 7: Check User B's transaction history" -ForegroundColor Yellow
try {
    $historyB = Invoke-RestMethod -Uri "$baseUrl/transaction/history/$userBId" -Method Get
    $countB = $historyB.transactions.Count
    if ($countB -eq 0) {
        Write-Host "   [OK] User B has 0 transactions (correct isolation)" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] User B has $countB transactions (should be 0)" -ForegroundColor Red
    }
} catch {
    Write-Host "   [FAIL] Failed to get User B history" -ForegroundColor Red
}
Write-Host ""

# Test 8: Create transaction for User B
Write-Host "Test 8: Create transaction for User B" -ForegroundColor Yellow
$txnB = @{
    user_id = $userBId
    amount = 1000
    payee_id = "merchant_002"
    intent_type = "purchase"
} | ConvertTo-Json

try {
    $txnResponseB = Invoke-RestMethod -Uri "$baseUrl/transaction/intent" -Method Post -Body $txnB -ContentType "application/json"
    Write-Host "   [OK] Transaction created: $($txnResponseB.transaction_id)" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Failed to create transaction for User B" -ForegroundColor Red
}
Write-Host ""

# Test 9: Verify User B now has 1 transaction
Write-Host "Test 9: Verify User B now has 1 transaction" -ForegroundColor Yellow
try {
    $historyB2 = Invoke-RestMethod -Uri "$baseUrl/transaction/history/$userBId" -Method Get
    $countB2 = $historyB2.transactions.Count
    if ($countB2 -eq 1) {
        Write-Host "   [OK] User B has 1 transaction" -ForegroundColor Green
        Write-Host "   Transaction: $($historyB2.transactions[0].payee) - `$$($historyB2.transactions[0].amount)" -ForegroundColor Cyan
    } else {
        Write-Host "   [FAIL] User B has $countB2 transactions (should be 1)" -ForegroundColor Red
    }
} catch {
    Write-Host "   [FAIL] Failed to get User B history" -ForegroundColor Red
}
Write-Host ""

# Test 10: Verify User A still has only their transaction
Write-Host "Test 10: Verify User A still has only their transaction" -ForegroundColor Yellow
try {
    $historyA2 = Invoke-RestMethod -Uri "$baseUrl/transaction/history/$userAId" -Method Get
    $countA2 = $historyA2.transactions.Count
    Write-Host "   [OK] User A has $countA2 transaction(s)" -ForegroundColor Green
    
    # Check that User A doesn't have User B's transaction
    $hasUserBTxn = $historyA2.transactions | Where-Object { $_.payee -eq "merchant_002" }
    if ($null -eq $hasUserBTxn) {
        Write-Host "   [OK] User A does NOT have User B's transaction (correct isolation)" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] User A has User B's transaction (isolation broken!)" -ForegroundColor Red
    }
} catch {
    Write-Host "   [FAIL] Failed to get User A history" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "User A ID: $userAId" -ForegroundColor Cyan
Write-Host "User B ID: $userBId" -ForegroundColor Cyan
Write-Host ""
Write-Host "If all tests passed, user isolation is working correctly!" -ForegroundColor Green
Write-Host ""
