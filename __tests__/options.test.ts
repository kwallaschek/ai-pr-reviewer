import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { Options, PathFilter, OpenAIOptions } from '../src/options'

// Mock @actions/core
jest.mock('@actions/core', () => ({
  info: jest.fn()
}))

describe('PathFilter', () => {
  describe('constructor', () => {
    it('should handle null rules', () => {
      const filter = new PathFilter(null)
      expect(filter['rules']).toEqual([])
    })

    it('should handle empty array rules', () => {
      const filter = new PathFilter([])
      expect(filter['rules']).toEqual([])
    })

    it('should parse inclusion rules', () => {
      const filter = new PathFilter(['*.js', '*.ts'])
      expect(filter['rules']).toEqual([
        ['*.js', false],
        ['*.ts', false]
      ])
    })

    it('should parse exclusion rules', () => {
      const filter = new PathFilter(['!*.test.js', '!node_modules/**'])
      expect(filter['rules']).toEqual([
        ['*.test.js', true],
        ['node_modules/**', true]
      ])
    })

    it('should parse mixed rules', () => {
      const filter = new PathFilter(['src/**/*.js', '!**/*.test.js', 'lib/*.ts'])
      expect(filter['rules']).toEqual([
        ['src/**/*.js', false],
        ['**/*.test.js', true],
        ['lib/*.ts', false]
      ])
    })

    it('should trim whitespace from rules', () => {
      const filter = new PathFilter(['  *.js  ', ' !*.test.js ', ''])
      expect(filter['rules']).toEqual([
        ['*.js', false],
        ['*.test.js', true]
      ])
    })

    it('should handle empty strings', () => {
      const filter = new PathFilter(['', '  ', '\t', 'valid.js'])
      expect(filter['rules']).toEqual([['valid.js', false]])
    })
  })

  describe('check', () => {
    it('should return true when no rules exist', () => {
      const filter = new PathFilter([])
      expect(filter.check('any/path.js')).toBe(true)
    })

    it('should include files matching inclusion rules', () => {
      const filter = new PathFilter(['*.js'])
      expect(filter.check('test.js')).toBe(true)
      expect(filter.check('app.js')).toBe(true)
      expect(filter.check('src/app.js')).toBe(false) // doesn't match *.js pattern
    })

    it('should exclude files matching exclusion rules', () => {
      const filter = new PathFilter(['!*.test.js'])
      expect(filter.check('app.test.js')).toBe(false)
      expect(filter.check('component.test.js')).toBe(false)
    })

    it('should handle complex inclusion/exclusion logic', () => {
      const filter = new PathFilter(['src/**/*.js', '!**/*.test.js'])
      expect(filter.check('src/app.js')).toBe(true)
      expect(filter.check('src/components/Button.js')).toBe(true)
      expect(filter.check('src/app.test.js')).toBe(false) // excluded by !**/*.test.js
      expect(filter.check('lib/util.js')).toBe(false) // doesn't match src/**/*.js pattern
    })

    it('should prioritize exclusion over inclusion', () => {
      const filter = new PathFilter(['*.js', '!*.test.js'])
      expect(filter.check('app.js')).toBe(true)
      expect(filter.check('app.test.js')).toBe(false)
    })

    it('should handle wildcard patterns', () => {
      const filter = new PathFilter(['src/**/*', '!**/node_modules/**'])
      expect(filter.check('src/app.js')).toBe(true)
      expect(filter.check('src/components/Button.tsx')).toBe(true)
      expect(filter.check('src/node_modules/package/index.js')).toBe(false)
    })

    it('should handle multiple exclusion rules', () => {
      const filter = new PathFilter(['**/*', '!*.test.js', '!*.spec.js', '!dist/**'])
      expect(filter.check('src/app.js')).toBe(true)
      expect(filter.check('app.test.js')).toBe(false)
      expect(filter.check('app.spec.js')).toBe(false)
      expect(filter.check('dist/bundle.js')).toBe(false)
    })

    it('should handle only exclusion rules', () => {
      const filter = new PathFilter(['!*.test.js', '!dist/**'])
      expect(filter.check('app.js')).toBe(true)
      expect(filter.check('app.test.js')).toBe(false)
      expect(filter.check('dist/app.js')).toBe(false)
    })

    it('should handle edge cases with path patterns', () => {
      const filter = new PathFilter(['**/*.{js,ts}', '!**/*.{test,spec}.{js,ts}'])
      expect(filter.check('app.js')).toBe(true)
      expect(filter.check('app.ts')).toBe(true)
      expect(filter.check('app.test.js')).toBe(false)
      expect(filter.check('app.spec.ts')).toBe(false)
    })
  })
})

describe('OpenAIOptions', () => {
  describe('constructor', () => {
    it('should create with default values', () => {
      const options = new OpenAIOptions()
      expect(options.model).toBe('gpt-3.5-turbo')
      expect(options.tokenLimits.maxTokens).toBe(4000)
    })

    it('should create with custom model', () => {
      const options = new OpenAIOptions('gpt-4')
      expect(options.model).toBe('gpt-4')
      expect(options.tokenLimits.maxTokens).toBe(8000)
    })

    it('should create with custom token limits', () => {
      const customLimits = { maxTokens: 10000, responseTokens: 2000, requestTokens: 7900, knowledgeCutOff: '2023-01-01', string: () => 'custom' }
      const options = new OpenAIOptions('custom-model', customLimits)
      expect(options.model).toBe('custom-model')
      expect(options.tokenLimits).toBe(customLimits)
    })

    it('should handle null token limits', () => {
      const options = new OpenAIOptions('gpt-4', null)
      expect(options.model).toBe('gpt-4')
      expect(options.tokenLimits.maxTokens).toBe(8000)
    })
  })
})

describe('Options', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create with default values', () => {
      const options = new Options(false, false, false, false)
      expect(options.debug).toBe(false)
      expect(options.disableReview).toBe(false)
      expect(options.disableReleaseNotes).toBe(false)
      expect(options.disableReleaseSummary).toBe(false)
      expect(options.maxFiles).toBe(0)
      expect(options.reviewSimpleChanges).toBe(false)
      expect(options.reviewCommentLGTM).toBe(false)
      expect(options.systemMessage).toBe('')
      expect(options.openaiLightModel).toBe('gpt-3.5-turbo')
      expect(options.openaiHeavyModel).toBe('gpt-3.5-turbo')
      expect(options.openaiModelTemperature).toBe(0.0)
      expect(options.openaiRetries).toBe(3)
      expect(options.openaiTimeoutMS).toBe(120000)
      expect(options.openaiConcurrencyLimit).toBe(6)
      expect(options.githubConcurrencyLimit).toBe(6)
      expect(options.apiBaseUrl).toBe('https://api.openai.com/v1')
      expect(options.language).toBe('en-US')
    })

    it('should create with custom values', () => {
      const options = new Options(
        true,
        true,
        true,
        true,
        '50',
        true,
        true,
        ['src/**/*.js'],
        'custom system message',
        'gpt-4',
        'gpt-4-turbo',
        '0.7',
        '5',
        '300000',
        '10',
        '8',
        'https://custom-api.com/v1',
        'es-ES'
      )
      expect(options.debug).toBe(true)
      expect(options.disableReview).toBe(true)
      expect(options.disableReleaseNotes).toBe(true)
      expect(options.disableReleaseSummary).toBe(true)
      expect(options.maxFiles).toBe(50)
      expect(options.reviewSimpleChanges).toBe(true)
      expect(options.reviewCommentLGTM).toBe(true)
      expect(options.systemMessage).toBe('custom system message')
      expect(options.openaiLightModel).toBe('gpt-4')
      expect(options.openaiHeavyModel).toBe('gpt-4-turbo')
      expect(options.openaiModelTemperature).toBe(0.7)
      expect(options.openaiRetries).toBe(5)
      expect(options.openaiTimeoutMS).toBe(300000)
      expect(options.openaiConcurrencyLimit).toBe(10)
      expect(options.githubConcurrencyLimit).toBe(8)
      expect(options.apiBaseUrl).toBe('https://custom-api.com/v1')
      expect(options.language).toBe('es-ES')
    })

    it('should handle string number conversions', () => {
      const options = new Options(
        false, false, false, false,
        'not-a-number',
        false, false, null,
        '', 'gpt-3.5-turbo', 'gpt-3.5-turbo',
        'not-a-float',
        'not-an-int',
        'not-a-timeout',
        'not-concurrent',
        'not-github-concurrent'
      )
      expect(options.maxFiles).toBe(NaN)
      expect(options.openaiModelTemperature).toBe(NaN)
      expect(options.openaiRetries).toBe(NaN)
      expect(options.openaiTimeoutMS).toBe(NaN)
      expect(options.openaiConcurrencyLimit).toBe(NaN)
      expect(options.githubConcurrencyLimit).toBe(NaN)
    })

    it('should create token limits for both models', () => {
      const options = new Options(false, false, false, false)
      expect(options.lightTokenLimits).toBeDefined()
      expect(options.heavyTokenLimits).toBeDefined()
      expect(options.lightTokenLimits.maxTokens).toBe(4000)
      expect(options.heavyTokenLimits.maxTokens).toBe(4000)
    })
  })

  describe('print', () => {
    it('should print all option values', () => {
      const info = (jest.requireMock('@actions/core') as any).info
      const options = new Options(
        true, false, true, false, '25', true, false, ['*.js'], 
        'system msg', 'gpt-4', 'gpt-4-turbo', '0.5', '3', '180000', '8', '6'
      )
      
      options.print()
      
      expect(info).toHaveBeenCalledWith('debug: true')
      expect(info).toHaveBeenCalledWith('disable_review: false')
      expect(info).toHaveBeenCalledWith('disable_release_notes: true')
      expect(info).toHaveBeenCalledWith('disable_release_summary: false')
      expect(info).toHaveBeenCalledWith('max_files: 25')
      expect(info).toHaveBeenCalledWith('review_simple_changes: true')
      expect(info).toHaveBeenCalledWith('review_comment_lgtm: false')
      expect(info).toHaveBeenCalledWith('system_message: system msg')
      expect(info).toHaveBeenCalledWith('openai_light_model: gpt-4')
      expect(info).toHaveBeenCalledWith('openai_heavy_model: gpt-4-turbo')
      expect(info).toHaveBeenCalledWith('openai_model_temperature: 0.5')
      expect(info).toHaveBeenCalledWith('openai_retries: 3')
      expect(info).toHaveBeenCalledWith('openai_timeout_ms: 180000')
      expect(info).toHaveBeenCalledWith('openai_concurrency_limit: 8')
      expect(info).toHaveBeenCalledWith('github_concurrency_limit: 6')
      expect(info).toHaveBeenCalledWith('language: en-US')
    })
  })

  describe('checkPath', () => {
    it('should use path filter and log result', () => {
      const info = (jest.requireMock('@actions/core') as any).info
      const options = new Options(false, false, false, false, '0', false, false, ['*.js', '!*.test.js'])
      
      const result1 = options.checkPath('app.js')
      expect(result1).toBe(true)
      expect(info).toHaveBeenCalledWith('checking path: app.js => true')
      
      const result2 = options.checkPath('app.test.js')
      expect(result2).toBe(false)
      expect(info).toHaveBeenCalledWith('checking path: app.test.js => false')
    })

    it('should handle complex path patterns', () => {
      const info = (jest.requireMock('@actions/core') as any).info
      const options = new Options(false, false, false, false, '0', false, false, [
        'src/**/*.{js,ts}',
        '!**/*.{test,spec}.{js,ts}',
        '!dist/**',
        '!node_modules/**'
      ])
      
      expect(options.checkPath('src/components/Button.js')).toBe(true)
      expect(options.checkPath('src/utils/helper.ts')).toBe(true)
      expect(options.checkPath('src/components/Button.test.js')).toBe(false)
      expect(options.checkPath('dist/bundle.js')).toBe(false)
      expect(options.checkPath('node_modules/package/index.js')).toBe(false)
    })
  })
})