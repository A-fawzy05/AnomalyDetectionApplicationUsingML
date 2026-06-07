
require('dotenv').config({ quiet: true });

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jest';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '1h';

process.env.FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8001';
process.env.GATEWAY_SHARED_SECRET = process.env.GATEWAY_SHARED_SECRET || 'test-gateway-secret';

if (!process.env.DEBUG_TESTS) {
  
  console.error = () => {};
}
