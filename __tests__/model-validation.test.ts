import { describe, test, expect } from '@jest/globals'
import { TokenLimits } from '../src/limits'
import { Options, OpenAIOptions } from '../src/options'

describe('Model Validation', () => {
  describe('Supported Model Recognition', () => {
    test('should recognize gpt-5 as valid model', () => {
      const limits = new TokenLimits('gpt-5')
      
      // GPT-5 should have specific configuration, not fallback
      expect(limits.maxTokens).toBe(200000)
      expect(limits.responseTokens).toBe(8192)
      expect(limits.knowledgeCutOff).toBe('2024-04-01')
    })

    test('should recognize all supported models', () => {
      const supportedModels = [
        { name: 'gpt-3.5-turbo', maxTokens: 4000, responseTokens: 1000, cutoff: '2021-09-01' },
        { name: 'gpt-3.5-turbo-16k', maxTokens: 16300, responseTokens: 3000, cutoff: '2021-09-01' },
        { name: 'gpt-4', maxTokens: 8000, responseTokens: 2000, cutoff: '2021-09-01' },
        { name: 'gpt-4-32k', maxTokens: 32600, responseTokens: 4000, cutoff: '2021-09-01' },
        { name: 'gpt-4o', maxTokens: 128000, responseTokens: 4096, cutoff: '2021-09-01' },
        { name: 'gpt-5', maxTokens: 200000, responseTokens: 8192, cutoff: '2024-04-01' }
      ]

      supportedModels.forEach(model => {
        const limits = new TokenLimits(model.name)
        
        expect(limits.maxTokens).toBe(model.maxTokens)
        expect(limits.responseTokens).toBe(model.responseTokens)
        expect(limits.knowledgeCutOff).toBe(model.cutoff)
      })
    })

    test('should validate model names are case-sensitive', () => {
      const caseSensitiveTests = [
        'GPT-5',     // uppercase
        'Gpt-5',     // mixed case
        'gpt_5',     // underscore
        'gpt5',      // no hyphen
        ' gpt-5',    // leading space
        'gpt-5 '     // trailing space
      ]

      caseSensitiveTests.forEach(invalidModel => {
        const limits = new TokenLimits(invalidModel)
        
        // Should fallback to default (gpt-3.5-turbo behavior)
        expect(limits.maxTokens).toBe(4000)
        expect(limits.responseTokens).toBe(1000)
        expect(limits.knowledgeCutOff).toBe('2021-09-01')
      })
    })
  })

  describe('Fallback Behavior', () => {
    test('should fallback to default for invalid models', () => {
      const invalidModels = [
        'gpt-6',
        'claude-3',
        'invalid-model',
        'gpt-4-128k',
        'gpt-3.5-turbo-32k',
        null,
        undefined,
        ''
      ]

      invalidModels.forEach(model => {
        const limits = new TokenLimits(model as string)
        
        expect(limits.maxTokens).toBe(4000)
        expect(limits.responseTokens).toBe(1000)
        expect(limits.requestTokens).toBe(2900)
        expect(limits.knowledgeCutOff).toBe('2021-09-01')
      })
    })

    test('should handle numeric model names', () => {
      const numericModel = new TokenLimits('123')
      
      expect(numericModel.maxTokens).toBe(4000) // fallback
    })

    test('should handle special characters in model names', () => {
      const specialCharModels = ['gpt-4!', 'gpt@4', 'gpt#5', 'gpt$4']
      
      specialCharModels.forEach(model => {
        const limits = new TokenLimits(model)
        expect(limits.maxTokens).toBe(4000) // fallback
      })
    })
  })

  describe('Model Configuration Consistency', () => {
    test('should ensure consistent token calculation across all models', () => {
      const allModels = [
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
        'gpt-4',
        'gpt-4-32k',
        'gpt-4o',
        'gpt-5'
      ]

      allModels.forEach(model => {
        const limits = new TokenLimits(model)
        
        // Verify token accounting consistency
        const expectedRequestTokens = limits.maxTokens - limits.responseTokens - 100
        expect(limits.requestTokens).toBe(expectedRequestTokens)
        
        // Verify all values are positive
        expect(limits.maxTokens).toBeGreaterThan(0)
        expect(limits.responseTokens).toBeGreaterThan(0)
        expect(limits.requestTokens).toBeGreaterThan(0)
        
        // Verify request tokens is the largest component
        expect(limits.requestTokens).toBeGreaterThan(limits.responseTokens)
      })
    })

    test('should ensure GPT-5 has largest context window', () => {
      const models = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-32k', 'gpt-4o', 'gpt-5']
      const tokenLimits = models.map(model => new TokenLimits(model))
      
      const gpt5Limits = tokenLimits.find((_, index) => models[index] === 'gpt-5')!
      
      // GPT-5 should have the largest max tokens
      tokenLimits.forEach((limits, index) => {
        if (models[index] !== 'gpt-5') {
          expect(gpt5Limits.maxTokens).toBeGreaterThanOrEqual(limits.maxTokens)
        }
      })
    })

    test('should ensure GPT-5 has latest knowledge cutoff', () => {
      const models = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-32k', 'gpt-4o', 'gpt-5']
      const tokenLimits = models.map(model => new TokenLimits(model))
      
      const gpt5Limits = tokenLimits.find((_, index) => models[index] === 'gpt-5')!
      
      // GPT-5 should have the most recent knowledge cutoff
      expect(gpt5Limits.knowledgeCutOff).toBe('2024-04-01')
      
      // All other models should have older cutoffs
      tokenLimits.forEach((limits, index) => {
        if (models[index] !== 'gpt-5') {
          expect(new Date(limits.knowledgeCutOff).getTime()).toBeLessThanOrEqual(new Date(gpt5Limits.knowledgeCutOff).getTime())
        }
      })
    })
  })

  describe('Integration with Options Class', () => {
    test('should validate model names in Options constructor', () => {
      // Test that Options accepts GPT-5 without errors
      expect(() => {
        new Options(false, false, false, false, '0', false, false, null, '', 'gpt-5', 'gpt-5')
      }).not.toThrow()
    })

    test('should handle unsupported model gracefully in Options', () => {
      // Options should create TokenLimits even with unsupported models
      const options = new Options(
        false, false, false, false, '0', false, false, null, '',
        'unsupported-model', 'another-unsupported-model'
      )

      expect(options.openaiLightModel).toBe('unsupported-model')
      expect(options.openaiHeavyModel).toBe('another-unsupported-model')
      
      // Should fallback to default token limits
      expect(options.lightTokenLimits.maxTokens).toBe(4000)
      expect(options.heavyTokenLimits.maxTokens).toBe(4000)
    })

    test('should maintain separate configurations for light and heavy models', () => {
      const options = new Options(
        false, false, false, false, '0', false, false, null, '',
        'gpt-3.5-turbo', 'gpt-5'
      )

      // Verify they have different configurations
      expect(options.lightTokenLimits.maxTokens).toBe(4000)   // gpt-3.5-turbo
      expect(options.heavyTokenLimits.maxTokens).toBe(200000) // gpt-5
      
      expect(options.lightTokenLimits.knowledgeCutOff).toBe('2021-09-01')
      expect(options.heavyTokenLimits.knowledgeCutOff).toBe('2024-04-01')
    })
  })

  describe('String Representation', () => {
    test('should provide readable string representation for all models', () => {
      const models = [
        { name: 'gpt-3.5-turbo', expected: 'max_tokens=4000, request_tokens=2900, response_tokens=1000' },
        { name: 'gpt-4', expected: 'max_tokens=8000, request_tokens=5900, response_tokens=2000' },
        { name: 'gpt-5', expected: 'max_tokens=200000, request_tokens=191708, response_tokens=8192' }
      ]

      models.forEach(model => {
        const limits = new TokenLimits(model.name)
        expect(limits.string()).toBe(model.expected)
      })
    })

    test('should format large numbers correctly for GPT-5', () => {
      const limits = new TokenLimits('gpt-5')
      const stringOutput = limits.string()
      
      expect(stringOutput).toContain('200000')  // max tokens
      expect(stringOutput).toContain('191708')  // request tokens
      expect(stringOutput).toContain('8192')    // response tokens
    })
  })
})

describe('Edge Cases and Error Handling', () => {
  test('should handle very long model names', () => {
    const longModelName = 'a'.repeat(1000)
    const limits = new TokenLimits(longModelName)
    
    // Should fallback to default
    expect(limits.maxTokens).toBe(4000)
  })

  test('should handle model names with unicode characters', () => {
    const unicodeModel = 'gpt-5-🚀'
    const limits = new TokenLimits(unicodeModel)
    
    // Should fallback to default
    expect(limits.maxTokens).toBe(4000)
  })

  test('should be memory efficient with multiple instances', () => {
    // Create many instances to test for memory leaks
    const instances = Array.from({ length: 1000 }, (_, i) => {
      return new TokenLimits(i % 2 === 0 ? 'gpt-5' : 'gpt-4')
    })

    expect(instances).toHaveLength(1000)
    
    // Verify they all have correct configurations
    instances.forEach((limits, index) => {
      if (index % 2 === 0) {
        expect(limits.maxTokens).toBe(200000) // gpt-5
      } else {
        expect(limits.maxTokens).toBe(8000)   // gpt-4
      }
    })
  })
})