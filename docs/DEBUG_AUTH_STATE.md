# Debug Auth State

## How to Check Auth State

Open browser console and run:

```javascript
// Check localStorage
console.log('Auth Store:', localStorage.getItem('deepblue-auth'));

// Parse it
const authData = JSON.parse(localStorage.getItem('deepblue-auth'));
console.log('User:', authData?.state?.user);
console.log('User ID:', authData?.state?.user?.id);
console.log('Is Authenticated:', authData?.state?.isAuthenticated);
```

## Common Issues

### Issue 1: User ID is undefined
**Symptom:** Profile/History stuck on "Loading..."
**Cause:** User object doesn't have `id` field
**Fix:** Clear localStorage and re-login

```javascript
localStorage.removeItem('deepblue-auth');
// Then refresh page and login again
```

### Issue 2: User exists in localStorage but not in MongoDB
**Symptom:** Profile shows "User not found" error
**Cause:** User was created in frontend but not in backend
**Fix:** Register the user in backend

```bash
# Create user in MongoDB
node backend/scripts/setup-user-pin.js <user_id> 1234
```

### Issue 3: Backend not running
**Symptom:** Profile/History stuck on "Loading..."
**Cause:** Backend server not started
**Fix:** Start backend

```bash
cd backend && npm start
```

## Debug Steps

### Step 1: Check if user is logged in
```javascript
const authData = JSON.parse(localStorage.getItem('deepblue-auth'));
console.log('Is Authenticated:', authData?.state?.isAuthenticated);
console.log('User:', authData?.state?.user);
```

**Expected:** 
- `isAuthenticated: true`
- `user: { id: "...", name: "...", email: "..." }`

**If user is null or id is undefined:**
- Clear localStorage: `localStorage.removeItem('deepblue-auth')`
- Refresh page
- Login/Signup again

### Step 2: Check if backend is running
```bash
curl http://localhost:3000/health
```

**Expected:** 
```json
{
  "status": "OK",
  "mongodb": "connected"
}
```

**If connection refused:**
- Start backend: `cd backend && npm start`

### Step 3: Check if user exists in MongoDB
```bash
# Get user ID from localStorage
# Then check if user exists
curl http://localhost:3000/auth/user/<user_id>
```

**Expected:**
```json
{
  "success": true,
  "user": {
    "user_id": "...",
    "name": "...",
    "email": "..."
  }
}
```

**If 404 Not Found:**
- User doesn't exist in MongoDB
- Register user: `node backend/scripts/setup-user-pin.js <user_id> 1234`
- Or signup again through UI

### Step 4: Check browser console
Open browser DevTools → Console tab

Look for these logs:
```
ProfilePage: Loading profile for user: <user_id>
ProfilePage: Response status: 200
ProfilePage: Profile loaded: { ... }
```

**If you see:**
- `ProfilePage: No user ID found` → User not logged in properly
- `ProfilePage: Response status: 404` → User doesn't exist in MongoDB
- `ProfilePage: Response status: 500` → Backend error

### Step 5: Check network tab
Open browser DevTools → Network tab

Look for request to:
- `http://localhost:3000/auth/user/<user_id>`

**Check:**
- Status code (should be 200)
- Response body (should have user data)
- Request URL (should have correct user_id)

## Quick Fix

If profile/history are stuck loading:

```javascript
// 1. Clear auth state
localStorage.removeItem('deepblue-auth');

// 2. Refresh page
location.reload();

// 3. Signup with new account
// - Name: Test User
// - Email: test@example.com
// - Password: 1234 (will be used as PIN)

// 4. Check profile again
```

## Manual Test

```bash
# 1. Start backend
cd backend
npm start

# 2. Create test user
node scripts/setup-user-pin.js test_user_123 1234

# 3. In browser console, set auth state manually
localStorage.setItem('deepblue-auth', JSON.stringify({
  state: {
    isAuthenticated: true,
    user: {
      id: 'test_user_123',
      name: 'Test User',
      email: 'test@example.com',
      accountAge: new Date(),
      usageContext: 'personal'
    }
  },
  version: 0
}));

# 4. Refresh page
# 5. Go to Profile → Should load successfully
```

## Expected Console Output

When profile loads successfully:

```
ProfilePage: Loading profile for user: test_user_123
ProfilePage: Response status: 200
ProfilePage: Profile loaded: {
  user_id: "test_user_123",
  name: "Test User",
  email: "test@example.com",
  has_pin: true,
  total_transactions: 0
}
```

When history loads successfully:

```
TransactionHistory: Loading transactions for user: test_user_123
TransactionHistory: Response: {
  success: true,
  transactions: [],
  pagination: { total: 0, limit: 50, skip: 0, hasMore: false }
}
TransactionHistory: Loaded 0 transactions
```
