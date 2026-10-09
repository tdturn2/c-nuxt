import { describe, expect, it } from 'vitest'
import { buildClassSearchTermOptions } from '../shared/academicTerms'

describe('visible class search terms', () => {
  it('stops at Spring 2027', () => {
    const options = buildClassSearchTermOptions()
    expect(options[0]).toEqual({ label: 'Spring 2027', value: 'SP27' })
    expect(options.some((term) => term.value === 'FA27' || term.value === 'SU27' || term.value === 'SP28')).toBe(false)
  })
})
