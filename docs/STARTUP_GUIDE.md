# 🚀 DeepBlue Startup Guide

Complete guide to start the backend and frontend with MongoDB and Redis integration.

---

## 📋 Prerequisites

Before starting, ensure you have installed:

1. **Node.js** (v14 or higher)
   ```bash
   node --version
   ```

2. **MongoDB** (local installation or connection string)
   - Download: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

3. **Redis** (optional but recommended)
   - Windows: Download from https://github.com/microsoftarchive/redis/releases
   - Mac: `brew install redis`
   - Linux: `sudo apt-get install redis-server` or `sudo yum install redis`

---

## 🔧 Step 1: Backend Setup

### 1.1 Install Backend Dependencies

```bash
cd backend
npm install
```

### 1.2 Configure Environment Variables

Create or update `backend/.env` file:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/upi_fraud_prevention
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
```

**For MongoDB Atlas (cloud):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/upi_fraud_prevention
```

**If Redis is not available:**
- The backend will continue to work without Redis (degraded functionality)
- Velocity tracking and cooling-off features will be disabled

### 1.3 Train ML Model (Required for Phase 2)

```bash
cd backend
npm run train-model
```

This creates `src/models/ml_model.json` with the trained Isolation Forest model.

**Expected output:**
```
Training Isolation Forest model...
Model trained successfully!
Model saved to: src/models/ml_model.json
```

---

## 🗄️ Step 2: Start MongoDB

### Option A: Local MongoDB

**Windows:**
```bash
# MongoDB usually runs as a service automatically
# Check if running:
mongosh mongodb://localhost:27017

# If not running, start MongoDB service:
# Services → MongoDB → Start
```

**Mac/Linux:**
```bash
# Start MongoDB
mongod

# Or if installed via Homebrew:
brew services start mongodb-community

# Verify connection:
mongosh mongodb://localhost:27017
```

### Option B: MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `MONGODB_URI` in `backend/.env`

**No local installation needed!**

---

## ⚡ Step 3: Start Redis (Optional but Recommended)

### Windows:
```bash
# Download Redis from: https://github.com/microsoftarchive/redis/releases
# Run: redis-server.exe

# Or use WSL:
wsl redis-server
```

### Mac:
```bash
brew services start redis

# Or run directly:
redis-server
```

### Linux:
```bash
sudo systemctl start redis
# Or:
redis-server
```

### Verify Redis is Running:
```bash
redis-cli ping
# Should return: PONG
```

**Note:** If Redis is not available, the backend will still work but with limited functionality (no velocity tracking, no cooling-off periods).

---

## 🖥️ Step 4: Start Backend Server

```bash
cd backend

# Development mode (with auto-reload):
npm run dev

# Production mode:
npm start
```

**Expected output:**
```
MongoDB connected successfully
Redis connected successfully
🚀 Server running on port 3000
📡 Health check: http://localhost:3000/health
📝 API endpoints:
   POST http://localhost:3000/transaction/intent
   POST http://localhost:3000/transaction/decision
   POST http://localhost:3000/transaction/feedback
```

### Verify Backend is Running:

Open browser or use curl:
```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "mongodb": "connected"
}
```

---

## 🎨 Step 5: Frontend Setup

### 5.1 Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 5.2 Configure Frontend Environment

Create `frontend/.env` file (optional - defaults work for localhost):

```env
VITE_API_BASE_URL=http://localhost:3000
```

**Note:** If backend is on a different host/port, update this value.

### 5.3 Start Frontend Development Server

```bash
cd frontend
npm run dev
```

**Expected output:**
```
  VITE v6.3.5  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

The frontend will automatically open in your browser at `http://localhost:5173`

---

## ✅ Step 6: Verify Everything Works

### 6.1 Backend Health Check

```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "...",
  "mongodb": "connected"
}
```

### 6.2 ML Health Check

```bash
curl http://localhost:3000/ml/health
```

Should return:
```json
{
  "status": "OK",
  "model_loaded": true
}
```

### 6.3 Test Transaction Flow

1. Open frontend: `http://localhost:5173`
2. Fill in transaction form:
   - Payee: `test@upi`
   - Amount: `5000`
   - Type: `Pay`
3. Click "Continue"
4. You should see risk analysis with backend data

### 6.4 Check MongoDB Data

```bash
mongosh mongodb://localhost:27017/upi_fraud_prevention

# List collections
show collections

# View transactions
db.transactions.find().pretty()

# View users
db.users.find().pretty()

# View payee relationships
db.payeerelationships.find().pretty()
```

### 6.5 Check Redis Data (if Redis is running)

```bash
redis-cli

# List all keys
KEYS *

# View velocity counter
GET velocity:user_001:*

# View delay state
GET delay:*
```

---

## 🔍 Troubleshooting

### Backend Issues

**MongoDB Connection Failed:**
```
Error: MongoDB connection error
```
**Solution:**
- Verify MongoDB is running: `mongosh mongodb://localhost:27017`
- Check `MONGODB_URI` in `backend/.env`
- For Atlas: Verify network access and credentials

**Redis Connection Failed:**
```
Redis Client Error: ...
```
**Solution:**
- Backend continues without Redis (degraded mode)
- To fix: Start Redis or remove Redis config
- Check `REDIS_HOST` and `REDIS_PORT` in `backend/.env`

**Port 3000 Already in Use:**
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:**
```bash
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Or change PORT in backend/.env
```

**ML Model Not Found:**
```
Error: Model file not found
```
**Solution:**
```bash
cd backend
npm run train-model
```

### Frontend Issues

**Cannot Connect to Backend:**
```
Error: Failed to fetch
```
**Solution:**
- Verify backend is running: `curl http://localhost:3000/health`
- Check `VITE_API_BASE_URL` in `frontend/.env`
- Check browser console for CORS errors

**Port 5173 Already in Use:**
```
Error: Port 5173 is in use
```
**Solution:**
- Vite will automatically use next available port
- Or change port in `frontend/vite.config.ts`

**Module Not Found:**
```
Error: Cannot find module '...'
```
**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Port Summary

| Service | Port | URL |
|---------|------|-----|
| Backend API | 3000 | http://localhost:3000 |
| Frontend Dev | 5173 | http://localhost:5173 |
| MongoDB | 27017 | mongodb://localhost:27017 |
| Redis | 6379 | redis://localhost:6379 |

---

## 🎯 Quick Start Commands (All-in-One)

**Terminal 1 - MongoDB:**
```bash
# Windows: Usually auto-starts
# Mac/Linux:
mongod
```

**Terminal 2 - Redis:**
```bash
redis-server
```

**Terminal 3 - Backend:**
```bash
cd backend
npm install
npm run train-model  # First time only
npm run dev
```

**Terminal 4 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## ✅ Success Checklist

- [ ] MongoDB is running and accessible
- [ ] Redis is running (optional)
- [ ] Backend dependencies installed (`npm install` in `backend/`)
- [ ] ML model trained (`npm run train-model`)
- [ ] Backend server running on port 3000
- [ ] Backend health check returns OK
- [ ] Frontend dependencies installed (`npm install` in `frontend/`)
- [ ] Frontend server running on port 5173
- [ ] Frontend can connect to backend API
- [ ] Transaction form submits successfully
- [ ] Risk analysis displays backend data
- [ ] Data appears in MongoDB

---

## 🎉 You're Ready!

Your DeepBlue system is now running with:
- ✅ Real-time fraud detection backend
- ✅ MongoDB data persistence
- ✅ Redis velocity tracking
- ✅ ML-powered anomaly detection
- ✅ React frontend with backend integration

**Next Steps:**
- Test different transaction scenarios
- Check MongoDB for stored transactions
- Monitor Redis for velocity counters
- Review risk analysis in the UI

---

## 📚 Additional Resources

- Backend API Docs: `backend/README.md`
- Phase 2 Quick Start: `backend/PHASE2_QUICKSTART.md`
- API Examples: `backend/API_EXAMPLES.md`
- Testing Guide: `backend/TESTING.md`
