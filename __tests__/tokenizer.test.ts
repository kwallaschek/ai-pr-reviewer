import { describe, it, expect } from '@jest/globals'
import { encode, getTokenCount } from '../src/tokenizer'

describe('tokenizer', () => {
  describe('encode', () => {
    it('should encode simple text', () => {
      const result = encode('hello world')
      expect(result).toBeInstanceOf(Uint32Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should encode empty string', () => {
      const result = encode('')
      expect(result).toBeInstanceOf(Uint32Array)
      expect(result.length).toBe(0)
    })

    it('should encode special characters', () => {
      const result = encode('!@#$%^&*()_+-={}[]|;:,.<>?')
      expect(result).toBeInstanceOf(Uint32Array)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should encode unicode characters', () => {
      const result = encode('🚀 Hello 世界')
      expect(result).toBeInstanceOf(Uint32Array)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getTokenCount', () => {
    it('should count tokens for simple text', () => {
      const count = getTokenCount('hello world')
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThan(0)
    })

    it('should return 0 for empty string', () => {
      const count = getTokenCount('')
      expect(count).toBe(0)
    })

    it('should remove endoftext tokens', () => {
      const withoutEndToken = getTokenCount('hello world')
      const withEndToken = getTokenCount('hello<|endoftext|> world')
      expect(withEndToken).toBe(withoutEndToken)
    })

    it('should handle multiple endoftext tokens', () => {
      const normal = getTokenCount('hello world test')
      const withMultipleTokens = getTokenCount('hello<|endoftext|> world<|endoftext|> test')
      expect(withMultipleTokens).toBe(normal)
    })

    it('should handle long text', () => {
      const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100)
      const count = getTokenCount(longText)
      expect(count).toBeGreaterThan(100)
    })

    it('should handle code snippets', () => {
      const code = `
        function hello() {
          console.log("Hello, world!");
          return true;
        }
      `
      const count = getTokenCount(code)
      expect(count).toBeGreaterThan(0)
    })

    it('should handle markdown content', () => {
      const markdown = `
        # Title
        ## Subtitle
        - List item 1
        - List item 2
        \`\`\`javascript
        console.log('hello');
        \`\`\`
      `
      const count = getTokenCount(markdown)
      expect(count).toBeGreaterThan(0)
    })
  })
})