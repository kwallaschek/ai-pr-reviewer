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

// Mock octokit for commit operations
const mockListCommits = jest.fn() as jest.MockedFunction<any>
const mockCreateComment = jest.fn() as jest.MockedFunction<any>
const mockUpdateComment = jest.fn() as jest.MockedFunction<any>
const mockListComments = jest.fn() as jest.MockedFunction<any>

jest.mock('../src/octokit', () => ({
  octokit: {
    pulls: {
      listCommits: mockListCommits
    },
    issues: {
      createComment: mockCreateComment,
      updateComment: mockUpdateComment,
      listComments: mockListComments
    }
  }
}))

import { Commenter, COMMENT_TAG, COMMIT_ID_START_TAG, COMMIT_ID_END_TAG, IN_PROGRESS_START_TAG, IN_PROGRESS_END_TAG } from '../src/commenter'

describe('Commenter Commit Operations', () => {
  let commenter: Commenter

  beforeEach(() => {
    jest.clearAllMocks()
    commenter = new Commenter()
    mockGetInput.mockReturnValue('🔍')
    
    // Reset mock return values
    mockListCommits.mockResolvedValue({ data: [] })
    mockCreateComment.mockResolvedValue({ data: { id: 1, body: 'test comment' } })
    mockUpdateComment.mockResolvedValue({ data: { id: 1 } })
    mockListComments.mockResolvedValue({ data: [] })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create comment and update cache', async () => {
      const response = { data: { id: 123, body: 'test comment' } }
      mockCreateComment.mockResolvedValue(response)

      await commenter.create('Test body', 456)

      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 456,
        body: 'Test body'
      })

      expect((commenter as any).issueCommentsCache[456]).toContain(response.data)
    })

    it('should handle errors', async () => {
      mockCreateComment.mockRejectedValue(new Error('Create error'))

      await commenter.create('Test body', 456)

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create comment')
      )
    })
  })

  describe('replace', () => {
    it('should update existing comment', async () => {
      const existingComment = { id: 123, body: `content ${COMMENT_TAG}` }
      mockListComments.mockResolvedValue({ data: [existingComment] })

      await commenter.replace('New body', COMMENT_TAG, 456)

      expect(mockUpdateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 123,
        body: 'New body'
      })
    })

    it('should create new comment if none exists with tag', async () => {
      mockListComments.mockResolvedValue({ data: [] })

      await commenter.replace('New body', COMMENT_TAG, 456)

      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 456,
        body: 'New body'
      })
    })
  })

  describe('findCommentWithTag', () => {
    it('should find comment with specified tag', async () => {
      const comments = [
        { id: 1, body: 'no tag' },
        { id: 2, body: `content ${COMMENT_TAG}` },
        { id: 3, body: 'also no tag' }
      ]
      mockListComments.mockResolvedValue({ data: comments })

      const result = await commenter.findCommentWithTag(COMMENT_TAG, 456)

      expect(result).toEqual(comments[1])
    })

    it('should return null if no comment found', async () => {
      mockListComments.mockResolvedValue({ data: [] })

      const result = await commenter.findCommentWithTag(COMMENT_TAG, 456)

      expect(result).toBeNull()
    })
  })

  describe('listComments', () => {
    it('should return cached comments', async () => {
      const comments = [{ id: 1, body: 'test' }]
      ;(commenter as any).issueCommentsCache[456] = comments

      const result = await commenter.listComments(456)

      expect(result).toBe(comments)
      expect(mockListComments).not.toHaveBeenCalled()
    })

    it('should fetch and cache comments with pagination', async () => {
      // Use smaller data sets to avoid memory issues
      const page1 = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      const page2 = [{ id: 11 }]
      
      mockListComments
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 })

      const result = await commenter.listComments(456)

      expect(result).toHaveLength(11)
      expect(mockListComments).toHaveBeenCalledTimes(2)
    })
  })

  describe('getReviewedCommitIds', () => {
    it('should extract commit IDs from comment body', () => {
      const body = `content ${COMMIT_ID_START_TAG}<!-- abc123 --><!-- def456 -->${COMMIT_ID_END_TAG} more`
      const result = commenter.getReviewedCommitIds(body)
      
      expect(result).toEqual(['abc123', 'def456'])
    })

    it('should return empty array when markers not found', () => {
      const body = 'no markers here'
      const result = commenter.getReviewedCommitIds(body)
      
      expect(result).toEqual([])
    })

    it('should handle empty content between markers', () => {
      const body = `content ${COMMIT_ID_START_TAG}${COMMIT_ID_END_TAG} more`
      const result = commenter.getReviewedCommitIds(body)
      
      expect(result).toEqual([])
    })
  })

  describe('getReviewedCommitIdsBlock', () => {
    it('should extract commit block with markers', () => {
      const commitBlock = `${COMMIT_ID_START_TAG}<!-- abc123 -->${COMMIT_ID_END_TAG}`
      const body = `content ${commitBlock} more`
      const result = commenter.getReviewedCommitIdsBlock(body)
      
      expect(result).toBe(commitBlock)
    })

    it('should return empty string when markers not found', () => {
      const result = commenter.getReviewedCommitIdsBlock('no markers')
      expect(result).toBe('')
    })
  })

  describe('addReviewedCommitId', () => {
    it('should add commit ID to existing block', () => {
      const body = `content ${COMMIT_ID_START_TAG}<!-- abc123 -->\n${COMMIT_ID_END_TAG} more`
      const result = commenter.addReviewedCommitId(body, 'def456')
      
      expect(result).toContain('<!-- abc123 -->')
      expect(result).toContain('<!-- def456 -->')
    })

    it('should create new block when markers not found', () => {
      const body = 'content without markers'
      const result = commenter.addReviewedCommitId(body, 'abc123')
      
      expect(result).toContain(COMMIT_ID_START_TAG)
      expect(result).toContain('<!-- abc123 -->')
      expect(result).toContain(COMMIT_ID_END_TAG)
    })
  })

  describe('getHighestReviewedCommitId', () => {
    it('should return highest reviewed commit', () => {
      const allCommits = ['commit1', 'commit2', 'commit3', 'commit4']
      const reviewedCommits = ['commit1', 'commit3']
      
      const result = commenter.getHighestReviewedCommitId(allCommits, reviewedCommits)
      expect(result).toBe('commit3')
    })

    it('should return empty string when no commits reviewed', () => {
      const allCommits = ['commit1', 'commit2']
      const reviewedCommits: string[] = []
      
      const result = commenter.getHighestReviewedCommitId(allCommits, reviewedCommits)
      expect(result).toBe('')
    })
  })

  describe('getAllCommitIds', () => {
    it('should fetch all commit IDs from PR', async () => {
      // Set up context with pull_request
      const context = (jest.requireMock('@actions/github') as any).context
      context.payload.pull_request = { number: 123 }
      
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

    it('should handle pagination efficiently', async () => {
      // Set up context with pull_request
      const context = (jest.requireMock('@actions/github') as any).context
      context.payload.pull_request = { number: 123 }
      
      // Use smaller data sets to avoid memory issues
      const page1 = Array.from({ length: 10 }, (_, i) => ({ sha: `commit${i + 1}` }))
      const page2 = [{ sha: 'commit11' }]
      
      mockListCommits
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 })

      const result = await commenter.getAllCommitIds()

      expect(result).toHaveLength(11)
      expect(mockListCommits).toHaveBeenCalledTimes(2)
    })

    it('should return empty array when no PR context', async () => {
      const context = (jest.requireMock('@actions/github') as any).context
      context.payload.pull_request = null

      const result = await commenter.getAllCommitIds()

      expect(result).toEqual([])
      expect(mockListCommits).not.toHaveBeenCalled()
    })
  })

  describe('addInProgressStatus', () => {
    it('should add in-progress status when markers not present', () => {
      const body = 'existing content'
      const result = commenter.addInProgressStatus(body, 'Status message')
      
      expect(result).toContain(IN_PROGRESS_START_TAG)
      expect(result).toContain('Currently reviewing new changes')
      expect(result).toContain('Status message')
      expect(result).toContain(IN_PROGRESS_END_TAG)
      expect(result).toContain('existing content')
    })

    it('should not modify body when in-progress status already exists', () => {
      const body = `${IN_PROGRESS_START_TAG}existing status${IN_PROGRESS_END_TAG}content`
      const result = commenter.addInProgressStatus(body, 'New status')
      
      expect(result).toBe(body)
    })
  })

  describe('removeInProgressStatus', () => {
    it('should remove in-progress status when present', () => {
      const body = `before${IN_PROGRESS_START_TAG}status content${IN_PROGRESS_END_TAG}after`
      const result = commenter.removeInProgressStatus(body)
      
      expect(result).toBe('beforeafter')
    })

    it('should not modify body when no in-progress status', () => {
      const body = 'content without status'
      const result = commenter.removeInProgressStatus(body)
      
      expect(result).toBe(body)
    })
  })
})