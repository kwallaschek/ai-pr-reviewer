import { describe, it, expect, beforeEach } from '@jest/globals'
import { Inputs } from '../src/inputs'

describe('Inputs', () => {
  describe('constructor', () => {
    it('should create instance with default values', () => {
      const inputs = new Inputs()
      expect(inputs.systemMessage).toBe('')
      expect(inputs.title).toBe('no title provided')
      expect(inputs.description).toBe('no description provided')
      expect(inputs.rawSummary).toBe('')
      expect(inputs.shortSummary).toBe('')
      expect(inputs.filename).toBe('')
      expect(inputs.fileContent).toBe('file contents cannot be provided')
      expect(inputs.fileDiff).toBe('file diff cannot be provided')
      expect(inputs.patches).toBe('')
      expect(inputs.diff).toBe('no diff')
      expect(inputs.commentChain).toBe('no other comments on this patch')
      expect(inputs.comment).toBe('no comment provided')
    })

    it('should create instance with custom values', () => {
      const inputs = new Inputs(
        'custom system message',
        'custom title',
        'custom description',
        'custom raw summary',
        'custom short summary',
        'custom.js',
        'const x = 1;',
        '+const x = 1;',
        'patch content',
        'diff content',
        'comment chain',
        'user comment'
      )
      expect(inputs.systemMessage).toBe('custom system message')
      expect(inputs.title).toBe('custom title')
      expect(inputs.description).toBe('custom description')
      expect(inputs.rawSummary).toBe('custom raw summary')
      expect(inputs.shortSummary).toBe('custom short summary')
      expect(inputs.filename).toBe('custom.js')
      expect(inputs.fileContent).toBe('const x = 1;')
      expect(inputs.fileDiff).toBe('+const x = 1;')
      expect(inputs.patches).toBe('patch content')
      expect(inputs.diff).toBe('diff content')
      expect(inputs.commentChain).toBe('comment chain')
      expect(inputs.comment).toBe('user comment')
    })

    it('should handle undefined/null values', () => {
      const inputs = new Inputs(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      )
      expect(inputs.systemMessage).toBe('')
      expect(inputs.title).toBe('no title provided')
      expect(inputs.description).toBe('no description provided')
    })
  })

  describe('clone', () => {
    it('should create exact copy of inputs', () => {
      const original = new Inputs(
        'system msg',
        'title',
        'desc',
        'raw',
        'short',
        'file.ts',
        'content',
        'diff',
        'patches',
        'diff2',
        'chain',
        'comment'
      )
      
      const cloned = original.clone()
      
      expect(cloned).not.toBe(original)
      expect(cloned.systemMessage).toBe(original.systemMessage)
      expect(cloned.title).toBe(original.title)
      expect(cloned.description).toBe(original.description)
      expect(cloned.rawSummary).toBe(original.rawSummary)
      expect(cloned.shortSummary).toBe(original.shortSummary)
      expect(cloned.filename).toBe(original.filename)
      expect(cloned.fileContent).toBe(original.fileContent)
      expect(cloned.fileDiff).toBe(original.fileDiff)
      expect(cloned.patches).toBe(original.patches)
      expect(cloned.diff).toBe(original.diff)
      expect(cloned.commentChain).toBe(original.commentChain)
      expect(cloned.comment).toBe(original.comment)
    })

    it('should create independent copy', () => {
      const original = new Inputs()
      const cloned = original.clone()
      
      cloned.title = 'modified title'
      expect(original.title).toBe('no title provided')
      expect(cloned.title).toBe('modified title')
    })
  })

  describe('render', () => {
    let inputs: Inputs

    beforeEach(() => {
      inputs = new Inputs(
        'Test System Message',
        'Test PR Title',
        'Test PR Description',
        'Raw Summary Content',
        'Short Summary Content',
        'test-file.js',
        'console.log("hello");',
        '+console.log("hello");',
        'patch content here',
        'diff content here',
        'comment chain here',
        'user comment here'
      )
    })

    it('should return empty string for empty content', () => {
      expect(inputs.render('')).toBe('')
      expect(inputs.render(null as any)).toBe('')
      expect(inputs.render(undefined as any)).toBe('')
    })

    it('should replace system_message placeholder', () => {
      const result = inputs.render('System: $system_message')
      expect(result).toBe('System: Test System Message')
    })

    it('should replace title placeholder', () => {
      const result = inputs.render('Title: $title')
      expect(result).toBe('Title: Test PR Title')
    })

    it('should replace description placeholder', () => {
      const result = inputs.render('Description: $description')
      expect(result).toBe('Description: Test PR Description')
    })

    it('should replace raw_summary placeholder', () => {
      const result = inputs.render('Raw: $raw_summary')
      expect(result).toBe('Raw: Raw Summary Content')
    })

    it('should replace short_summary placeholder', () => {
      const result = inputs.render('Short: $short_summary')
      expect(result).toBe('Short: Short Summary Content')
    })

    it('should replace filename placeholder', () => {
      const result = inputs.render('File: $filename')
      expect(result).toBe('File: test-file.js')
    })

    it('should replace file_content placeholder', () => {
      const result = inputs.render('Content: $file_content')
      expect(result).toBe('Content: console.log("hello");')
    })

    it('should replace file_diff placeholder', () => {
      const result = inputs.render('Diff: $file_diff')
      expect(result).toBe('Diff: +console.log("hello");')
    })

    it('should replace patches placeholder', () => {
      const result = inputs.render('Patches: $patches')
      expect(result).toBe('Patches: patch content here')
    })

    it('should replace diff placeholder', () => {
      const result = inputs.render('Diff: $diff')
      expect(result).toBe('Diff: diff content here')
    })

    it('should replace comment_chain placeholder', () => {
      const result = inputs.render('Chain: $comment_chain')
      expect(result).toBe('Chain: comment chain here')
    })

    it('should replace comment placeholder', () => {
      const result = inputs.render('Comment: $comment')
      expect(result).toBe('Comment: user comment here')
    })

    it('should replace multiple placeholders', () => {
      const template = 'Title: $title, File: $filename, Comment: $comment'
      const result = inputs.render(template)
      expect(result).toBe('Title: Test PR Title, File: test-file.js, Comment: user comment here')
    })

    it('should handle template without placeholders', () => {
      const content = 'This is plain text without placeholders'
      const result = inputs.render(content)
      expect(result).toBe(content)
    })

    it('should handle missing values gracefully', () => {
      const emptyInputs = new Inputs()
      // Only non-empty defaults should be replaced
      const result = emptyInputs.render('Title: $title, Description: $description, System: $system_message')
      expect(result).toBe('Title: no title provided, Description: no description provided, System: $system_message')
    })

    it('should not replace non-matching patterns', () => {
      const content = 'This has $unknown_placeholder and $another_unknown'
      const result = inputs.render(content)
      expect(result).toBe(content)
    })

    it('should handle complex template with multiple occurrences', () => {
      const template = `
        # $title
        
        ## Description
        $description
        
        ## File Analysis
        File: $filename
        Content: $file_content
        
        ## Summary
        $short_summary
      `
      const result = inputs.render(template)
      expect(result).toContain('# Test PR Title')
      expect(result).toContain('File: test-file.js')
      expect(result).toContain('Content: console.log("hello");')
    })
  })
})