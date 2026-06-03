/**
 * Global Jest setup.
 *
 * Loads environment variables and guarantees the JWT secret exists so unit tests
 * that sign/verify tokens work even if .env is absent in CI. Integration tests
 * manage their own MongoDB connection (see tests/integration/_setup.js).
 */
require('dotenv').config({ quiet: true });

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jest';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '1h';

// Cross-service tier: where the FastAPI anomaly service lives and the shared
// secret the gateway signs identity headers with. These must match the env the
// uvicorn process is started with (see tests/cross-service/run-cross-service.*).
// Set here (global setup) so config/env.config picks them up regardless of
// module require order within the jest worker.
process.env.FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8001';
process.env.GATEWAY_SHARED_SECRET = process.env.GATEWAY_SHARED_SECRET || 'test-gateway-secret';

// Keep test output readable: silence the app's console.error noise (auth failures,
// expected error-path logs) unless DEBUG_TESTS is set.
if (!process.env.DEBUG_TESTS) {
  // eslint-disable-next-line no-console
  console.error = () => {};
}
