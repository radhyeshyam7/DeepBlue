const redis = require('redis');

let redisClient = null;

// Initialize Redis client
const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 5000, // 5 second timeout
        reconnectStrategy: false // Don't retry on failure
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      // Don't crash the server on Redis errors
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    console.log('⚠️ Running without Redis - some features may be limited');
    // Return null to allow graceful degradation
    redisClient = null;
    return null;
  }
};

// Get Redis client (returns null if not connected)
const getRedisClient = () => {
  return redisClient;
};

// Velocity counter: Track transactions per time window
const incrementVelocityCounter = async (userId, windowSeconds = 60) => {
  try {
    if (!redisClient || !redisClient.isOpen) return null;
    
    const key = `velocity:${userId}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    const count = await redisClient.incr(key);
    await redisClient.expire(key, windowSeconds * 2); // Keep for 2x window
    return count;
  } catch (error) {
    console.error('Redis velocity counter error:', error);
    return null;
  }
};

// Get velocity count for current window
const getVelocityCount = async (userId, windowSeconds = 60) => {
  try {
    if (!redisClient || !redisClient.isOpen) return 0;
    
    const key = `velocity:${userId}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    const count = await redisClient.get(key);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error('Redis get velocity error:', error);
    return 0;
  }
};

// Cooling-off flag for new/vulnerable users
const setCoolingOffFlag = async (userId, ttlSeconds = 300) => {
  try {
    if (!redisClient || !redisClient.isOpen) return false;
    
    const key = `cooling_off:${userId}`;
    await redisClient.setEx(key, ttlSeconds, '1');
    return true;
  } catch (error) {
    console.error('Redis cooling-off error:', error);
    return false;
  }
};

const getCoolingOffFlag = async (userId) => {
  try {
    if (!redisClient || !redisClient.isOpen) return false;
    
    const key = `cooling_off:${userId}`;
    const flag = await redisClient.get(key);
    return flag === '1';
  } catch (error) {
    console.error('Redis get cooling-off error:', error);
    return false;
  }
};

// Delay state for high-risk transactions
const setDelayState = async (transactionId, ttlSeconds = 600) => {
  try {
    if (!redisClient || !redisClient.isOpen) return false;
    
    const key = `delay:${transactionId}`;
    await redisClient.setEx(key, ttlSeconds, '1');
    return true;
  } catch (error) {
    console.error('Redis delay state error:', error);
    return false;
  }
};

const getDelayState = async (transactionId) => {
  try {
    if (!redisClient || !redisClient.isOpen) return false;
    
    const key = `delay:${transactionId}`;
    const flag = await redisClient.get(key);
    return flag === '1';
  } catch (error) {
    console.error('Redis get delay state error:', error);
    return false;
  }
};

const removeDelayState = async (transactionId) => {
  try {
    if (!redisClient || !redisClient.isOpen) return false;
    
    const key = `delay:${transactionId}`;
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis remove delay state error:', error);
    return false;
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  incrementVelocityCounter,
  getVelocityCount,
  setCoolingOffFlag,
  getCoolingOffFlag,
  setDelayState,
  getDelayState,
  removeDelayState
};

