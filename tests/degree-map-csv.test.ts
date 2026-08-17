import { describe, expect, it } from 'vitest'
import { DEGREE_MAP_CSV_TEMPLATE, parseDegreeMapCsv } from '../shared/degreeMapCsv'

describe('parseDegreeMapCsv', () => {
  it('parses template rows', () => {
    const { rows, errors } = parseDegreeMapCsv(DEGREE_MAP_CSV_TEMPLATE)
    expect(errors).toEqual([])
    expect(rows.length).toBe(3)
    expect(rows[0]?.sectionName).toBe('Biblical Foundations')
    expect(rows[0]?.courseCode).toBe('OT501')
    expect(rows[0]?.courseCredits).toBe(3)
    expect(rows[2]?.specializationName).toBe('Youth Ministry')
  })

  it('requires section_name and course_code columns', () => {
    const { rows, errors } = parseDegreeMapCsv('foo,bar\na,b')
    expect(rows).toEqual([])
    expect(errors.some((e) => e.includes('section_name'))).toBe(true)
    expect(errors.some((e) => e.includes('course_code'))).toBe(true)
  })

  it('normalizes course codes to uppercase in output', () => {
    const { rows, errors } = parseDegreeMapCsv(
      'section_name,course_code\nCore,ot501\n',
    )
    expect(errors).toEqual([])
    expect(rows[0]?.courseCode).toBe('OT501')
  })
})
