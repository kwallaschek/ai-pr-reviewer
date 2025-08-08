// Global test setup
import { jest } from '@jest/globals';
// Mock environment variables
process.env.GITHUB_TOKEN = 'mock-github-token';
process.env.OPENAI_API_KEY = 'mock-openai-key';
process.env.GITHUB_EVENT_NAME = 'pull_request';
process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
// Mock console methods to reduce test noise
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
// Setup test timeout
jest.setTimeout(30000);
