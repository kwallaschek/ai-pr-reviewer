import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Minimal mock setup to avoid memory issues
const mockInfo = jest.fn()
const mockWarning = jest.fn()
const mockGetInput = jest.fn()

jest.mock('@actions/core', () => ({
  info: mockInfo,
  warning: mockWarning,
  getInput: mockGetInput
}))

jest.mock('@actions/github', () => ({
  context: {
    eventName: 'pull_request',
    payload: { pull_request: { number: 123, body: 'Test PR body' } },
    repo: { owner: 'test-owner', repo: 'test-repo' }
  }
}))

// Minimal octokit mock
const mockCreateComment = jest.fn() as jest.MockedFunction<any>
const mockUpdateComment = jest.fn() as jest.MockedFunction<any>
const mockListComments = jest.fn() as jest.MockedFunction<any>
const mockPullsGet = jest.fn() as jest.MockedFunction<any>
const mockPullsUpdate = jest.fn() as jest.MockedFunction<any>
const mockListReviewComments = jest.fn() as jest.MockedFunction<any>
const mockCreateReviewComment = jest.fn() as jest.MockedFunction<any>
const mockListCommits = jest.fn() as jest.MockedFunction<any>
const mockCreateReview = jest.fn() as jest.MockedFunction<any>
const mockSubmitReview = jest.fn() as jest.MockedFunction<any>

jest.mock('../src/octokit', () => ({
  octokit: {
    issues: { 
      createComment: mockCreateComment,
      updateComment: mockUpdateComment,
      listComments: mockListComments
    },
    pulls: {
      get: mockPullsGet,
      update: mockPullsUpdate,
      listReviewComments: mockListReviewComments,
      createReviewComment: mockCreateReviewComment,
      listCommits: mockListCommits,
      createReview: mockCreateReview,
      submitReview: mockSubmitReview
    }
  }
}))

import { Commenter, COMMENT_TAG } from '../src/commenter'

describe('Commenter Minimal Tests', () => {
  let commenter: Commenter

  beforeEach(() => {
    jest.clearAllMocks()
    commenter = new Commenter()
    mockGetInput.mockReturnValue('🔍')
    mockCreateComment.mockResolvedValue({ data: { id: 1, body: 'test' } })
    mockUpdateComment.mockResolvedValue({ data: { id: 1 } })
    mockListComments.mockResolvedValue({ data: [] })
    mockPullsGet.mockResolvedValue({ data: { body: 'test body' } })
    mockPullsUpdate.mockResolvedValue({ data: {} })
    mockListReviewComments.mockResolvedValue({ data: [] })
    mockCreateReviewComment.mockResolvedValue({ data: { id: 1 } })
    mockListCommits.mockResolvedValue({ data: [] })
    mockCreateReview.mockResolvedValue({ data: { id: 999 } })
    mockSubmitReview.mockResolvedValue({ data: {} })
  })

  describe('Basic functionality', () => {
    it('should create commenter instance', () => {
      expect(commenter).toBeDefined()
    })

    it('should export COMMENT_TAG constant', () => {
      expect(COMMENT_TAG).toBe('<!-- This is an auto-generated comment by OSS CodeRabbit -->')
    })

    it('should create basic comment', async () => {
      await commenter.comment('Test message', COMMENT_TAG, 'create')
      expect(mockCreateComment).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          issue_number: 123,
          body: expect.stringContaining('Test message')
        })
      )
    })
  })

  describe('Content parsing', () => {
    it('should extract content within tags', () => {
      const startTag = '<!-- start -->'
      const endTag = '<!-- end -->'
      const content = `before${startTag}extracted${endTag}after`
      const result = commenter.getContentWithinTags(content, startTag, endTag)
      expect(result).toBe('extracted')
    })

    it('should remove content within tags', () => {
      const startTag = '<!-- start -->'
      const endTag = '<!-- end -->'
      const content = `before${startTag}remove${endTag}after`
      const result = commenter.removeContentWithinTags(content, startTag, endTag)
      expect(result).toBe('beforeafter')
    })

    it('should get raw summary', () => {
      const content = 'text<!-- rawsummary:start -->summary content<!-- rawsummary:end -->more text'
      const result = commenter.getRawSummary(content)
      expect(result).toBe('summary content')
    })

    it('should get short summary', () => {
      const content = 'text<!-- shortsummary:start -->short summary<!-- shortsummary:end -->more text'
      const result = commenter.getShortSummary(content)
      expect(result).toBe('short summary')
    })

    it('should get description', () => {
      const content = 'description<!-- This is an auto-generated comment: release notes by OSS CodeRabbit -->release notes<!-- end of auto-generated comment: release notes by OSS CodeRabbit -->more'
      const result = commenter.getDescription(content)
      expect(result).toBe('descriptionmore')
    })

    it('should get release notes', () => {
      const content = 'text<!-- This is an auto-generated comment: release notes by OSS CodeRabbit -->Release notes\n> quoted line\nNormal line<!-- end of auto-generated comment: release notes by OSS CodeRabbit -->more'
      const result = commenter.getReleaseNotes(content)
      expect(result).toBe('Release notes\nNormal line')
    })
  })

  describe('Comment operations', () => {
    it('should replace comment', async () => {
      const existingComment = { id: 1, body: `Old content ${COMMENT_TAG}` }
      mockListComments.mockResolvedValue({ data: [existingComment] })

      await commenter.replace('New message', COMMENT_TAG, 123)

      expect(mockUpdateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 1,
        body: 'New message'
      })
    })

    it('should create comment when replace finds none', async () => {
      mockListComments.mockResolvedValue({ data: [] })

      await commenter.replace('New message', COMMENT_TAG, 123)

      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        body: 'New message'
      })
    })

    it('should find comment with tag', async () => {
      const comments = [
        { id: 1, body: 'no tag' },
        { id: 2, body: `content ${COMMENT_TAG}` },
        { id: 3, body: 'also no tag' }
      ]
      mockListComments.mockResolvedValue({ data: comments })

      const result = await commenter.findCommentWithTag(COMMENT_TAG, 123)

      expect(result).toEqual(comments[1])
    })

    it('should return null when no comment found', async () => {
      mockListComments.mockResolvedValue({ data: [] })

      const result = await commenter.findCommentWithTag(COMMENT_TAG, 123)

      expect(result).toBeNull()
    })
  })

  describe('PR operations', () => {
    it('should update PR description', async () => {
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
  })

  describe('Review operations', () => {
    it('should buffer review comment', async () => {
      await commenter.bufferReviewComment('file.js', 1, 5, 'Test comment')

      // Access private property for testing
      const buffer = (commenter as any).reviewCommentsBuffer
      expect(buffer).toHaveLength(1)
      expect(buffer[0]).toEqual({
        path: 'file.js',
        startLine: 1,
        endLine: 5,
        message: expect.stringContaining('Test comment')
      })
    })

    it('should submit empty review', async () => {
      await commenter.submitReview(123, 'commit-abc', 'Status message')

      expect(mockCreateReview).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        commit_id: 'commit-abc',
        event: 'COMMENT',
        body: expect.stringContaining('Status message')
      })
    })
  })

  describe('Commit operations', () => {
    it('should get all commit IDs', async () => {
      const commits = [
        { sha: 'abc123' },
        { sha: 'def456' }
      ]
      mockListCommits.mockResolvedValue({ data: commits })

      const result = await commenter.getAllCommitIds()

      expect(result).toEqual(['abc123', 'def456'])
      expect(mockListCommits).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        per_page: 100,
        page: 1
      })
    })

    it('should get reviewed commit IDs', () => {
      const body = `content <!-- commit_ids_reviewed_start --><!-- abc123 --><!-- def456 --><!-- commit_ids_reviewed_end --> more`
      const result = commenter.getReviewedCommitIds(body)
      
      expect(result).toEqual(['abc123', 'def456'])
    })

    it('should add reviewed commit ID', () => {
      const body = `content <!-- commit_ids_reviewed_start --><!-- abc123 -->\n<!-- commit_ids_reviewed_end --> more`
      const result = commenter.addReviewedCommitId(body, 'def456')
      
      expect(result).toContain('<!-- abc123 -->')
      expect(result).toContain('<!-- def456 -->')
    })

    it('should get highest reviewed commit ID', () => {
      const allCommits = ['commit1', 'commit2', 'commit3', 'commit4']
      const reviewedCommits = ['commit1', 'commit3']
      
      const result = commenter.getHighestReviewedCommitId(allCommits, reviewedCommits)
      expect(result).toBe('commit3')
    })
  })
})