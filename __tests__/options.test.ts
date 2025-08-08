import { describe, test, expect } from '@jest/globals'
import { Options, OpenAIOptions } from '../src/options'
import { TokenLimits } from '../src/limits'

describe('Options', () => {
  describe('GPT-5 Integration Tests', () => {
    test('should create Options with GPT-5 as light model', () => {
      const options = new Options(
        false, // debug
        false, // disableReview
        false, // disableReleaseNotes
        false, // disableReleaseSummary
        '0',   // maxFiles
        false, // reviewSimpleChanges
        false, // reviewCommentLGTM
        null,  // pathFilters
        '',    // systemMessage
        'gpt-5' // openaiLightModel
      )

      expect(options.openaiLightModel).toBe('gpt-5')
      expect(options.lightTokenLimits.maxTokens).toBe(200000)
      expect(options.lightTokenLimits.responseTokens).toBe(8192)
      expect(options.lightTokenLimits.knowledgeCutOff).toBe('2024-04-01')
    })

    test('should create Options with GPT-5 as heavy model', () => {
      const options = new Options(
        false, // debug
        false, // disableReview
        false, // disableReleaseNotes
        false, // disableReleaseSummary
        '0',   // maxFiles
        false, // reviewSimpleChanges
        false, // reviewCommentLGTM
        null,  // pathFilters
        '',    // systemMessage
        'gpt-3.5-turbo', // openaiLightModel
        'gpt-5' // openaiHeavyModel
      )

      expect(options.openaiHeavyModel).toBe('gpt-5')
      expect(options.heavyTokenLimits.maxTokens).toBe(200000)
      expect(options.heavyTokenLimits.responseTokens).toBe(8192)
      expect(options.heavyTokenLimits.knowledgeCutOff).toBe('2024-04-01')
    })

    test('should handle both light and heavy models as GPT-5', () => {
      const options = new Options(
        false, // debug
        false, // disableReview
        false, // disableReleaseNotes
        false, // disableReleaseSummary
        '0',   // maxFiles
        false, // reviewSimpleChanges
        false, // reviewCommentLGTM
        null,  // pathFilters
        '',    // systemMessage
        'gpt-5', // openaiLightModel
        'gpt-5'  // openaiHeavyModel
      )

      expect(options.openaiLightModel).toBe('gpt-5')
      expect(options.openaiHeavyModel).toBe('gpt-5')
      expect(options.lightTokenLimits.maxTokens).toBe(200000)
      expect(options.heavyTokenLimits.maxTokens).toBe(200000)
      
      // Both should have the same GPT-5 configuration
      expect(options.lightTokenLimits.responseTokens).toBe(8192)
      expect(options.heavyTokenLimits.responseTokens).toBe(8192)
      expect(options.lightTokenLimits.knowledgeCutOff).toBe('2024-04-01')
      expect(options.heavyTokenLimits.knowledgeCutOff).toBe('2024-04-01')
    })

    test('should create separate TokenLimits instances for light and heavy models', () => {
      const options = new Options(
        false, false, false, false, '0', false, false, null, '',
        'gpt-5', 'gpt-4'
      )

      // Verify they are different instances
      expect(options.lightTokenLimits).not.toBe(options.heavyTokenLimits)
      
      // Verify correct configurations
      expect(options.lightTokenLimits.maxTokens).toBe(200000) // GPT-5
      expect(options.heavyTokenLimits.maxTokens).toBe(8000)   // GPT-4
    })
  })

  describe('Model Configuration Tests', () => {
    test('should use default models when not specified', () => {
      const options = new Options(false, false, false, false)

      expect(options.openaiLightModel).toBe('gpt-3.5-turbo')
      expect(options.openaiHeavyModel).toBe('gpt-3.5-turbo')
    })

    test('should handle all supported models correctly', () => {
      const supportedModels = [
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
        'gpt-4',
        'gpt-4-32k',
        'gpt-4o',
        'gpt-5'
      ]

      supportedModels.forEach(model => {
        const options = new Options(
          false, false, false, false, '0', false, false, null, '',
          model, model
        )

        expect(options.openaiLightModel).toBe(model)
        expect(options.openaiHeavyModel).toBe(model)
        expect(options.lightTokenLimits).toBeInstanceOf(TokenLimits)
        expect(options.heavyTokenLimits).toBeInstanceOf(TokenLimits)
        
        // Verify token limits are properly configured
        expect(options.lightTokenLimits.maxTokens).toBeGreaterThan(0)
        expect(options.heavyTokenLimits.maxTokens).toBeGreaterThan(0)
      })
    })

    test('should handle model temperature parsing', () => {
      const options = new Options(
        false, false, false, false, '0', false, false, null, '',
        'gpt-5', 'gpt-5', '0.7' // temperature
      )

      expect(options.openaiModelTemperature).toBe(0.7)
    })

    test('should parse numeric configuration correctly with GPT-5', () => {
      const options = new Options(
        true,    // debug
        false,   // disableReview
        false,   // disableReleaseNotes
        false,   // disableReleaseSummary
        '150',   // maxFiles
        true,    // reviewSimpleChanges
        true,    // reviewCommentLGTM
        ['*.ts'], // pathFilters
        'custom system message',
        'gpt-5', // light model
        'gpt-5', // heavy model
        '0.2',   // temperature
        '5',     // retries
        '180000', // timeout
        '10',    // openai concurrency
        '8'      // github concurrency
      )

      expect(options.debug).toBe(true)
      expect(options.maxFiles).toBe(150)
      expect(options.reviewSimpleChanges).toBe(true)
      expect(options.reviewCommentLGTM).toBe(true)
      expect(options.openaiModelTemperature).toBe(0.2)
      expect(options.openaiRetries).toBe(5)
      expect(options.openaiTimeoutMS).toBe(180000)
      expect(options.openaiConcurrencyLimit).toBe(10)
      expect(options.githubConcurrencyLimit).toBe(8)
    })
  })

  describe('Print Functionality', () => {
    test('should include GPT-5 models in print output', () => {
      // Create the options and verify properties directly
      const options = new Options(
        false, false, false, false, '0', false, false, null, '',
        'gpt-5', 'gpt-5'
      )

      // Verify the options contain GPT-5 configuration
      expect(options.openaiLightModel).toBe('gpt-5')
      expect(options.openaiHeavyModel).toBe('gpt-5')
      
      // Verify token limits string representation includes GPT-5 values
      const lightLimitsString = options.lightTokenLimits.string()
      const heavyLimitsString = options.heavyTokenLimits.string()
      
      expect(lightLimitsString).toContain('max_tokens=200000')
      expect(lightLimitsString).toContain('response_tokens=8192')
      expect(heavyLimitsString).toContain('max_tokens=200000')
      expect(heavyLimitsString).toContain('response_tokens=8192')
    })
  })
})

describe('OpenAIOptions', () => {
  describe('GPT-5 Configuration', () => {
    test('should create OpenAIOptions with GPT-5 model', () => {
      const openaiOptions = new OpenAIOptions('gpt-5')

      expect(openaiOptions.model).toBe('gpt-5')
      expect(openaiOptions.tokenLimits).toBeInstanceOf(TokenLimits)
      expect(openaiOptions.tokenLimits.maxTokens).toBe(200000)
      expect(openaiOptions.tokenLimits.responseTokens).toBe(8192)
    })

    test('should create OpenAIOptions with custom TokenLimits', () => {
      const customLimits = new TokenLimits('gpt-5')
      const openaiOptions = new OpenAIOptions('gpt-5', customLimits)

      expect(openaiOptions.model).toBe('gpt-5')
      expect(openaiOptions.tokenLimits).toBe(customLimits)
      expect(openaiOptions.tokenLimits.maxTokens).toBe(200000)
    })

    test('should use default configuration when no parameters provided', () => {
      const openaiOptions = new OpenAIOptions()

      expect(openaiOptions.model).toBe('gpt-3.5-turbo')
      expect(openaiOptions.tokenLimits.maxTokens).toBe(4000)
    })

    test('should handle null tokenLimits parameter', () => {
      const openaiOptions = new OpenAIOptions('gpt-5', null)

      expect(openaiOptions.model).toBe('gpt-5')
      expect(openaiOptions.tokenLimits).toBeInstanceOf(TokenLimits)
      expect(openaiOptions.tokenLimits.maxTokens).toBe(200000)
    })
  })
})