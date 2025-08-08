import { describe, it, expect } from '@jest/globals'
import { TokenLimits } from '../src/limits'

describe('TokenLimits', () => {
  describe('constructor', () => {
    it('should set default values for gpt-3.5-turbo', () => {
      const limits = new TokenLimits()
      expect(limits.maxTokens).toBe(4000)
      expect(limits.responseTokens).toBe(1000)
      expect(limits.requestTokens).toBe(2900)
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    it('should set values for gpt-3.5-turbo explicitly', () => {
      const limits = new TokenLimits('gpt-3.5-turbo')
      expect(limits.maxTokens).toBe(4000)
      expect(limits.responseTokens).toBe(1000)
      expect(limits.requestTokens).toBe(2900)
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    it('should set values for gpt-3.5-turbo-16k', () => {
      const limits = new TokenLimits('gpt-3.5-turbo-16k')
      expect(limits.maxTokens).toBe(16300)
      expect(limits.responseTokens).toBe(3000)
      expect(limits.requestTokens).toBe(13200)
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    it('should set values for gpt-4', () => {
      const limits = new TokenLimits('gpt-4')
      expect(limits.maxTokens).toBe(8000)
      expect(limits.responseTokens).toBe(2000)
      expect(limits.requestTokens).toBe(5900)
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    it('should set values for gpt-4-32k', () => {
      const limits = new TokenLimits('gpt-4-32k')
      expect(limits.maxTokens).toBe(32600)
      expect(limits.responseTokens).toBe(4000)
      expect(limits.requestTokens).toBe(28500)
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    it('should set values for gpt-4o', () => {
      const limits = new TokenLimits('gpt-4o')
      expect(limits.maxTokens).toBe(128000)
      expect(limits.responseTokens).toBe(4096)
      expect(limits.requestTokens).toBe(123804)
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    it('should handle unknown model', () => {
      const limits = new TokenLimits('unknown-model')
      expect(limits.maxTokens).toBe(4000)
      expect(limits.responseTokens).toBe(1000)
      expect(limits.requestTokens).toBe(2900)
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    it('should handle empty string model', () => {
      const limits = new TokenLimits('')
      expect(limits.maxTokens).toBe(4000)
      expect(limits.responseTokens).toBe(1000)
      expect(limits.requestTokens).toBe(2900)
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    it('should calculate requestTokens correctly', () => {
      const limits = new TokenLimits('gpt-4')
      // requestTokens = maxTokens - responseTokens - 100
      const expected = limits.maxTokens - limits.responseTokens - 100
      expect(limits.requestTokens).toBe(expected)
    })
  })

  describe('string', () => {
    it('should return formatted string with all token limits', () => {
      const limits = new TokenLimits('gpt-4')
      const result = limits.string()
      expect(result).toBe('max_tokens=8000, request_tokens=5900, response_tokens=2000')
    })

    it('should format different models correctly', () => {
      const limitsGPT35 = new TokenLimits('gpt-3.5-turbo')
      expect(limitsGPT35.string()).toBe('max_tokens=4000, request_tokens=2900, response_tokens=1000')

      const limitsGPT4 = new TokenLimits('gpt-4-32k')
      expect(limitsGPT4.string()).toBe('max_tokens=32600, request_tokens=28500, response_tokens=4000')
    })

    it('should handle gpt-4o formatting', () => {
      const limits = new TokenLimits('gpt-4o')
      expect(limits.string()).toBe('max_tokens=128000, request_tokens=123804, response_tokens=4096')
    })
  })
})