# DeepBlue - Quick Start Guide

## 🚀 Start the Application

```bash
# Terminal 1: Backend
cd backend
npm start
# Backend runs on http://localhost:3000

# Terminal 2: Frontend
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

## 📱 Navigation Guide

### Home Page (Default)
- **Send Money** button → Go to Pay page
- **Transaction History** link → View past transactions
- **Profile & Settings** link → Manage account
- **Bottom Nav** → Quick access to all pages

### Pay Page
- Enter payee UPI ID
- Enter amount
- Select transaction type
- Click Continue → Risk analysis
- Review risk → Proceed or Cancel
- Enter PIN: **1234** (demo)
- Transaction complete → Return to home

### Transaction History
- View all past transactions
- Click transaction → See details
- Back button → Return to home

### Profile Page
- View account information
- Access settings (coming soon)
- Logout

## 🔐 PIN Testing

### Demo PIN: `1234`

**Test Scenarios:**

1. **Correct PIN**
   ```
   Enter: 1234
   Result: ✅ Transaction succeeds
   ```

2. **Wrong PIN (Retry)**
   ```
   Enter: 9999
   Result: ❌ "Incorrect PIN. 2 attempts remaining"
   Action: Can retry
   ```

3. **Lockout (3 failed attempts)**
   ```
   Enter: 9999 (3 times)
   Result: 🔒 "Transaction locked for 5 minutes"
   ```

## 🧪 Test Transaction Flow

### Low Risk Transaction
```
Payee: friend@upi
Amount: 50
Intent: send
Expected: LOW risk, green indicators
```

### Medium Risk Transaction
```
Payee: newperson@upi
Amount: 500
Intent: purchase
Expected: MEDIUM risk, amber indicators
```

### High Risk Transaction
```
Payee: unknown@upi
Amount: 5000
Intent: test
Expected: HIGH risk, red indicators, delay
```

## 📊 API Endpoints

### Transaction Flow
```
POST /transaction/intent
→ Create transaction, get risk analysis

POST /transaction/feedback
→ Submit user action with PIN

POST /signals/behavioral-signals
→ Send behavioral signals
```

### PIN Status
```
GET /transaction/pin-status/:transaction_id
→ Check retry attempts and lockout status
```

## 🎨 UI Components

### Pages
- **HomePage** - Landing with quick actions
- **PayPage** - Transaction flow wrapper
- **TransactionHistory** - Past transactions
- **ProfilePage** - Account settings

### Navigation
- **BottomNavigation** - Fixed bottom nav bar
- **Header** - Top bar with settings

### Transaction Components
- **TransactionForm** - Input form
- **AnalysisState** - Loading animation
- **RiskDial** - Risk visualization
- **RiskCards** - Risk explanation
- **DecisionPanel** - Proceed/Cancel
- **PinModal** - PIN entry

## 🔍 Debugging

### Check Behavioral Signals
```javascript
// Browser console
localStorage.getItem('behavioral_signals')
```

### Check Backend Logs
```bash
# Backend terminal shows:
- Transaction intent received
- Risk analysis complete
- Behavioral signals received
- PIN verification result
```

### Check Database
```javascript
// MongoDB shell
use upi_fraud_prevention

// Check user profile
db.users.findOne({ user_id: "user_001" })

// Check transactions
db.transactions.find().sort({ createdAt: -1 }).limit(5)

// Check payee relationships
db.payeerelationships.find({ user_id: "user_001" })
```

## ⚡ Quick Commands

### Reset Everything
```bash
# Stop both servers (Ctrl+C)
# Clear database
mongo upi_fraud_prevention --eval "db.dropDatabase()"
# Restart servers
```

### Check Ports
```bash
# Check if ports are in use
netstat -ano | findstr :3000
netstat -ano | findstr :5173
```

### View Logs
```bash
# Backend logs
cd backend
npm start

# Frontend logs
cd frontend
npm run dev
```

## 🐛 Common Issues

### Issue: Port already in use
```bash
# Kill process on port 3000
npx kill-port 3000

# Kill process on port 5173
npx kill-port 5173
```

### Issue: MongoDB not connected
```bash
# Check MongoDB is running
mongod --version

# Start MongoDB
mongod
```

### Issue: PIN always fails
- Check DEMO_MODE is true in `backend/src/services/pinVerification.js`
- Verify PIN is sent as string: `"1234"` not `1234`

### Issue: Behavioral signals not sent
- Check browser console for errors
- Verify endpoint: `/signals/behavioral-signals`
- Check backend route is registered

## 📝 Development Workflow

### 1. Make Changes
```bash
# Frontend changes auto-reload (Vite HMR)
# Backend changes require restart
```

### 2. Test Changes
```bash
# Run through transaction flow
# Check console logs
# Verify database updates
```

### 3. Check Diagnostics
```bash
# Frontend
npm run build  # Check for TypeScript errors

# Backend
npm test  # Run test suite
```

## 🎯 Key Features

✅ **Behavioral Signal Capture** - Tracks user interactions
✅ **User Baselines (EMA)** - Personalized risk thresholds
✅ **Payee Trust Scoring** - Relationship memory
✅ **Amount Deviation Detection** - Personalized amount risk
✅ **PIN Verification** - Secure with retry limits
✅ **Risk Visualization** - Clear risk communication
✅ **UPI-Style Navigation** - Familiar user experience

## 📚 Documentation

- `CRITICAL_FIXES_APPLIED.md` - All fixes documented
- `IMPLEMENTATION_SUMMARY.md` - System overview
- `TESTING_GUIDE.md` - Comprehensive test scenarios
- `TASKS_COMPLETED.md` - Recent work summary
- `FRONTEND_PIN_FIX.md` - PIN integration details

## 🚀 Production Checklist

- [ ] Update demo PIN to real PIN system
- [ ] Connect transaction history to backend API
- [ ] Implement profile settings functionality
- [ ] Add real-time stats to home page
- [ ] Enable MongoDB authentication
- [ ] Configure CORS for production
- [ ] Set up environment variables
- [ ] Add error tracking (Sentry)
- [ ] Enable HTTPS
- [ ] Deploy to production

## 💡 Tips

1. **Use Chrome DevTools** - Network tab shows API calls
2. **Check Console** - Behavioral signals logged
3. **MongoDB Compass** - Visual database browser
4. **Postman** - Test API endpoints directly
5. **React DevTools** - Inspect component state

## 🎉 You're Ready!

The system is fully functional with:
- ✅ PIN verification
- ✅ Complete navigation
- ✅ Behavioral baselines
- ✅ Risk scoring
- ✅ UPI-style UI

Start testing and enjoy! 🚀
