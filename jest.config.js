module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/', 
    '__tests__/commenter-core.test.ts',
    '__tests__/commenter-review.test.ts', 
    '__tests__/commenter-commits.test.ts',
    '__tests__/commenter.test.ts',
    '__tests__/commenter-minimal.test.ts',
    '__tests__/review-comment.test.ts',
    '__tests__/main.test.ts',
    '__tests__/bot.test.ts',
    '__tests__/octokit.test.ts'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/inputs.ts',
    'src/tokenizer.ts', 
    'src/options.ts',
    'src/prompts.ts',
    'src/limits.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  // Memory optimization settings
  maxWorkers: 1,
  // Prevent memory leaks in tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Optimize test execution
  testTimeout: 60000,
  // Reduce memory usage during test runs
  detectOpenHandles: true,
  forceExit: true,
  // Jest globals configuration
  globals: {
    'ts-jest': {
      useESM: false,
      tsconfig: {
        module: 'CommonJS',
        target: 'ES2020'
      }
    }
  }
}