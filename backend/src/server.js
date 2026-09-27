require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transaction');
const payeeRoutes = require('./routes/payee');
const mlRoutes = require('./routes/ml');
const cashfreeRoutes = require('./routes/cashfree');
const nomineeRoutes = require('./routes/nominee');
const behavioralSignalsRoutes = require('./routes/behavioralSignals');
const profileRoutes = require('./routes/profile');
const { initRedis } = require('./utils/redis');
const { startAutoRetrainingScheduler } = require('./services/autoRetraining');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/transaction', transactionRoutes);
app.use('/payee', payeeRoutes);
app.use('/ml', mlRoutes);
app.use('/cashfree', cashfreeRoutes);
app.use('/user/nominee', nomineeRoutes);
app.use('/signals', behavioralSignalsRoutes);
app.use('/profile', profileRoutes);

// Debug endpoint - View recent transactions
app.get('/debug/transactions', async (req, res) => {
  try {
    const Transaction = require('./models/Transaction');
    const limit = parseInt(req.query.limit) || 10;
    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-__v');
    res.json({
      count: transactions.length,
      transactions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint - View users
app.get('/debug/users', async (req, res) => {
  try {
    const User = require('./models/User');
    const users = await User.find().select('-__v');
    res.json({
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint - View payee relationships
app.get('/debug/payees', async (req, res) => {
  try {
    const PayeeRelationship = require('./models/PayeeRelationship');
    const payees = await PayeeRelationship.find().select('-__v');
    res.json({
      count: payees.length,
      payees
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Initialize MongoDB connection
const connectMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/upi_fraud_prevention';
    await mongoose.connect(mongoUri, { 
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      connectTimeoutMS: 5000
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.log('Continuing without MongoDB - using mock data mode');
    // Don't exit - allow server to start even if MongoDB is down
  }
};

// Initialize Redis connection
const initializeServices = async () => {
  await connectMongoDB();
  // Make Redis optional - don't block server startup
  try {
    if (process.env.REDIS_HOST) {
      await initRedis();
    } else {
      console.log('Redis disabled - running in degraded mode');
    }
  } catch (error) {
    console.log('Redis connection failed - continuing without Redis');
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`📝 API endpoints:`);
      console.log(`   POST http://localhost:${PORT}/transaction/intent`);
      console.log(`   POST http://localhost:${PORT}/transaction/decision`);
      console.log(`   POST http://localhost:${PORT}/transaction/feedback`);
      console.log(`   POST http://localhost:${PORT}/cashfree/preRisk`);
      console.log(`   POST http://localhost:${PORT}/cashfree/createOrder`);
      console.log(`   GET  http://localhost:${PORT}/cashfree/orderStatus\n`);
      
      // Start auto-retraining scheduler
      startAutoRetrainingScheduler();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;

