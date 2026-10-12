import { describe, expect, it } from 'vitest'
import { isHiddenFromFacultyDirectory, isPublicFaculty } from '../shared/facultyDirectory'

describe('faculty directory visibility', () => {
  it('lists faculty until they are flagged', () => {
    expect(isPublicFaculty({ roles: ['faculty'] })).toBe(true)
    expect(isPublicFaculty({ roles: ['faculty', 'staff'], hideFromFacultyDirectory: false })).toBe(true)
  })

  it('treats a flagged faculty member as not public faculty', () => {
    expect(isHiddenFromFacultyDirectory({ hideFromFacultyDirectory: true })).toBe(true)
    expect(isPublicFaculty({ roles: ['faculty'], hideFromFacultyDirectory: true })).toBe(false)
    expect(isPublicFaculty({ roles: ['faculty', 'staff'], hideFromFacultyDirectory: true })).toBe(false)
  })

  it('does not treat other roles as public faculty', () => {
    expect(isPublicFaculty({ roles: ['staff'] })).toBe(false)
    expect(isPublicFaculty(null)).toBe(false)
  })
})
