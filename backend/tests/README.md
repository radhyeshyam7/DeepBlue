# Test Suite for DeepBlue Backend

This directory contains automated tests for the DeepBlue UPI Fraud Prevention backend API.

## Structure

```
tests/
├── setup.js                          # Jest configuration and test setup
├── manual-test.js                    # Manual test script (no dependencies)
├── integration/
│   ├── health.test.js                # Health check endpoint tests
│   ├── transaction.intent.test.js   # Transaction intent endpoint tests
│   ├── transaction.decision.test.js  # Risk decision endpoint tests
│   └── transaction.feedback.test.js # User feedback endpoint tests
└── README.md                         # This file
```

## Running Tests

### Prerequisites

Install test dependencies:
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Manual Test Script
```bash
# Make sure server is running first: npm start
node tests/manual-test.js
```

## Test Coverage

The test suite covers:

- ✅ Health check endpoint
- ✅ Transaction intent creation
- ✅ Risk decision retrieval
- ✅ User feedback submission
- ✅ Error handling (missing fields, invalid inputs)
- ✅ Edge cases (non-existent transactions, invalid data)

## Test Database

Tests use MongoDB Memory Server, which creates an in-memory MongoDB instance automatically. No manual database setup is required.

## Redis

Redis functions are gracefully handled - tests will work even if Redis is not available, as the Redis utilities handle connection failures gracefully.

## Writing New Tests

When adding new tests:

1. Create test files in the appropriate directory (`integration/` or `unit/`)
2. Follow the naming convention: `*.test.js`
3. Use the existing test files as templates
4. Ensure tests clean up after themselves (database collections are cleared after each test)

## Example Test

```javascript
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

test('should do something', async () => {
  const response = await request(app)
    .get('/some-endpoint')
    .expect(200);
  
  expect(response.body).toHaveProperty('someProperty');
});
```
