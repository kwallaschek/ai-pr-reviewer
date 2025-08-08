import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock @actions/core before importing the module
const mockWarning = jest.fn()
const mockGetInput = jest.fn()

jest.mock('@actions/core', () => ({
  warning: mockWarning,
  getInput: mockGetInput
}))

// Mock @octokit/action and plugins
const mockOctokit = jest.fn() as jest.MockedFunction<any>
const mockPlugin = jest.fn(() => mockOctokit) as jest.MockedFunction<any>

jest.mock('@octokit/action', () => ({
  Octokit: {
    plugin: mockPlugin
  }
}))

jest.mock('@octokit/plugin-retry', () => ({
  retry: 'mock-retry-plugin'
}))

jest.mock('@octokit/plugin-throttling', () => ({
  throttling: 'mock-throttling-plugin'
}))

describe('octokit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset module cache to ensure fresh imports
    jest.resetModules()
  })

  afterEach(() => {
    delete process.env.GITHUB_TOKEN
  })

  it('should create octokit instance with token from getInput', async () => {
    mockGetInput.mockReturnValue('input-token')
    process.env.GITHUB_TOKEN = undefined

    // Import after setting up mocks
    await import('../src/octokit')

    expect(mockGetInput).toHaveBeenCalledWith('token')
    expect(mockPlugin).toHaveBeenCalledWith('mock-throttling-plugin', 'mock-retry-plugin')
    expect(mockOctokit).toHaveBeenCalledWith({
      auth: 'token input-token',
      throttle: expect.objectContaining({
        onRateLimit: expect.any(Function),
        onSecondaryRateLimit: expect.any(Function)
      })
    })
  })

  it('should create octokit instance with token from environment', async () => {
    mockGetInput.mockReturnValue('')
    process.env.GITHUB_TOKEN = 'env-token'

    await import('../src/octokit')

    expect(mockOctokit).toHaveBeenCalledWith({
      auth: 'token env-token',
      throttle: expect.objectContaining({
        onRateLimit: expect.any(Function),
        onSecondaryRateLimit: expect.any(Function)
      })
    })
  })

  it('should prioritize getInput over environment variable', async () => {
    mockGetInput.mockReturnValue('input-token')
    process.env.GITHUB_TOKEN = 'env-token'

    await import('../src/octokit')

    expect(mockOctokit).toHaveBeenCalledWith({
      auth: 'token input-token',
      throttle: expect.objectContaining({
        onRateLimit: expect.any(Function),
        onSecondaryRateLimit: expect.any(Function)
      })
    })
  })

  it('should use environment token when getInput returns empty string', async () => {
    mockGetInput.mockReturnValue('')
    process.env.GITHUB_TOKEN = 'env-token'

    await import('../src/octokit')

    expect(mockOctokit).toHaveBeenCalledWith({
      auth: 'token env-token',
      throttle: expect.objectContaining({
        onRateLimit: expect.any(Function),
        onSecondaryRateLimit: expect.any(Function)
      })
    })
  })

  it('should handle missing token gracefully', async () => {
    mockGetInput.mockReturnValue('')
    process.env.GITHUB_TOKEN = undefined

    await import('../src/octokit')

    expect(mockOctokit).toHaveBeenCalledWith({
      auth: 'token undefined',
      throttle: expect.any(Object)
    })
  })

  describe('throttle configuration', () => {
    let onRateLimit: any
    let onSecondaryRateLimit: any

    beforeEach(async () => {
      mockGetInput.mockReturnValue('test-token')
      
      await import('../src/octokit')
      
      const throttleConfig = (mockOctokit.mock.calls[0][0] as any).throttle
      onRateLimit = throttleConfig.onRateLimit
      onSecondaryRateLimit = throttleConfig.onSecondaryRateLimit
    })

    describe('onRateLimit', () => {
      it('should warn and return true for retry count <= 3', () => {
        const result = onRateLimit(60, { method: 'GET', url: '/test' }, {}, 1)
        
        expect(mockWarning).toHaveBeenCalledWith(
          expect.stringContaining('Request quota exhausted')
        )
        expect(mockWarning).toHaveBeenCalledWith(
          expect.stringContaining('Retry after: 60 seconds')
        )
        expect(mockWarning).toHaveBeenCalledWith(
          expect.stringContaining('Retry count: 1')
        )
        expect(mockWarning).toHaveBeenCalledWith('Retrying after 60 seconds!')
        expect(result).toBe(true)
      })

      it('should warn and return undefined for retry count > 3', () => {
        const result = onRateLimit(60, { method: 'GET', url: '/test' }, {}, 4)
        
        expect(mockWarning).toHaveBeenCalledWith(
          expect.stringContaining('Request quota exhausted')
        )
        expect(mockWarning).not.toHaveBeenCalledWith('Retrying after 60 seconds!')
        expect(result).toBe(undefined)
      })

      it('should format warning message correctly', () => {
        onRateLimit(120, { method: 'POST', url: '/repos/owner/repo/issues' }, {}, 2)
        
        expect(mockWarning).toHaveBeenCalledWith(
          'Request quota exhausted for request POST /repos/owner/repo/issues\nRetry after: 120 seconds\nRetry count: 2\n'
        )
      })
    })

    describe('onSecondaryRateLimit', () => {
      it('should warn and return true for non-review POST requests', () => {
        const result = onSecondaryRateLimit(30, { method: 'POST', url: '/repos/owner/repo/issues' })
        
        expect(mockWarning).toHaveBeenCalledWith(
          'SecondaryRateLimit detected for request POST /repos/owner/repo/issues ; retry after 30 seconds'
        )
        expect(result).toBe(true)
      })

      it('should warn and return false for review POST requests', () => {
        const result = onSecondaryRateLimit(30, { 
          method: 'POST', 
          url: '/repos/owner/repo/pulls/123/reviews' 
        })
        
        expect(mockWarning).toHaveBeenCalledWith(
          'SecondaryRateLimit detected for request POST /repos/owner/repo/pulls/123/reviews ; retry after 30 seconds'
        )
        expect(result).toBe(false)
      })

      it('should return true for GET requests', () => {
        const result = onSecondaryRateLimit(30, { method: 'GET', url: '/repos/owner/repo' })
        expect(result).toBe(true)
      })

      it('should return true for non-review URLs', () => {
        const result = onSecondaryRateLimit(30, { 
          method: 'POST', 
          url: '/repos/owner/repo/issues/comments' 
        })
        expect(result).toBe(true)
      })

      it('should handle complex review URL patterns', () => {
        const testCases = [
          '/repos/owner/repo/pulls/456/reviews',
          '/repos/org-name/repo-name/pulls/789/reviews',
          '/repos/owner/repo/pulls/123/reviews/456'
        ]
        
        testCases.forEach(url => {
          const result = onSecondaryRateLimit(30, { method: 'POST', url })
          expect(result).toBe(false)
        })
      })

      it('should not match non-review similar URLs', () => {
        const testCases = [
          '/repos/owner/repo/pulls/123/comments',
          '/repos/owner/repo/pulls/123',
          '/repos/owner/repo/reviews',
          '/other/path/reviews'
        ]
        
        testCases.forEach(url => {
          const result = onSecondaryRateLimit(30, { method: 'POST', url })
          expect(result).toBe(true)
        })
      })
    })
  })

  it('should configure plugins in correct order', async () => {
    mockGetInput.mockReturnValue('test-token')
    
    await import('../src/octokit')
    
    expect(mockPlugin).toHaveBeenCalledWith('mock-throttling-plugin', 'mock-retry-plugin')
    expect(mockPlugin).toHaveBeenCalledTimes(1)
  })

  it('should export octokit instance', async () => {
    mockGetInput.mockReturnValue('test-token')
    
    const module = await import('../src/octokit')
    
    expect(module.octokit).toBeDefined()
  })
})