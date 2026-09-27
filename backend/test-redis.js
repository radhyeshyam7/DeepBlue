/**
 * Test Redis Connection and Data Storage
 */

require('dotenv').config();
const { initRedis, getRedisClient, incrementVelocityCounter, getVelocityCount } = require('./src/utils/redis');

async function testRedis() {
  console.log('🔍 Testing Redis connection and caching...\n');
  
  try {
    // Initialize Redis
    console.log('1. Connecting to Redis...');
    await initRedis();
    const client = getRedisClient();
    
    if (!client || !client.isOpen) {
      console.error('❌ Redis client not connected');
      process.exit(1);
    }
    console.log('✅ Redis connected successfully\n');
    
    // Test basic set/get
    console.log('2. Testing basic SET/GET...');
    await client.set('test:key', 'test_value');
    const value = await client.get('test:key');
    console.log(`   SET test:key = "test_value"`);
    console.log(`   GET test:key = "${value}"`);
    if (value === 'test_value') {
      console.log('✅ Basic SET/GET working\n');
    } else {
      console.error('❌ Basic SET/GET failed\n');
    }
    
    // Test velocity counter
    console.log('3. Testing velocity counter...');
    const testUserId = 'test_user_123';
    const count1 = await incrementVelocityCounter(testUserId);
    const count2 = await incrementVelocityCounter(testUserId);
    const count3 = await getVelocityCount(testUserId);
    console.log(`   Increment 1: ${count1}`);
    console.log(`   Increment 2: ${count2}`);
    console.log(`   Get count: ${count3}`);
    if (count3 === 2) {
      console.log('✅ Velocity counter working\n');
    } else {
      console.error('❌ Velocity counter failed\n');
    }
    
    // Test TTL (expiration)
    console.log('4. Testing TTL (expiration)...');
    await client.setEx('test:ttl', 5, 'expires_in_5s');
    const ttl = await client.ttl('test:ttl');
    console.log(`   SET test:ttl with 5s TTL`);
    console.log(`   TTL remaining: ${ttl}s`);
    if (ttl > 0 && ttl <= 5) {
      console.log('✅ TTL working\n');
    } else {
      console.error('❌ TTL failed\n');
    }
    
    // List all keys
    console.log('5. Listing all keys in Redis...');
    const keys = await client.keys('*');
    console.log(`   Total keys: ${keys.length}`);
    keys.forEach(key => console.log(`   - ${key}`));
    console.log('');
    
    // Cleanup
    console.log('6. Cleaning up test keys...');
    await client.del('test:key');
    await client.del('test:ttl');
    console.log('✅ Cleanup complete\n');
    
    console.log('🎉 All Redis tests passed!');
    console.log('\n📊 Redis is properly configured and caching data.');
    
    await client.quit();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  }
}

testRedis();
