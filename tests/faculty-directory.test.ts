import { describe, expect, it } from 'vitest'
import { facultyTypeFromTitle, isHiddenFromFacultyDirectory, isPublicFaculty } from '../shared/facultyDirectory'

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

describe('faculty type from title', () => {
  it('groups unmarked titles as regular', () => {
    expect(facultyTypeFromTitle('Professor of Theology')).toBe('regular')
    expect(facultyTypeFromTitle('Associate Professor of Missions')).toBe('regular')
    expect(facultyTypeFromTitle('Dean of the School of Biblical Interpretation')).toBe('regular')
    expect(facultyTypeFromTitle('')).toBe('regular')
    expect(facultyTypeFromTitle(null)).toBe('regular')
  })

  it('matches distinguished anywhere in the title', () => {
    expect(facultyTypeFromTitle('Distinguished Professor of Philosophy')).toBe('distinguished')
    expect(facultyTypeFromTitle('Visiting Distinguished Professor of Old Testament')).toBe('distinguished')
    expect(facultyTypeFromTitle('  distinguished professor  ')).toBe('distinguished')
  })

  it('detects emeritus, adjunct, and affiliate appointments', () => {
    expect(facultyTypeFromTitle('Emeritus Professor')).toBe('emeritus')
    expect(facultyTypeFromTitle('Adjunct Professor')).toBe('adjunct')
    expect(facultyTypeFromTitle('Adjunct Instructor')).toBe('adjunct')
    expect(facultyTypeFromTitle('Affiliate Professor')).toBe('affiliate')
    expect(facultyTypeFromTitle('  affiliate professor  ')).toBe('affiliate')
  })
})
