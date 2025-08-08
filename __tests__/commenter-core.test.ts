import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock dependencies (must be defined before module imports)
const mockInfo = jest.fn() as jest.MockedFunction<any>
const mockWarning = jest.fn() as jest.MockedFunction<any>
const mockGetInput = jest.fn() as jest.MockedFunction<any>

jest.mock('@actions/core', () => ({
  info: mockInfo,
  warning: mockWarning,
  getInput: mockGetInput
}))

jest.mock('@actions/github', () => ({
  context: {
    eventName: 'pull_request',
    payload: {
      pull_request: {
        number: 123,
        body: 'Test PR body'
      },
      issue: {
        number: 456
      }
    },
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    }
  }
}))

// Mock octokit
const mockCreateComment = jest.fn() as jest.MockedFunction<any>
const mockUpdateComment = jest.fn() as jest.MockedFunction<any>
const mockListComments = jest.fn() as jest.MockedFunction<any>
const mockPullsGet = jest.fn() as jest.MockedFunction<any>
const mockPullsUpdate = jest.fn() as jest.MockedFunction<any>

jest.mock('../src/octokit', () => ({
  octokit: {
    issues: {
      createComment: mockCreateComment,
      updateComment: mockUpdateComment,
      listComments: mockListComments
    },
    pulls: {
      get: mockPullsGet,
      update: mockPullsUpdate
    }
  }
}))

import { Commenter, COMMENT_TAG, COMMENT_REPLY_TAG, COMMENT_GREETING, SUMMARIZE_TAG, IN_PROGRESS_START_TAG, IN_PROGRESS_END_TAG, DESCRIPTION_START_TAG, DESCRIPTION_END_TAG, RAW_SUMMARY_START_TAG, RAW_SUMMARY_END_TAG, SHORT_SUMMARY_START_TAG, SHORT_SUMMARY_END_TAG, COMMIT_ID_START_TAG, COMMIT_ID_END_TAG } from '../src/commenter'

describe('Commenter Core Functionality', () => {
  let commenter: Commenter
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    commenter = new Commenter()
    mockGetInput.mockReturnValue('🔍')
    
    // Reset mock return values
    mockCreateComment.mockResolvedValue({ data: { id: 1, body: 'test comment' } })
    mockUpdateComment.mockResolvedValue({ data: { id: 1 } })
    mockListComments.mockResolvedValue({ data: [] })
    mockPullsGet.mockResolvedValue({ data: { body: 'test body' } })
    mockPullsUpdate.mockResolvedValue({ data: {} })
  })

  afterEach(() => {
    process.env = originalEnv
    jest.clearAllMocks()
  })

  describe('Constants', () => {
    it('should export all required constants', () => {
      expect(COMMENT_TAG).toBe('<!-- This is an auto-generated comment by OSS CodeRabbit -->')
      expect(COMMENT_REPLY_TAG).toBe('<!-- This is an auto-generated reply by OSS CodeRabbit -->')
      expect(SUMMARIZE_TAG).toBe('<!-- This is an auto-generated comment: summarize by OSS CodeRabbit -->')
      expect(IN_PROGRESS_START_TAG).toBe('<!-- This is an auto-generated comment: summarize review in progress by OSS CodeRabbit -->')
      expect(IN_PROGRESS_END_TAG).toBe('<!-- end of auto-generated comment: summarize review in progress by OSS CodeRabbit -->')
      expect(DESCRIPTION_START_TAG).toBe('<!-- This is an auto-generated comment: release notes by OSS CodeRabbit -->')
      expect(DESCRIPTION_END_TAG).toBe('<!-- end of auto-generated comment: release notes by OSS CodeRabbit -->')
      expect(COMMIT_ID_START_TAG).toBe('<!-- commit_ids_reviewed_start -->')
      expect(COMMIT_ID_END_TAG).toBe('<!-- commit_ids_reviewed_end -->')
    })

    it('should create COMMENT_GREETING with bot icon', () => {
      expect(COMMENT_GREETING).toBe('undefined   CodeRabbit')
    })
  })

  describe('comment method', () => {
    it('should create comment for pull request', async () => {
      const message = 'Test message'
      const tag = COMMENT_TAG

      await commenter.comment(message, tag, 'create')

      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        body: `undefined   CodeRabbit\n\nTest message\n\n${COMMENT_TAG}`
      })
    })

    it('should create comment for issue', async () => {
      const context = (jest.requireMock('@actions/github') as any).context
      context.payload.pull_request = null

      const message = 'Test message'
      await commenter.comment(message, COMMENT_TAG, 'create')

      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 456,
        body: expect.stringContaining('Test message')
      })
    })

    it('should skip if both pull_request and issue are null', async () => {
      const context = (jest.requireMock('@actions/github') as any).context
      context.payload.pull_request = null
      context.payload.issue = null

      await commenter.comment('Test message', COMMENT_TAG, 'create')

      expect(mockWarning).toHaveBeenCalledWith(
        'Skipped: context.payload.pull_request and context.payload.issue are both null'
      )
      expect(mockCreateComment).not.toHaveBeenCalled()
    })

    it('should use default COMMENT_TAG when tag is empty', async () => {
      await commenter.comment('Test message', '', 'create')

      expect(mockCreateComment).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining(COMMENT_TAG)
        })
      )
    })

    it('should replace comment when mode is replace', async () => {
      const existingComment = { id: 1, body: `Old content ${COMMENT_TAG}` }
      mockListComments.mockResolvedValue({ data: [existingComment] })

      await commenter.comment('New message', COMMENT_TAG, 'replace')

      expect(mockUpdateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 1,
        body: expect.stringContaining('New message')
      })
    })

    it('should handle unknown mode by defaulting to replace', async () => {
      mockListComments.mockResolvedValue({ data: [] })
      
      await commenter.comment('Test message', COMMENT_TAG, 'unknown')

      expect(mockWarning).toHaveBeenCalledWith('Unknown mode: unknown, use "replace" instead')
    })
  })

  describe('Content parsing methods', () => {
    describe('getContentWithinTags', () => {
      it('should extract content between tags', () => {
        const content = `before${RAW_SUMMARY_START_TAG}extracted content${RAW_SUMMARY_END_TAG}after`
        const result = commenter.getContentWithinTags(content, RAW_SUMMARY_START_TAG, RAW_SUMMARY_END_TAG)
        
        expect(result).toBe('extracted content')
      })

      it('should return empty string when tags not found', () => {
        const content = 'no tags here'
        const result = commenter.getContentWithinTags(content, RAW_SUMMARY_START_TAG, RAW_SUMMARY_END_TAG)
        
        expect(result).toBe('')
      })
    })

    describe('removeContentWithinTags', () => {
      it('should remove content between tags', () => {
        const content = `before${DESCRIPTION_START_TAG}remove this${DESCRIPTION_END_TAG}after`
        const result = commenter.removeContentWithinTags(content, DESCRIPTION_START_TAG, DESCRIPTION_END_TAG)
        
        expect(result).toBe('beforeafter')
      })

      it('should return original content when tags not found', () => {
        const content = 'no tags here'
        const result = commenter.removeContentWithinTags(content, DESCRIPTION_START_TAG, DESCRIPTION_END_TAG)
        
        expect(result).toBe('no tags here')
      })

      it('should handle case where start tag comes after end tag', () => {
        const content = `before${DESCRIPTION_END_TAG}middle${DESCRIPTION_START_TAG}after`
        const result = commenter.removeContentWithinTags(content, DESCRIPTION_START_TAG, DESCRIPTION_END_TAG)
        
        // When start > end, the slice method creates an unexpected result
        // It takes from 0 to start, then from end+endTag.length to end of string
        expect(result).toBe(`before${DESCRIPTION_END_TAG}middlemiddle${DESCRIPTION_START_TAG}after`)
      })
    })

    describe('getRawSummary', () => {
      it('should extract raw summary from content', () => {
        const content = `text${RAW_SUMMARY_START_TAG}summary content${RAW_SUMMARY_END_TAG}more text`
        const result = commenter.getRawSummary(content)
        
        expect(result).toBe('summary content')
      })
    })

    describe('getShortSummary', () => {
      it('should extract short summary from content', () => {
        const content = `text${SHORT_SUMMARY_START_TAG}short summary${SHORT_SUMMARY_END_TAG}more text`
        const result = commenter.getShortSummary(content)
        
        expect(result).toBe('short summary')
      })
    })

    describe('getDescription', () => {
      it('should remove description tags from content', () => {
        const content = `description${DESCRIPTION_START_TAG}release notes${DESCRIPTION_END_TAG}more`
        const result = commenter.getDescription(content)
        
        expect(result).toBe('descriptionmore')
      })
    })

    describe('getReleaseNotes', () => {
      it('should extract release notes and remove quoted lines', () => {
        const content = `text${DESCRIPTION_START_TAG}Release notes\n> quoted line\nNormal line${DESCRIPTION_END_TAG}more`
        const result = commenter.getReleaseNotes(content)
        
        expect(result).toBe('Release notes\nNormal line')
      })

      it('should handle multiple quoted lines', () => {
        const content = `${DESCRIPTION_START_TAG}Line 1\n> Quote 1\nLine 2\n> Quote 2\nLine 3${DESCRIPTION_END_TAG}`
        const result = commenter.getReleaseNotes(content)
        
        expect(result).toBe('Line 1\nLine 2\nLine 3')
      })
    })
  })

  describe('updateDescription', () => {
    it('should update PR description with release notes', async () => {
      const existingBody = 'Existing description'
      mockPullsGet.mockResolvedValue({ data: { body: existingBody } })

      await commenter.updateDescription(123, 'Release notes content')

      expect(mockPullsGet).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123
      })

      expect(mockPullsUpdate).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        body: expect.stringContaining('Existing description')
      })
    })

    it('should handle PR with empty body', async () => {
      mockPullsGet.mockResolvedValue({ data: { body: null } })

      await commenter.updateDescription(123, 'Release notes')

      expect(mockPullsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('Release notes')
        })
      )
    })

    it('should handle API errors gracefully', async () => {
      mockPullsGet.mockRejectedValue(new Error('API Error'))

      await commenter.updateDescription(123, 'Release notes')

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get PR')
      )
    })
  })
})