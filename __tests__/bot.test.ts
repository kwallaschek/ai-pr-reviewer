import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock dependencies (must be defined before module imports)
const mockInfo = jest.fn()
const mockSetFailed = jest.fn()
const mockWarning = jest.fn()
const mockPRetry = jest.fn() as jest.MockedFunction<any>
const mockSendMessage = jest.fn() as jest.MockedFunction<any>
const mockChatGPTAPI = jest.fn().mockImplementation(() => ({
  sendMessage: mockSendMessage
})) as jest.MockedFunction<any>

jest.mock('@actions/core', () => ({
  info: mockInfo,
  setFailed: mockSetFailed,
  warning: mockWarning
}))

// Mock fetch polyfill
jest.mock('../src/fetch-polyfill', () => ({}))

// Mock p-retry
jest.mock('p-retry', () => mockPRetry)

// Mock ChatGPT API
jest.mock('chatgpt', () => ({
  ChatGPTAPI: mockChatGPTAPI,
  ChatGPTError: class ChatGPTError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ChatGPTError'
    }
  }
}))

import { Bot, Ids } from '../src/bot'
import { Options, OpenAIOptions } from '../src/options'

describe('Bot', () => {
  let options: Options
  let openaiOptions: OpenAIOptions
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    
    options = new Options(
      true, // debug
      false, // disable review
      false, // disable release notes
      false, // disable release summary
      '10', // max files
      false, // review simple changes
      false, // review comment LGTM
      null, // path filters
      'Test system message',
      'gpt-3.5-turbo',
      'gpt-4',
      '0.1', // temperature
      '3', // retries
      '120000', // timeout
      '6', // openai concurrency
      '6' // github concurrency
    )
    
    openaiOptions = new OpenAIOptions('gpt-4')
    mockPRetry.mockImplementation((fn: any) => fn())
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('constructor', () => {
    it('should create bot with OPENAI_API_KEY', () => {
      process.env.OPENAI_API_KEY = 'test-api-key'
      
      const bot = new Bot(options, openaiOptions)
      
      expect(mockChatGPTAPI).toHaveBeenCalledWith({
        apiBaseUrl: 'https://api.openai.com/v1',
        systemMessage: expect.stringContaining('Test system message'),
        apiKey: 'test-api-key',
        apiOrg: undefined,
        debug: true,
        maxModelTokens: 8000,
        maxResponseTokens: 2000,
        completionParams: {
          temperature: 0.1,
          model: 'gpt-4'
        }
      })
    })

    it('should include current date in system message', () => {
      process.env.OPENAI_API_KEY = 'test-api-key'
      const currentDate = new Date().toISOString().split('T')[0]
      
      new Bot(options, openaiOptions)
      
      const systemMessage = (mockChatGPTAPI.mock.calls[0][0] as any).systemMessage
      expect(systemMessage).toContain(`Current date: ${currentDate}`)
    })

    it('should include knowledge cutoff in system message', () => {
      process.env.OPENAI_API_KEY = 'test-api-key'
      
      new Bot(options, openaiOptions)
      
      const systemMessage = (mockChatGPTAPI.mock.calls[0][0] as any).systemMessage
      expect(systemMessage).toContain('Knowledge cutoff: 2021-09-01')
    })

    it('should include language in system message', () => {
      process.env.OPENAI_API_KEY = 'test-api-key'
      
      new Bot(options, openaiOptions)
      
      const systemMessage = (mockChatGPTAPI.mock.calls[0][0] as any).systemMessage
      expect(systemMessage).toContain('language with ISO code: en-US')
    })

    it('should use OPENAI_API_ORG when provided', () => {
      process.env.OPENAI_API_KEY = 'test-api-key'
      process.env.OPENAI_API_ORG = 'test-org'
      
      new Bot(options, openaiOptions)
      
      expect(mockChatGPTAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiOrg: 'test-org'
        })
      )
    })

    it('should use custom API base URL', () => {
      process.env.OPENAI_API_KEY = 'test-api-key'
      const customOptions = new Options(
        false, false, false, false, '0', false, false, null, '',
        'gpt-3.5-turbo', 'gpt-4', '0.0', '3', '120000', '6', '6',
        'https://custom-api.com/v1'
      )
      
      new Bot(customOptions, openaiOptions)
      
      expect(mockChatGPTAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiBaseUrl: 'https://custom-api.com/v1'
        })
      )
    })

    it('should throw error when OPENAI_API_KEY is missing', () => {
      delete process.env.OPENAI_API_KEY
      
      expect(() => new Bot(options, openaiOptions)).toThrow(
        "Unable to initialize the OpenAI API, both 'OPENAI_API_KEY' environment variable are not available"
      )
    })

    it('should handle empty OPENAI_API_KEY', () => {
      process.env.OPENAI_API_KEY = ''
      
      expect(() => new Bot(options, openaiOptions)).toThrow()
    })
  })

  describe('chat', () => {
    let bot: Bot

    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key'
      bot = new Bot(options, openaiOptions)
    })

    it('should successfully chat and return response', async () => {
      const mockResponse = {
        text: 'Test response',
        id: 'msg-123',
        conversationId: 'conv-456'
      }
      mockSendMessage.mockResolvedValue(mockResponse as any)

      const [response, ids] = await bot.chat('Test message', {})

      expect(response).toBe('Test response')
      expect(ids).toEqual({
        parentMessageId: 'msg-123',
        conversationId: 'conv-456'
      })
      expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('response:'))
      expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('response time:'))
    })

    it('should handle empty message', async () => {
      const [response, ids] = await bot.chat('', {})

      expect(response).toBe('')
      expect(ids).toEqual({})
      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should handle null response', async () => {
      mockSendMessage.mockResolvedValue(null as any)

      const [response, ids] = await bot.chat('Test message', {})

      expect(response).toBe('')
      expect(ids).toEqual({
        parentMessageId: undefined,
        conversationId: undefined
      })
      expect(mockWarning).toHaveBeenCalledWith('openai response is null')
    })

    it('should use parent message ID when provided', async () => {
      const mockResponse = { text: 'Response', id: 'new-msg', conversationId: 'conv' }
      mockSendMessage.mockResolvedValue(mockResponse as any)

      await bot.chat('Test message', { parentMessageId: 'parent-123' })

      expect(mockSendMessage).toHaveBeenCalledWith('Test message', {
        timeoutMs: 120000,
        parentMessageId: 'parent-123'
      })
    })

    it('should not include parentMessageId when not provided', async () => {
      const mockResponse = { text: 'Response', id: 'new-msg', conversationId: 'conv' }
      mockSendMessage.mockResolvedValue(mockResponse as any)

      await bot.chat('Test message', {})

      expect(mockSendMessage).toHaveBeenCalledWith('Test message', {
        timeoutMs: 120000
      })
    })

    it('should handle ChatGPTError', async () => {
      const ChatGPTError = (jest.requireMock('chatgpt') as any).ChatGPTError
      const error = new ChatGPTError('API Error')
      mockSendMessage.mockRejectedValue(error as any)

      const [response, ids] = await bot.chat('Test message', {})

      expect(response).toBe('')
      expect(ids).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith('openai response is null')
      expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('failed to send message to openai'))
    })

    it('should retry on failure with p-retry', async () => {
      const mockResponse = { text: 'Success after retry', id: 'msg', conversationId: 'conv' }
      mockSendMessage.mockResolvedValue(mockResponse as any)

      await bot.chat('Test message', {})

      expect(mockPRetry).toHaveBeenCalledWith(expect.any(Function), {
        retries: 3
      })
    })

    it('should log API call details', async () => {
      const mockResponse = { text: 'Response', id: 'msg', conversationId: 'conv' }
      mockSendMessage.mockResolvedValue(mockResponse as any)

      await bot.chat('Test message', {})

      expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('response: '))
      expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('response time: '))
    })

    it('should remove "with " prefix from response', async () => {
      const mockResponse = { text: 'with Test response', id: 'msg', conversationId: 'conv' }
      mockSendMessage.mockResolvedValue(mockResponse as any)

      const [response] = await bot.chat('Test message', {})

      expect(response).toBe('Test response')
    })

    it('should not remove "with " if not at start', async () => {
      const mockResponse = { text: 'Response with something', id: 'msg', conversationId: 'conv' }
      mockSendMessage.mockResolvedValue(mockResponse as any)

      const [response] = await bot.chat('Test message', {})

      expect(response).toBe('Response with something')
    })

    it('should handle debug logging', async () => {
      const mockResponse = { text: 'Debug response', id: 'msg', conversationId: 'conv' }
      mockSendMessage.mockResolvedValue(mockResponse as any)

      await bot.chat('Test message', {})

      expect(mockInfo).toHaveBeenCalledWith('openai responses: Debug response')
    })

    it('should not debug log when debug is false', async () => {
      const nonDebugOptions = new Options(false, false, false, false)
      process.env.OPENAI_API_KEY = 'test-key'
      const nonDebugBot = new Bot(nonDebugOptions, openaiOptions)
      
      const mockResponse = { text: 'No debug response', id: 'msg', conversationId: 'conv' }
      mockSendMessage.mockResolvedValue(mockResponse as any)

      await nonDebugBot.chat('Test message', {})

      expect(mockInfo).not.toHaveBeenCalledWith('openai responses: No debug response')
    })

    it('should handle API initialization failure', async () => {
      // Create bot with null API (should not happen in practice due to constructor check)
      const botWithNullApi = new Bot(options, openaiOptions)
      ;(botWithNullApi as any)['api'] = null

      await botWithNullApi.chat('Test message', {})

      expect(mockSetFailed).toHaveBeenCalledWith('The OpenAI API is not initialized')
    })

    it('should handle complex conversation IDs', async () => {
      const complexIds: Ids = {
        parentMessageId: 'complex-parent-123',
        conversationId: 'complex-conv-456'
      }
      const mockResponse = { 
        text: 'Complex response', 
        id: 'new-complex-msg', 
        conversationId: 'updated-conv' 
      }
      mockSendMessage.mockResolvedValue(mockResponse as any)

      const [response, newIds] = await bot.chat('Test message', complexIds)

      expect(response).toBe('Complex response')
      expect(newIds).toEqual({
        parentMessageId: 'new-complex-msg',
        conversationId: 'updated-conv'
      })
    })
  })

  describe('error handling', () => {
    let bot: Bot

    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key'
      bot = new Bot(options, openaiOptions)
    })

    it('should handle sendMessage throwing generic error', async () => {
      const error = new Error('Network error')
      mockPRetry.mockImplementation(() => Promise.reject(error) as any)

      const [response, ids] = await bot.chat('Test message', {})

      expect(response).toBe('')
      expect(ids).toEqual({})
    })

    it('should handle sendMessage throwing ChatGPTError with detailed logging', async () => {
      const ChatGPTError = (jest.requireMock('chatgpt') as any).ChatGPTError
      const error = new ChatGPTError('Detailed API Error')
      error.stack = 'Error stack trace'
      mockPRetry.mockImplementation(() => Promise.reject(error) as any)

      await bot.chat('Test message', {})

      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('failed to send message to openai')
      )
    })

    it('should measure response time even on error', async () => {
      const error = new Error('Test error')
      mockPRetry.mockImplementation(() => Promise.reject(error) as any)

      await bot.chat('Test message', {})

      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('response time:')
      )
    })
  })
})