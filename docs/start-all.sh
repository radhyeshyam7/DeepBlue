#!/bin/bash
# DeepBlue - Start All Services Script (Bash)
# This script helps start MongoDB, Redis, Backend, and Frontend

echo "🚀 DeepBlue Startup Script"
echo "========================="
echo ""

# Check if Node.js is installed
echo "Checking prerequisites..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js found: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js v14+"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Check MongoDB
echo ""
echo "Checking MongoDB..."
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.version()" --quiet >/dev/null 2>&1; then
        echo "✅ MongoDB is accessible"
    else
        echo "⚠️  MongoDB may not be running. Please ensure MongoDB is running on port 27017"
    fi
elif command -v mongo &> /dev/null; then
    if mongo --eval "db.version()" --quiet >/dev/null 2>&1; then
        echo "✅ MongoDB is accessible"
    else
        echo "⚠️  MongoDB may not be running. Please ensure MongoDB is running on port 27017"
    fi
else
    echo "⚠️  MongoDB client not found. Please verify MongoDB is installed"
fi

# Check Redis
echo ""
echo "Checking Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping >/dev/null 2>&1; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is not running"
        echo "   Backend will work without Redis (degraded mode)"
    fi
else
    echo "⚠️  Redis client not found"
fi

# Check Backend Port
echo ""
echo "Checking Backend port..."
if check_port 3000; then
    echo "⚠️  Port 3000 is already in use"
    echo "   Backend may already be running, or another service is using port 3000"
else
    echo "✅ Port 3000 is available"
fi

# Check Frontend Port
echo ""
echo "Checking Frontend port..."
if check_port 5173; then
    echo "⚠️  Port 5173 is already in use"
    echo "   Frontend may already be running, or another service is using port 5173"
else
    echo "✅ Port 5173 is available"
fi

echo ""
echo "========================="
echo "Starting Services..."
echo "========================="
echo ""

# Start Backend
echo "📦 Starting Backend..."
echo "   Make sure you've run 'npm install' and 'npm run train-model' in the backend folder"

if [ -d "backend" ]; then
    echo "   Backend folder found: $(pwd)/backend"
    
    # Check if node_modules exists
    if [ ! -d "backend/node_modules" ]; then
        echo "   ⚠️  Backend dependencies not installed. Run 'npm install' in backend folder"
    fi
    
    # Check if ML model exists
    if [ ! -f "backend/src/models/ml_model.json" ]; then
        echo "   ⚠️  ML model not found. Run 'npm run train-model' in backend folder"
    fi
    
    echo ""
    echo "   To start backend, run:"
    echo "   cd backend"
    echo "   npm run dev"
else
    echo "   ❌ Backend folder not found"
fi

echo ""

# Start Frontend
echo "🎨 Starting Frontend..."
if [ -d "frontend" ]; then
    echo "   Frontend folder found: $(pwd)/frontend"
    
    # Check if node_modules exists
    if [ ! -d "frontend/node_modules" ]; then
        echo "   ⚠️  Frontend dependencies not installed. Run 'npm install' in frontend folder"
    fi
    
    echo ""
    echo "   To start frontend, run:"
    echo "   cd frontend"
    echo "   npm run dev"
else
    echo "   ❌ Frontend folder not found"
fi

echo ""
echo "========================="
echo "Setup Instructions"
echo "========================="
echo ""
echo "1. Install Backend Dependencies:"
echo "   cd backend"
echo "   npm install"
echo ""
echo "2. Train ML Model (first time only):"
echo "   cd backend"
echo "   npm run train-model"
echo ""
echo "3. Install Frontend Dependencies:"
echo "   cd frontend"
echo "   npm install"
echo ""
echo "4. Start Backend (in one terminal):"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "5. Start Frontend (in another terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "========================="
echo "URLs"
echo "========================="
echo "Backend API:  http://localhost:3000"
echo "Frontend UI:  http://localhost:5173"
echo ""
echo "For detailed instructions, see STARTUP_GUIDE.md"
echo ""
