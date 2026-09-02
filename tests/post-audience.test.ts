import { describe, expect, it } from 'vitest'
import { postAudienceLabel, selectedAudiencesFromPost, serializePostAudience } from '../app/utils/postAudience'
import { postVisibleToViewer } from '../app/utils/timelineFeed'

describe('post audience selection', () => {
  it('treats all/general/empty as everyone', () => {
    expect(selectedAudiencesFromPost(['all'])).toEqual([])
    expect(selectedAudiencesFromPost(['general'])).toEqual([])
    expect(selectedAudiencesFromPost([])).toEqual([])
    expect(postAudienceLabel(['all'])).toBe('Everyone')
  })

  it('keeps specific groups and treats mixed all as everyone', () => {
    expect(selectedAudiencesFromPost(['students', 'faculty'])).toEqual(['students', 'faculty'])
    expect(selectedAudiencesFromPost(['students', 'faculty', 'all'])).toEqual([])
    expect(selectedAudiencesFromPost(['student', 'staff'])).toEqual(['students', 'staff'])
    expect(postAudienceLabel(['students', 'faculty'])).toBe('Students, Faculty')
  })

  it('serializes multi-select values and object items', () => {
    expect(serializePostAudience(['faculty', 'students', 'students'])).toEqual(['students', 'faculty'])
    expect(serializePostAudience([{ value: 'staff' }, { value: 'employees' }])).toEqual(['employees', 'staff'])
    expect(serializePostAudience(['all', 'general'])).toEqual([])
  })
})

describe('timeline visibility for combined audiences', () => {
  const studentAccess = {
    canSeeStudents: true,
    canSeeFaculty: false,
    canSeeStaff: false,
    canSeeEmployees: false,
  }

  it('shows a post when any selected group matches the viewer', () => {
    expect(postVisibleToViewer(['students', 'faculty'], studentAccess)).toBe(true)
    expect(postVisibleToViewer(['faculty', 'staff'], studentAccess)).toBe(false)
  })
})
