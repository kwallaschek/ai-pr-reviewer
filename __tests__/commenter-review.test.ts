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

// Mock octokit for review operations
const mockListReviewComments = jest.fn() as jest.MockedFunction<any>
const mockCreateReviewComment = jest.fn() as jest.MockedFunction<any>
const mockUpdateReviewComment = jest.fn() as jest.MockedFunction<any>
const mockDeleteReviewComment = jest.fn() as jest.MockedFunction<any>
const mockCreateReplyForReviewComment = jest.fn() as jest.MockedFunction<any>
const mockListReviews = jest.fn() as jest.MockedFunction<any>
const mockDeletePendingReview = jest.fn() as jest.MockedFunction<any>
const mockCreateReview = jest.fn() as jest.MockedFunction<any>
const mockSubmitReview = jest.fn() as jest.MockedFunction<any>

jest.mock('../src/octokit', () => ({
  octokit: {
    pulls: {
      listReviewComments: mockListReviewComments,
      createReviewComment: mockCreateReviewComment,
      updateReviewComment: mockUpdateReviewComment,
      deleteReviewComment: mockDeleteReviewComment,
      createReplyForReviewComment: mockCreateReplyForReviewComment,
      listReviews: mockListReviews,
      deletePendingReview: mockDeletePendingReview,
      createReview: mockCreateReview,
      submitReview: mockSubmitReview
    }
  }
}))

import { Commenter, COMMENT_TAG, COMMENT_REPLY_TAG } from '../src/commenter'

describe('Commenter Review Operations', () => {
  let commenter: Commenter

  beforeEach(() => {
    jest.clearAllMocks()
    commenter = new Commenter()
    mockGetInput.mockReturnValue('🔍')
    
    // Reset mock return values
    mockListReviewComments.mockResolvedValue({ data: [] })
    mockListReviews.mockResolvedValue({ data: [] })
    mockCreateReview.mockResolvedValue({ data: { id: 999 } })
    mockSubmitReview.mockResolvedValue({ data: {} })
    mockDeleteReviewComment.mockResolvedValue({ data: {} })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('bufferReviewComment', () => {
    it('should add comment to buffer', async () => {
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

    it('should format comment with greeting and tag', async () => {
      await commenter.bufferReviewComment('file.js', 1, 1, 'Comment text')

      const buffer = (commenter as any).reviewCommentsBuffer
      expect(buffer[0].message).toContain('undefined   CodeRabbit')
      expect(buffer[0].message).toContain('Comment text')
      expect(buffer[0].message).toContain(COMMENT_TAG)
    })
  })

  describe('deletePendingReview', () => {
    it('should delete pending review if exists', async () => {
      const pendingReview = { id: 123, state: 'PENDING' }
      mockListReviews.mockResolvedValue({ data: [pendingReview] })

      await commenter.deletePendingReview(456)

      expect(mockDeletePendingReview).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 456,
        review_id: 123
      })
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('Deleting pending review')
      )
    })

    it('should handle no pending review', async () => {
      mockListReviews.mockResolvedValue({ data: [] })

      await commenter.deletePendingReview(456)

      expect(mockDeletePendingReview).not.toHaveBeenCalled()
    })

    it('should handle errors in listing reviews', async () => {
      mockListReviews.mockRejectedValue(new Error('List error'))

      await commenter.deletePendingReview(456)

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list reviews')
      )
    })
  })

  describe('listReviewComments', () => {
    it('should return cached comments if available', async () => {
      const comments = [{ id: 1, body: 'test' }]
      // Set cache
      ;(commenter as any).reviewCommentsCache[123] = comments

      const result = await commenter.listReviewComments(123)

      expect(result).toBe(comments)
      expect(mockListReviewComments).not.toHaveBeenCalled()
    })

    it('should fetch and cache comments', async () => {
      const comments = [{ id: 1, body: 'test' }]
      mockListReviewComments.mockResolvedValue({ data: comments })

      const result = await commenter.listReviewComments(123)

      expect(result).toEqual(comments)
      expect((commenter as any).reviewCommentsCache[123]).toEqual(comments)
    })

    it('should handle pagination efficiently', async () => {
      // Use smaller data sets to reduce memory usage
      const page1 = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      const page2 = [{ id: 11 }]
      
      mockListReviewComments
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 })

      const result = await commenter.listReviewComments(123)

      expect(result).toHaveLength(11)
      expect(mockListReviewComments).toHaveBeenCalledTimes(2)
    })

    it('should handle API errors', async () => {
      mockListReviewComments.mockRejectedValue(new Error('API Error'))

      const result = await commenter.listReviewComments(123)

      expect(result).toEqual([])
      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list review comments')
      )
    })
  })

  describe('submitReview', () => {
    it('should submit empty review when buffer is empty', async () => {
      await commenter.submitReview(123, 'commit-abc', 'Status message')

      expect(mockCreateReview).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        commit_id: 'commit-abc',
        event: 'COMMENT',
        body: expect.stringContaining('Status message')
      })
      expect(mockInfo).toHaveBeenCalledWith('Submitting empty review for PR #123')
    })

    it('should handle error when submitting empty review', async () => {
      mockCreateReview.mockRejectedValue(new Error('Create error'))

      await commenter.submitReview(123, 'commit-abc', 'Status message')

      expect(mockWarning).toHaveBeenCalledWith('Failed to submit empty review: Error: Create error')
    })

    it('should submit review with buffered comments', async () => {
      // Add comments to buffer
      await commenter.bufferReviewComment('file.js', 1, 3, 'Test comment 1')
      await commenter.bufferReviewComment('file.js', 5, 5, 'Test comment 2')
      
      // Mock getCommentsAtRange to return existing comments
      const existingComment = { id: 456, body: `Old comment ${COMMENT_TAG}` }
      jest.spyOn(commenter, 'getCommentsAtRange').mockResolvedValue([existingComment])

      await commenter.submitReview(123, 'commit-abc', 'Review status')

      expect(mockCreateReview).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        commit_id: 'commit-abc',
        comments: expect.arrayContaining([
          expect.objectContaining({ path: 'file.js', line: 3 }),
          expect.objectContaining({ path: 'file.js', line: 5 })
        ])
      })
      expect(mockSubmitReview).toHaveBeenCalled()
    })

    it('should generate comment data with start_line for multi-line comments', async () => {
      await commenter.bufferReviewComment('file.js', 1, 3, 'Multi-line comment')
      jest.spyOn(commenter, 'getCommentsAtRange').mockResolvedValue([])

      await commenter.submitReview(123, 'commit-abc', 'Review status')

      expect(mockCreateReview).toHaveBeenCalledWith(
        expect.objectContaining({
          comments: expect.arrayContaining([
            expect.objectContaining({
              start_line: 1,
              start_side: 'RIGHT',
              line: 3
            })
          ])
        })
      )
    })
  })

  describe('reviewCommentReply', () => {
    const topLevelComment = { id: 123, body: `Original comment ${COMMENT_TAG}` }

    it('should create reply to review comment', async () => {
      await commenter.reviewCommentReply(456, topLevelComment, 'Reply message')

      expect(mockCreateReplyForReviewComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 456,
        body: expect.stringContaining('Reply message'),
        comment_id: 123
      })
    })

    it('should update top-level comment tag from COMMENT_TAG to COMMENT_REPLY_TAG', async () => {
      await commenter.reviewCommentReply(456, topLevelComment, 'Reply message')

      expect(mockUpdateReviewComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 123,
        body: topLevelComment.body.replace(COMMENT_TAG, COMMENT_REPLY_TAG)
      })
    })

    it('should handle error when creating reply and post error message', async () => {
      const error = new Error('Reply error')
      mockCreateReplyForReviewComment.mockRejectedValueOnce(error)
      mockCreateReplyForReviewComment.mockResolvedValueOnce({ data: {} })

      await commenter.reviewCommentReply(456, topLevelComment, 'Reply message')

      expect(mockWarning).toHaveBeenCalledWith('Failed to reply to the top-level comment Error: Reply error')
      expect(mockCreateReplyForReviewComment).toHaveBeenCalledTimes(2)
      expect(mockCreateReplyForReviewComment).toHaveBeenLastCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 456,
        comment_id: 123,
        body: 'Could not post the reply to the top-level comment due to the following error: Error: Reply error'
      })
    })
  })

  describe('getCommentsWithinRange', () => {
    it('should filter comments within line range', async () => {
      const comments = [
        { path: 'file.js', start_line: 1, line: 3, body: 'comment 1' },
        { path: 'file.js', start_line: 5, line: 7, body: 'comment 2' },
        { path: 'other.js', start_line: 1, line: 3, body: 'comment 3' }
      ]
      mockListReviewComments.mockResolvedValue({ data: comments })

      const result = await commenter.getCommentsWithinRange(123, 'file.js', 1, 6)

      expect(result).toEqual([comments[0]])
    })

    it('should handle single line comments', async () => {
      const comments = [
        { path: 'file.js', line: 5, body: 'single line comment' }
      ]
      mockListReviewComments.mockResolvedValue({ data: comments })

      const result = await commenter.getCommentsWithinRange(123, 'file.js', 5, 5)

      expect(result).toEqual([comments[0]])
    })

    it('should exclude empty comments', async () => {
      const comments = [
        { path: 'file.js', line: 5, body: '' },
        { path: 'file.js', line: 6, body: 'valid comment' }
      ]
      mockListReviewComments.mockResolvedValue({ data: comments })

      const result = await commenter.getCommentsWithinRange(123, 'file.js', 6, 6)

      expect(result).toEqual([comments[1]])
    })
  })

  describe('getCommentsAtRange', () => {
    it('should filter comments at exact line range', async () => {
      const comments = [
        { path: 'file.js', start_line: 1, line: 3, body: 'exact match' },
        { path: 'file.js', start_line: 2, line: 4, body: 'no match' }
      ]
      mockListReviewComments.mockResolvedValue({ data: comments })

      const result = await commenter.getCommentsAtRange(123, 'file.js', 1, 3)

      expect(result).toEqual([comments[0]])
    })

    it('should handle single line exact matches', async () => {
      const comments = [
        { path: 'file.js', line: 5, body: 'single line exact' }
      ]
      mockListReviewComments.mockResolvedValue({ data: comments })

      const result = await commenter.getCommentsAtRange(123, 'file.js', 5, 5)

      expect(result).toEqual([comments[0]])
    })
  })

  describe('composeCommentChain', () => {
    it('should compose conversation chain with usernames', () => {
      const topLevelComment = { id: 1, user: { login: 'user1' }, body: 'Top level comment' }
      const replies = [
        { id: 2, user: { login: 'user2' }, body: 'First reply', in_reply_to_id: 1 },
        { id: 3, user: { login: 'user1' }, body: 'Second reply', in_reply_to_id: 1 }
      ]
      
      const result = commenter.composeCommentChain(replies, topLevelComment)

      expect(result).toBe('user1: Top level comment\n---\nuser2: First reply\n---\nuser1: Second reply')
    })

    it('should handle single comment without replies', () => {
      const topLevelComment = { id: 1, user: { login: 'user1' }, body: 'Single comment' }
      
      const result = commenter.composeCommentChain([], topLevelComment)

      expect(result).toBe('user1: Single comment')
    })
  })
})