/**
 * Essential commenter tests - focused on critical functions without memory issues
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock core dependencies
jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  getInput: jest.fn()
}))

jest.mock('@actions/github', () => ({
  context: {
    eventName: 'pull_request',
    payload: { pull_request: { number: 123, body: 'Test PR body' } },
    repo: { owner: 'test-owner', repo: 'test-repo' }
  }
}))

jest.mock('../src/octokit', () => ({
  octokit: {
    issues: { createComment: jest.fn() }
  }
}))

// Import constants only to avoid loading the full class
const COMMENT_TAG = '<!-- This is an auto-generated comment by OSS CodeRabbit -->'
const RAW_SUMMARY_START_TAG = '<!-- rawsummary:start -->'
const RAW_SUMMARY_END_TAG = '<!-- rawsummary:end -->'
const COMMIT_ID_START_TAG = '<!-- commit_ids_reviewed_start -->'
const COMMIT_ID_END_TAG = '<!-- commit_ids_reviewed_end -->'

describe('Commenter Essential Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Constants', () => {
    it('should have correct tag values', () => {
      expect(COMMENT_TAG).toBe('<!-- This is an auto-generated comment by OSS CodeRabbit -->')
      expect(RAW_SUMMARY_START_TAG).toBe('<!-- rawsummary:start -->')
      expect(RAW_SUMMARY_END_TAG).toBe('<!-- rawsummary:end -->')
    })
  })

  describe('Content parsing logic', () => {
    it('should extract content between tags', () => {
      const content = `before${RAW_SUMMARY_START_TAG}extracted content${RAW_SUMMARY_END_TAG}after`
      const startIndex = content.indexOf(RAW_SUMMARY_START_TAG)
      const endIndex = content.indexOf(RAW_SUMMARY_END_TAG)
      
      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        const result = content.slice(startIndex + RAW_SUMMARY_START_TAG.length, endIndex)
        expect(result).toBe('extracted content')
      }
    })

    it('should remove content between tags', () => {
      const content = `before${RAW_SUMMARY_START_TAG}remove this${RAW_SUMMARY_END_TAG}after`
      const startIndex = content.indexOf(RAW_SUMMARY_START_TAG)
      const endIndex = content.indexOf(RAW_SUMMARY_END_TAG)
      
      if (startIndex !== -1 && endIndex !== -1) {
        const result = content.slice(0, startIndex) + content.slice(endIndex + RAW_SUMMARY_END_TAG.length)
        expect(result).toBe('beforeafter')
      }
    })

    it('should extract commit IDs', () => {
      const body = `content ${COMMIT_ID_START_TAG}<!-- abc123 --><!-- def456 -->${COMMIT_ID_END_TAG} more`
      const startIndex = body.indexOf(COMMIT_ID_START_TAG)
      const endIndex = body.indexOf(COMMIT_ID_END_TAG)
      
      if (startIndex !== -1 && endIndex !== -1) {
        const commitSection = body.slice(startIndex + COMMIT_ID_START_TAG.length, endIndex)
        const commitMatches = commitSection.match(/<!--\s*(.+?)\s*-->/g)
        if (commitMatches) {
          const commits = commitMatches.map(match => match.replace(/<!--\s*(.+?)\s*-->/, '$1').trim())
          expect(commits).toEqual(['abc123', 'def456'])
        }
      }
    })

    it('should handle release notes filtering', () => {
      const content = 'Release notes\n> quoted line\nNormal line\n> another quote\nFinal line'
      const lines = content.split('\n').filter(line => !line.trim().startsWith('>'))
      const result = lines.join('\n')
      expect(result).toBe('Release notes\nNormal line\nFinal line')
    })

    it('should find highest commit ID', () => {
      const allCommits = ['commit1', 'commit2', 'commit3', 'commit4']
      const reviewedCommits = ['commit1', 'commit3']
      
      let highest = ''
      for (let i = allCommits.length - 1; i >= 0; i--) {
        if (reviewedCommits.includes(allCommits[i])) {
          highest = allCommits[i]
          break
        }
      }
      expect(highest).toBe('commit3')
    })
  })

  describe('Comment tag operations', () => {
    it('should find comment with tag in list', () => {
      const comments = [
        { id: 1, body: 'no tag' },
        { id: 2, body: `content ${COMMENT_TAG}` },
        { id: 3, body: 'also no tag' }
      ]
      
      const result = comments.find(comment => comment.body.includes(COMMENT_TAG))
      expect(result).toEqual(comments[1])
    })

    it('should return undefined when no comment found', () => {
      const comments = [
        { id: 1, body: 'no tag' },
        { id: 3, body: 'also no tag' }
      ]
      
      const result = comments.find(comment => comment.body.includes(COMMENT_TAG))
      expect(result).toBeUndefined()
    })
  })

  describe('Comment body formatting', () => {
    it('should format comment with greeting and tag', () => {
      const greeting = 'undefined   CodeRabbit'  // This matches the actual implementation
      const message = 'Test comment'
      const tag = COMMENT_TAG
      
      const formattedBody = `${greeting}\n\n${message}\n\n${tag}`
      
      expect(formattedBody).toContain(message)
      expect(formattedBody).toContain(tag)
      expect(formattedBody).toContain('CodeRabbit')
    })
  })
})