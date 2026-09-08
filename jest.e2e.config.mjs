/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
  testTimeout: 30000,
  verbose: true,
};
