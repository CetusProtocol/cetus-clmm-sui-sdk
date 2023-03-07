/** @type import('eslint').Linter.Config */
module.exports = {
  "roots": [
    "<rootDir>/src",
    "<rootDir>/tests"
  ],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  globals: {
    "ts-jest": {
      tsconfig: "./tests/tsconfig.json"
    }
  },
  // testRegex: 'token.test.ts',
  testTimeout: 90*1000
}