# User Setup Guide

## Quick Start for Testing

### Option 1: Create New User (Recommended)

1. **Start the application:**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm start

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

2. **Sign up as new user:**
   - Open http://localhost:5173
   - Click "Sign Up"
   - Fill in details:
     - Name: Your Name
     - Email: your@email.com
     - Phone: +1234567890
     - PIN: 1234 (or any 4 digits)
   - Click "Create Account"

3. **Your PIN is now set!**
   - PIN is hashed and stored in MongoDB
   - You can now make transactions
   - PIN will be verified against MongoDB

---

### Option 2: Setup PIN for Existing User

If you already have a user in the database without a PIN:

```bash
cd backend
node scripts/setup-user-pin.js user_001 1234
```

Replace:
- `user_001` with your user ID
- `1234` with your desired PIN

Output:
```
Connected to MongoDB
✓ PIN updated for user user_001

User Details:
- User ID: user_001
- Name: user_001
- Email: user_001@example.com
- PIN Set: 2026-02-06T10:30:00.000Z
- Total Transactions: 0
- User Type: NEW

✓ Done!
```

---

## Testing PIN Verification

### Test 1: Correct PIN
```
1. Create a transaction
2. Enter your PIN (the one you set)
3. ✅ Transaction should succeed
```

### Test 2: Wrong PIN
```
1. Create a transaction
2. Enter wrong PIN (e.g., 9999)
3. ❌ Should show: "Incorrect PIN. 2 attempts remaining"
4. Try again with correct PIN
5. ✅ Should succeed
```

### Test 3: Lockout
```
1. Create a transaction
2. Enter wrong PIN 3 times
3. 🔒 Should show: "Transaction locked for 5 minutes"
4. Wait 5 minutes or restart backend
5. Try again
```

---

## Testing Profile Page

### View Profile:
```
1. Navigate to Profile (bottom nav or home)
2. Should show:
   ✅ Your name from MongoDB
   ✅ Your email from MongoDB
   ✅ Your phone from MongoDB
   ✅ Account creation date
   ✅ Total transactions
   ✅ PIN status (Set/Not set)
```

### Edit Profile:
```
1. Click edit icon (✏️) next to name
2. Enter new name
3. Click check mark (✓)
4. ✅ Name updated in MongoDB
5. Reload page to verify
```

### Change PIN:
```
1. Click "Change" button next to PIN
2. Enter current PIN
3. Enter new PIN (4 digits)
4. Confirm new PIN
5. ✅ PIN updated in MongoDB
6. Next transaction uses new PIN
```

### Toggle Cooling Off:
```
1. Find "Cooling Off Mode" in Security Settings
2. Click ON/OFF button
3. ✅ Toggles immediately
4. Updates in MongoDB
5. Affects future risk analysis
```

---

## Verify in MongoDB

### Check User PIN:
```javascript
// MongoDB shell
use upi_fraud_prevention

// Find your user
db.users.findOne({ user_id: "user_001" })

// Should show:
{
  user_id: "user_001",
  name: "Your Name",
  email: "your@email.com",
  pin_hash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
  pin_set_at: ISODate("2026-02-06T10:30:00.000Z"),
  // ... other fields
}
```

### Verify PIN Hash:
```javascript
// The pin_hash should be a 64-character hex string
// It's the SHA-256 hash of your PIN
// Example: PIN "1234" → hash "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"
```

---

## Common Issues & Solutions

### Issue: "PIN not set for this user"
**Solution:**
```bash
# Run setup script
cd backend
node scripts/setup-user-pin.js user_001 1234
```

### Issue: "User not found"
**Solution:**
```bash
# Create user with setup script
cd backend
node scripts/setup-user-pin.js user_001 1234
# This creates the user if it doesn't exist
```

### Issue: Profile shows "Loading..." forever
**Solution:**
- Check backend is running
- Check MongoDB is connected
- Check browser console for errors
- Verify user_id exists in database

### Issue: PIN always fails even with correct PIN
**Solution:**
- Check user has pin_hash in MongoDB
- Run setup script to set PIN
- Verify PIN is 4 digits
- Check backend logs for errors

---

## API Testing

### Test User Registration:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+1234567890",
    "pin": "1234",
    "usageContext": "personal"
  }'
```

### Test Get Profile:
```bash
curl http://localhost:3000/auth/user/test_user
```

### Test PIN Verification:
```bash
# Create transaction first, then:
curl -X POST http://localhost:3000/transaction/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "YOUR_TRANSACTION_ID",
    "user_action": "PROCEEDED",
    "pin": "1234"
  }'
```

---

## Multiple Users Setup

### Create Multiple Test Users:
```bash
cd backend

# User 1
node scripts/setup-user-pin.js user_001 1234

# User 2
node scripts/setup-user-pin.js user_002 5678

# User 3
node scripts/setup-user-pin.js user_003 9999
```

### Test Different PINs:
```
1. Login as user_001
2. Create transaction
3. Enter PIN: 1234 ✅

4. Logout
5. Login as user_002
6. Create transaction
7. Enter PIN: 5678 ✅

8. Try PIN: 1234 ❌ (wrong PIN for user_002)
```

---

## Production Setup

### 1. Environment Variables:
```bash
# backend/.env
MONGODB_URI=mongodb://localhost:27017/upi_fraud_prevention
PORT=3000
```

### 2. Create Admin User:
```bash
node scripts/setup-user-pin.js admin 0000
```

### 3. Verify Setup:
```bash
# Check MongoDB connection
mongo upi_fraud_prevention --eval "db.users.count()"

# Should show number of users
```

---

## Security Best Practices

### For Development:
- ✅ Use simple PINs (1234, 5678)
- ✅ Store in MongoDB
- ✅ Test retry limits
- ✅ Test lockout

### For Production:
- ⚠️ Enforce strong PINs
- ⚠️ Add rate limiting
- ⚠️ Use bcrypt instead of SHA-256
- ⚠️ Add 2FA
- ⚠️ Log PIN attempts
- ⚠️ Monitor suspicious activity

---

## Quick Reference

### Default Test User:
```
User ID: user_001
PIN: 1234
Email: user_001@example.com
```

### Setup Command:
```bash
node scripts/setup-user-pin.js <user_id> <pin>
```

### Check User:
```javascript
db.users.findOne({ user_id: "user_001" })
```

### Update PIN:
```bash
node scripts/setup-user-pin.js user_001 5678
```

---

## Summary

✅ **Setup Complete When:**
- User has `pin_hash` in MongoDB
- Profile page shows real data
- PIN verification works
- Wrong PIN shows error
- Correct PIN allows transaction

✅ **Ready to Test:**
- Create transactions
- Verify PIN checking
- Edit profile
- Change PIN
- Toggle settings

Everything is now connected to MongoDB! 🎉
