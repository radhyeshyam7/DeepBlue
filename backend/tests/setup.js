// Test setup file
// This runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/upi_fraud_prevention_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Note: Redis functions gracefully handle connection failures
// Tests will work even if Redis is not available
