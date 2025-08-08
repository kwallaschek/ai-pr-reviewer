import { describe, test, expect } from '@jest/globals'
import { TokenLimits } from '../src/limits'

describe('TokenLimits', () => {
  describe('GPT-5 Model Configuration', () => {
    test('should configure GPT-5 with 200K max tokens', () => {
      const limits = new TokenLimits('gpt-5')
      
      expect(limits.maxTokens).toBe(200000)
    })

    test('should set GPT-5 response tokens to 8192', () => {
      const limits = new TokenLimits('gpt-5')
      
      expect(limits.responseTokens).toBe(8192)
    })

    test('should update knowledge cutoff to 2024-04-01 for GPT-5', () => {
      const limits = new TokenLimits('gpt-5')
      
      expect(limits.knowledgeCutOff).toBe('2024-04-01')
    })

    test('should calculate request tokens correctly for GPT-5', () => {
      const limits = new TokenLimits('gpt-5')
      const expectedRequestTokens = 200000 - 8192 - 100 // maxTokens - responseTokens - margin
      
      expect(limits.requestTokens).toBe(expectedRequestTokens)
      expect(limits.requestTokens).toBe(191708)
    })

    test('should format string output correctly for GPT-5', () => {
      const limits = new TokenLimits('gpt-5')
      const expected = 'max_tokens=200000, request_tokens=191708, response_tokens=8192'
      
      expect(limits.string()).toBe(expected)
    })
  })

  describe('All Model Configurations', () => {
    test('should configure GPT-4-32k correctly', () => {
      const limits = new TokenLimits('gpt-4-32k')
      
      expect(limits.maxTokens).toBe(32600)
      expect(limits.responseTokens).toBe(4000)
      expect(limits.requestTokens).toBe(28500) // 32600 - 4000 - 100
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    test('should configure GPT-3.5-turbo-16k correctly', () => {
      const limits = new TokenLimits('gpt-3.5-turbo-16k')
      
      expect(limits.maxTokens).toBe(16300)
      expect(limits.responseTokens).toBe(3000)
      expect(limits.requestTokens).toBe(13200) // 16300 - 3000 - 100
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    test('should configure GPT-4 correctly', () => {
      const limits = new TokenLimits('gpt-4')
      
      expect(limits.maxTokens).toBe(8000)
      expect(limits.responseTokens).toBe(2000)
      expect(limits.requestTokens).toBe(5900) // 8000 - 2000 - 100
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    test('should configure GPT-4o correctly', () => {
      const limits = new TokenLimits('gpt-4o')
      
      expect(limits.maxTokens).toBe(128000)
      expect(limits.responseTokens).toBe(4096)
      expect(limits.requestTokens).toBe(123804) // 128000 - 4096 - 100
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    test('should use default configuration for GPT-3.5-turbo', () => {
      const limits = new TokenLimits('gpt-3.5-turbo')
      
      expect(limits.maxTokens).toBe(4000)
      expect(limits.responseTokens).toBe(1000)
      expect(limits.requestTokens).toBe(2900) // 4000 - 1000 - 100
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    test('should use default configuration when no model specified', () => {
      const limits = new TokenLimits()
      
      expect(limits.maxTokens).toBe(4000)
      expect(limits.responseTokens).toBe(1000)
      expect(limits.requestTokens).toBe(2900)
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    test('should fallback to default for unknown model', () => {
      const limits = new TokenLimits('unknown-model')
      
      expect(limits.maxTokens).toBe(4000)
      expect(limits.responseTokens).toBe(1000)
      expect(limits.requestTokens).toBe(2900)
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })
  })

  describe('Edge Cases and Validation', () => {
    test('should handle case-sensitive model names', () => {
      const limits = new TokenLimits('GPT-5') // uppercase
      
      // Should fallback to default since it's case-sensitive
      expect(limits.maxTokens).toBe(4000)
      expect(limits.responseTokens).toBe(1000)
    })

    test('should handle empty string model', () => {
      const limits = new TokenLimits('')
      
      expect(limits.maxTokens).toBe(4000)
      expect(limits.responseTokens).toBe(1000)
      expect(limits.knowledgeCutOff).toBe('2021-09-01')
    })

    test('should ensure request tokens are always positive', () => {
      const models = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-32k', 'gpt-4o', 'gpt-5']
      
      models.forEach(model => {
        const limits = new TokenLimits(model)
        expect(limits.requestTokens).toBeGreaterThan(0)
        expect(limits.requestTokens).toBe(limits.maxTokens - limits.responseTokens - 100)
      })
    })

    test('should maintain consistent token accounting', () => {
      const limits = new TokenLimits('gpt-5')
      const totalAccounted = limits.requestTokens + limits.responseTokens + 100 // margin
      
      expect(totalAccounted).toBe(limits.maxTokens)
    })
  })
})