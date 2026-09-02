import { describe, expect, it } from 'vitest'
import { partitionTimelinePosts, postVisibleToViewer } from '../app/utils/timelineFeed'

const studentAccess = {
  canSeeStudents: true,
  canSeeFaculty: false,
  canSeeStaff: false,
  canSeeEmployees: false,
}

describe('timeline feed visibility', () => {
  it('lets students see general and student posts, not employees', () => {
    expect(postVisibleToViewer(['all'], studentAccess)).toBe(true)
    expect(postVisibleToViewer(['students'], studentAccess)).toBe(true)
    expect(postVisibleToViewer(['student'], studentAccess)).toBe(true)
    expect(postVisibleToViewer(['employees'], studentAccess)).toBe(false)
    expect(postVisibleToViewer(['faculty'], studentAccess)).toBe(false)
  })

  it('shows the older-posts empty state when every visible post is stale', () => {
    const now = Date.parse('2026-09-01T18:00:00.000Z')
    const posts = [
      { id: 1, audience: ['all'], createdAt: '2026-08-17T20:29:36.828Z' },
      { id: 2, audience: ['employees'], createdAt: '2026-08-17T14:30:05.662Z' },
      { id: 3, audience: ['students'], createdAt: '2026-04-13T18:59:08.819Z' },
    ]
    const feed = partitionTimelinePosts(posts, studentAccess, { now, olderVisibleCount: 0 })
    expect(feed.displayed).toEqual([])
    expect(feed.hiddenOlderCount).toBe(2)
  })
})
