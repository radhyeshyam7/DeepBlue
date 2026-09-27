# Profile & History Loading Fix

## Problem

Profile and History pages are stuck on "Loading..." and never load.

---

## Root Cause

The backend server is **not running**. When the frontend tries to fetch data, the requests fail silently.

---

## Solution

### Step 1: Start Backend Server

```bash
cd backend
npm start
```

**Expected output:**
```
MongoDB connected successfully
🚀 Server running on port 3000
📡 Health check: http://localhost:3000/health
```

**If MongoDB connection fails:**
```bash
# Start MongoDB first
mongod --dbpath /path/to/data
```

---

### Step 2: Verify Backend is Running

```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "OK",
  "timestamp": "2026-02-08T...",
  "mongodb": "connected"
}
```

---

### Step 3: Clear Browser Cache and Re-login

The auth state in localStorage might have a user that doesn't exist in MongoDB.

**In browser console:**
```javascript
// Clear auth state
localStorage.removeItem('deepblue-auth');

// Refresh page
location.reload();
```

---

### Step 4: Register New User

1. Click "Sign Up"
2. Fill in details:
   - Name: Your Name
   - Email: your@email.com
   - Phone: (optional)
   - Password: 1234 (4 digits, will be used as PIN)
3. Complete signup

---

### Step 5: Verify Profile Loads

1. Go to Profile tab
2. Should see your profile data
3. Check browser console for logs:

```
ProfilePage: Loading profile for user: <user_id>
ProfilePage: Response status: 200
ProfilePage: Profile loaded: { ... }
```

---

### Step 6: Verify History Loads

1. Go to History tab
2. Should see empty history (or your transactions)
3. Check browser console for logs:

```
TransactionHistory: Loading transactions for user: <user_id>
TransactionHistory: Response: { success: true, transactions: [] }
TransactionHistory: Loaded 0 transactions
```

---

## Debug Checklist

### ✅ Backend Running?
```bash
curl http://localhost:3000/health
```
- ✅ Returns JSON → Backend is running
- ❌ Connection refused → Start backend: `cd backend && npm start`

### ✅ MongoDB Running?
```bash
# Check if MongoDB is running
# Windows: Check Task Manager for mongod.exe
# Mac/Linux: ps aux | grep mongod
```
- ✅ Process running → MongoDB is running
- ❌ Not running → Start MongoDB: `mongod --dbpath /path/to/data`

### ✅ User Logged In?
**Browser console:**
```javascript
const auth = JSON.parse(localStorage.getItem('deepblue-auth'));
console.log('User ID:', auth?.state?.user?.id);
```
- ✅ Shows user_id → User is logged in
- ❌ null or undefined → Login/Signup again

### ✅ User Exists in MongoDB?
```bash
# Replace <user_id> with actual user_id from localStorage
curl http://localhost:3000/auth/user/<user_id>
```
- ✅ Returns user data → User exists
- ❌ 404 Not Found → User doesn't exist, signup again

---

## Common Issues

### Issue 1: Backend Not Running
**Symptom:** Profile/History stuck on "Loading..."

**Fix:**
```bash
cd backend
npm start
```

### Issue 2: MongoDB Not Running
**Symptom:** Backend shows "MongoDB connection error"

**Fix:**
```bash
# Start MongoDB
mongod --dbpath /path/to/data

# Or if using MongoDB service
# Windows: net start MongoDB
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Issue 3: User Doesn't Exist in MongoDB
**Symptom:** Profile shows "User not found" error

**Fix:**
```bash
# Option 1: Signup again through UI
# Option 2: Create user manually
node backend/scripts/setup-user-pin.js <user_id> 1234
```

### Issue 4: CORS Error
**Symptom:** Console shows "CORS policy" error

**Fix:** Backend already has CORS enabled, but verify:
```javascript
// backend/src/server.js should have:
app.use(cors());
```

### Issue 5: Wrong User ID
**Symptom:** Profile loads but shows wrong user

**Fix:**
```javascript
// Clear localStorage and re-login
localStorage.removeItem('deepblue-auth');
location.reload();
```

---

## Testing Flow

### Complete Test:

```bash
# 1. Start MongoDB (if not running)
mongod --dbpath /path/to/data

# 2. Start Backend
cd backend
npm start

# 3. Start Frontend (in new terminal)
cd frontend
npm run dev

# 4. Open browser
# http://localhost:5173

# 5. Open browser console (F12)

# 6. Clear auth state
localStorage.removeItem('deepblue-auth');
location.reload();

# 7. Signup
# - Name: Test User
# - Email: test@example.com
# - Password: 1234

# 8. Go to Profile
# Should load successfully ✅

# 9. Go to History
# Should load successfully ✅

# 10. Check console
# Should see:
# ProfilePage: Loading profile for user: test_1234567890
# ProfilePage: Response status: 200
# ProfilePage: Profile loaded: { ... }
```

---

## Quick Fix Script

Save this as `fix-profile-loading.ps1`:

```powershell
Write-Host "Fixing Profile/History Loading..." -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking backend..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 2
    Write-Host "   ✓ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Backend is NOT running" -ForegroundColor Red
    Write-Host "   → Start backend: cd backend; npm start" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "2. Backend is healthy!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open browser: http://localhost:5173" -ForegroundColor White
Write-Host "2. Open console (F12)" -ForegroundColor White
Write-Host "3. Run: localStorage.removeItem('deepblue-auth')" -ForegroundColor White
Write-Host "4. Refresh page" -ForegroundColor White
Write-Host "5. Signup/Login again" -ForegroundColor White
Write-Host "6. Go to Profile → Should load ✓" -ForegroundColor White
Write-Host ""
```

Run it:
```powershell
.\fix-profile-loading.ps1
```

---

## Summary

**Problem:** Profile and History stuck loading

**Root Cause:** Backend server not running

**Solution:**
1. ✅ Start backend: `cd backend && npm start`
2. ✅ Clear localStorage: `localStorage.removeItem('deepblue-auth')`
3. ✅ Signup/Login again
4. ✅ Profile and History should load

**Status:** Ready to test! 🚀

---

## Verification

After following the steps above:

1. **Profile Page:**
   - ✅ Shows user name
   - ✅ Shows email
   - ✅ Shows account stats
   - ✅ Can edit information
   - ✅ No "Loading..." stuck

2. **History Page:**
   - ✅ Shows transaction list (or empty)
   - ✅ Shows stats
   - ✅ Can refresh
   - ✅ No "Loading..." stuck

3. **Console:**
   - ✅ No errors
   - ✅ Shows debug logs
   - ✅ Shows successful API calls

**Everything should work now!** ✅
