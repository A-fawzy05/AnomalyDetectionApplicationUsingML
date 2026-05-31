/**
 * Jest configuration for the P2P Insight API gateway.
 *
 * - Unit tests (tests/unit) are DB-free: they mock mongoose models / external
 *   services and test pure logic (JWT, middleware, model methods).
 * - Integration tests (tests/integration) drive the real Express app with
 *   supertest against the dev MongoDB (Atlas) and clean up what they create.
 *   They auto-skip if the database is unreachable.
 */
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
  ],
  testTimeout: 30000,
  // Express/mongoose can leave the event loop with open handles; force a clean exit.
  forceExit: true,
  clearMocks: true,
};
