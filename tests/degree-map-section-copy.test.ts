import { describe, expect, it } from 'vitest'
import { parseSectionCopy } from '../shared/degreeMapSectionCopy'

describe('degree map section copy', () => {
  it('splits a note and lists course codes separately from the requirement text', () => {
    const copy = parseSectionCopy(`900 level courses
In biblical studies and languages cognate to biblical studies (Full-time PHD [BS] students are required to complete these courses within the program.)

Note: Courses defined as "languages cognate to biblical
studies" are:
BS710–711
NT601, NT605, NT700, NT705
OT651, OT701-706, OT707`)

    expect(copy?.paragraphs).toEqual([
      '900 level courses',
      'In biblical studies and languages cognate to biblical studies (Full-time PHD [BS] students are required to complete these courses within the program.)',
    ])
    expect(copy?.note).toBe('Courses defined as "languages cognate to biblical studies" are:')
    expect(copy?.codes).toEqual(['BS710–711', 'NT601', 'NT605', 'NT700', 'NT705', 'OT651', 'OT701-706', 'OT707'])
  })

  it('keeps a plain description as paragraphs', () => {
    expect(parseSectionCopy('Choose any 12 hours.\n\nMay include independent study.')).toEqual({
      paragraphs: ['Choose any 12 hours.', 'May include independent study.'],
      note: '',
      codes: [],
    })
  })

  it('returns null for blank copy', () => {
    expect(parseSectionCopy('  \n')).toBeNull()
  })
})
