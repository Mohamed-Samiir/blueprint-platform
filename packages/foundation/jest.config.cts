/* eslint-disable */
const { readFileSync } = require('fs')

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: '@blueprint/foundation',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
  // Generator payload under files/ is copied verbatim into generated projects,
  // never compiled or tested here — but jest's default testMatch also matches
  // **/*.test.ts, which collides with the real template file
  // files/environments/environment.test.ts (one of the environment.<env>.ts
  // set, not a test). Exclude the whole files/ payload from test discovery.
  testPathIgnorePatterns: ['/node_modules/', '/src/generators/.*/files/']
};
