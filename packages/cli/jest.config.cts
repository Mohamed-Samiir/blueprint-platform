/* eslint-disable */
const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: '@blueprint-platform/cli',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  // This package is ESM ("type": "module", required by @clack/prompts, which
  // ships no CJS build) and, per TS `nodenext` convention, its own relative
  // imports use explicit `.js` specifiers even though the source is `.ts`
  // (e.g. `import { addLayout } from './lib/add-layout.js'`). Jest's default
  // resolver looks for a literal `add-layout.js` on disk and won't find one
  // (only `add-layout.ts` exists pre-build) — strip the `.js` so it falls
  // back to `moduleFileExtensions` resolution, the standard workaround for
  // testing nodenext-ESM TypeScript under Jest.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
};
