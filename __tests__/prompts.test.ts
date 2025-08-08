import { describe, it, expect, beforeEach } from '@jest/globals'
import { Prompts } from '../src/prompts'
import { Inputs } from '../src/inputs'

describe('Prompts', () => {
  let prompts: Prompts
  let inputs: Inputs

  beforeEach(() => {
    prompts = new Prompts('Custom summarize prompt', 'Custom release notes prompt')
    inputs = new Inputs(
      'Test System Message',
      'Test PR Title',
      'Test Description',
      'Test Raw Summary',
      'Test Short Summary',
      'test-file.js',
      'console.log("test");',
      '+console.log("test");',
      'test patches',
      'test diff',
      'test comment chain',
      'test comment'
    )
  })

  describe('constructor', () => {
    it('should create with default empty strings', () => {
      const emptyPrompts = new Prompts()
      expect(emptyPrompts.summarize).toBe('')
      expect(emptyPrompts.summarizeReleaseNotes).toBe('')
    })

    it('should create with custom values', () => {
      expect(prompts.summarize).toBe('Custom summarize prompt')
      expect(prompts.summarizeReleaseNotes).toBe('Custom release notes prompt')
    })
  })

  describe('static prompt templates', () => {
    it('should have summarizeFileDiff template', () => {
      expect(prompts.summarizeFileDiff).toContain('## GitHub PR Title')
      expect(prompts.summarizeFileDiff).toContain('$title')
      expect(prompts.summarizeFileDiff).toContain('$description')
      expect(prompts.summarizeFileDiff).toContain('$file_diff')
      expect(prompts.summarizeFileDiff).toContain('succinctly summarize the diff within 100 words')
    })

    it('should have triageFileDiff template', () => {
      expect(prompts.triageFileDiff).toContain('[TRIAGE]')
      expect(prompts.triageFileDiff).toContain('NEEDS_REVIEW')
      expect(prompts.triageFileDiff).toContain('APPROVED')
      expect(prompts.triageFileDiff).toContain('modifications to the logic or functionality')
    })

    it('should have summarizeChangesets template', () => {
      expect(prompts.summarizeChangesets).toContain('changesets in this pull request')
      expect(prompts.summarizeChangesets).toContain('$raw_summary')
      expect(prompts.summarizeChangesets).toContain('deduplicate and group together')
    })

    it('should have summarizePrefix template', () => {
      expect(prompts.summarizePrefix).toContain('summary of changes you have generated')
      expect(prompts.summarizePrefix).toContain('$raw_summary')
    })

    it('should have summarizeShort template', () => {
      expect(prompts.summarizeShort).toContain('concise summary of the changes')
      expect(prompts.summarizeShort).toContain('not exceed 500 words')
      expect(prompts.summarizeShort).toContain('stick to the facts')
    })

    it('should have reviewFileDiff template', () => {
      expect(prompts.reviewFileDiff).toContain('## GitHub PR Title')
      expect(prompts.reviewFileDiff).toContain('$title')
      expect(prompts.reviewFileDiff).toContain('$description')
      expect(prompts.reviewFileDiff).toContain('$short_summary')
      expect(prompts.reviewFileDiff).toContain('$patches')
      expect(prompts.reviewFileDiff).toContain('$filename')
      expect(prompts.reviewFileDiff).toContain('LGTM!')
      expect(prompts.reviewFileDiff).toContain('exact line number ranges')
    })

    it('should have comment template', () => {
      expect(prompts.comment).toContain('comment was made on a GitHub PR review')
      expect(prompts.comment).toContain('$filename')
      expect(prompts.comment).toContain('$title')
      expect(prompts.comment).toContain('$description')
      expect(prompts.comment).toContain('$short_summary')
      expect(prompts.comment).toContain('$file_diff')
      expect(prompts.comment).toContain('$diff')
      expect(prompts.comment).toContain('$comment_chain')
      expect(prompts.comment).toContain('$comment')
      expect(prompts.comment).toContain('@user')
    })
  })

  describe('renderSummarizeFileDiff', () => {
    it('should render template with triage when reviewSimpleChanges is false', () => {
      const result = prompts.renderSummarizeFileDiff(inputs, false)
      expect(result).toContain('Test PR Title')
      expect(result).toContain('Test Description')
      expect(result).toContain('+console.log("test");')
      expect(result).toContain('[TRIAGE]')
      expect(result).toContain('NEEDS_REVIEW')
    })

    it('should render template without triage when reviewSimpleChanges is true', () => {
      const result = prompts.renderSummarizeFileDiff(inputs, true)
      expect(result).toContain('Test PR Title')
      expect(result).toContain('Test Description')
      expect(result).toContain('+console.log("test");')
      expect(result).not.toContain('[TRIAGE]')
      expect(result).not.toContain('NEEDS_REVIEW')
    })

    it('should handle empty inputs gracefully', () => {
      const emptyInputs = new Inputs()
      const result = prompts.renderSummarizeFileDiff(emptyInputs, false)
      expect(result).toContain('no title provided')
      expect(result).toContain('no description provided')
      expect(result).toContain('file diff cannot be provided')
    })
  })

  describe('renderSummarizeChangesets', () => {
    it('should render changeset template with raw summary', () => {
      const result = prompts.renderSummarizeChangesets(inputs)
      expect(result).toContain('changesets in this pull request')
      expect(result).toContain('Test Raw Summary')
      expect(result).toContain('deduplicate and group together')
    })

    it('should handle empty raw summary', () => {
      const emptyInputs = new Inputs()
      const result = prompts.renderSummarizeChangesets(emptyInputs)
      expect(result).toContain('changesets in this pull request')
      // Empty raw summary should not be replaced
      expect(result).toContain('$raw_summary')
    })
  })

  describe('renderSummarize', () => {
    it('should combine prefix with custom summarize prompt', () => {
      const result = prompts.renderSummarize(inputs)
      expect(result).toContain('summary of changes you have generated')
      expect(result).toContain('Test Raw Summary')
      expect(result).toContain('Custom summarize prompt')
    })

    it('should handle empty summarize prompt', () => {
      const emptyPrompts = new Prompts()
      const result = emptyPrompts.renderSummarize(inputs)
      expect(result).toContain('summary of changes you have generated')
      expect(result).toContain('Test Raw Summary')
      // Empty summarize prompt should still be included
      expect(result).toContain('')
    })
  })

  describe('renderSummarizeShort', () => {
    it('should combine prefix with short summary template', () => {
      const result = prompts.renderSummarizeShort(inputs)
      expect(result).toContain('summary of changes you have generated')
      expect(result).toContain('Test Raw Summary')
      expect(result).toContain('concise summary of the changes')
      expect(result).toContain('not exceed 500 words')
    })
  })

  describe('renderSummarizeReleaseNotes', () => {
    it('should combine prefix with custom release notes prompt', () => {
      const result = prompts.renderSummarizeReleaseNotes(inputs)
      expect(result).toContain('summary of changes you have generated')
      expect(result).toContain('Test Raw Summary')
      expect(result).toContain('Custom release notes prompt')
    })

    it('should handle empty release notes prompt', () => {
      const emptyPrompts = new Prompts()
      const result = emptyPrompts.renderSummarizeReleaseNotes(inputs)
      expect(result).toContain('summary of changes you have generated')
      expect(result).toContain('Test Raw Summary')
    })
  })

  describe('renderComment', () => {
    it('should render comment template with all placeholders', () => {
      const result = prompts.renderComment(inputs)
      expect(result).toContain('test-file.js')
      expect(result).toContain('Test PR Title')
      expect(result).toContain('Test Description')
      expect(result).toContain('Test Short Summary')
      expect(result).toContain('+console.log("test");')
      expect(result).toContain('test diff')
      expect(result).toContain('test comment chain')
      expect(result).toContain('test comment')
      expect(result).toContain('@user')
    })

    it('should handle missing values in inputs', () => {
      const partialInputs = new Inputs()
      partialInputs.filename = 'partial.js'
      partialInputs.comment = 'partial comment'
      
      const result = prompts.renderComment(partialInputs)
      expect(result).toContain('partial.js')
      expect(result).toContain('partial comment')
      expect(result).toContain('no title provided')
      expect(result).toContain('file diff cannot be provided')
    })
  })

  describe('renderReviewFileDiff', () => {
    it('should render review template with all placeholders', () => {
      const result = prompts.renderReviewFileDiff(inputs)
      expect(result).toContain('Test PR Title')
      expect(result).toContain('Test Description')
      expect(result).toContain('Test Short Summary')
      expect(result).toContain('test-file.js')
      expect(result).toContain('test patches')
      expect(result).toContain('IMPORTANT Instructions')
      expect(result).toContain('LGTM!')
      expect(result).toContain('exact line number ranges')
    })

    it('should contain example section', () => {
      const result = prompts.renderReviewFileDiff(inputs)
      expect(result).toContain('### Example changes')
      expect(result).toContain('---new_hunk---')
      expect(result).toContain('---old_hunk---')
      expect(result).toContain('### Example response')
      expect(result).toContain('22-22:')
      expect(result).toContain('24-25:')
    })

    it('should handle complex patches content', () => {
      const complexInputs = new Inputs()
      complexInputs.patches = `
---new_hunk---
\`\`\`
1: function test() {
2:   return "hello";
3: }
\`\`\`

---old_hunk---
\`\`\`
function test() {
  return "world";
}
\`\`\`
      `
      const result = prompts.renderReviewFileDiff(complexInputs)
      expect(result).toContain('function test()')
      expect(result).toContain('return "hello"')
      expect(result).toContain('return "world"')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle undefined inputs', () => {
      const undefinedInputs = new Inputs()
      expect(() => prompts.renderSummarizeFileDiff(undefinedInputs, true)).not.toThrow()
      expect(() => prompts.renderSummarize(undefinedInputs)).not.toThrow()
      expect(() => prompts.renderComment(undefinedInputs)).not.toThrow()
    })

    it('should handle special characters in inputs', () => {
      const specialInputs = new Inputs()
      specialInputs.rawSummary = 'Summary with $special & <characters>'
      specialInputs.fileContent = 'Code with "quotes" and `backticks`'
      
      const result = prompts.renderSummarize(specialInputs)
      expect(result).toContain('Summary with $special & <characters>')
      expect(result).toContain('Custom summarize prompt')
    })

    it('should handle very long content', () => {
      const longInputs = new Inputs()
      longInputs.rawSummary = 'A'.repeat(10000)
      longInputs.patches = 'B'.repeat(5000)
      
      expect(() => prompts.renderSummarize(longInputs)).not.toThrow()
      expect(() => prompts.renderReviewFileDiff(longInputs)).not.toThrow()
    })

    it('should handle null and undefined constructor parameters', () => {
      expect(() => new Prompts(null as any, undefined as any)).not.toThrow()
      const nullPrompts = new Prompts(null as any, undefined as any)
      
      // Should still work with rendering
      const inputs = new Inputs()
      expect(() => nullPrompts.renderSummarize(inputs)).not.toThrow()
    })
  })
})