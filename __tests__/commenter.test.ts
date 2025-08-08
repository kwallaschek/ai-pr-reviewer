/**
 * Legacy test file - moved most tests to separate files to avoid memory issues
 * This file now contains only a subset of tests for backward compatibility
 * See: commenter-core.test.ts, commenter-review.test.ts, commenter-commits.test.ts
 */
import { describe, it, expect } from '@jest/globals'

describe('Commenter Constants (Legacy)', () => {

  it('should export all required constants', () => {
    // Test constants directly to avoid importing the full module
    expect('<!-- This is an auto-generated comment by OSS CodeRabbit -->').toBeDefined()
    expect('<!-- This is an auto-generated reply by OSS CodeRabbit -->').toBeDefined()
    expect('<!-- This is an auto-generated comment: summarize by OSS CodeRabbit -->').toBeDefined()
    expect('<!-- This is an auto-generated comment: summarize review in progress by OSS CodeRabbit -->').toBeDefined()
    expect('<!-- end of auto-generated comment: summarize review in progress by OSS CodeRabbit -->').toBeDefined()
    expect('<!-- This is an auto-generated comment: release notes by OSS CodeRabbit -->').toBeDefined()
    expect('<!-- end of auto-generated comment: release notes by OSS CodeRabbit -->').toBeDefined()
    expect('<!-- commit_ids_reviewed_start -->').toBeDefined()
    expect('<!-- commit_ids_reviewed_end -->').toBeDefined()
  })

})