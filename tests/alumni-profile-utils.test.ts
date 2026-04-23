import { describe, expect, it } from 'vitest'
import { formatAlumniDegree, normalizeAlumniDegrees, sanitizeAlumniContact } from '../server/utils/alumniProfile'

describe('alumni profile utils', () => {
  it('normalizes degrees and drops blank entries', () => {
    const normalized = normalizeAlumniDegrees([
      { degree: '  MDiv  ', graduationYear: '2020' },
      { degree: ' ', graduationYear: 2021 },
      { degree: 'DMin', graduationYear: 'invalid' },
    ])

    expect(normalized).toEqual([
      { degree: 'MDiv', graduationYear: 2020 },
      { degree: 'DMin', graduationYear: null },
    ])
  })

  it('formats degree line with optional graduation year', () => {
    expect(formatAlumniDegree({ degree: 'MBA', graduationYear: 2022 })).toBe('MBA (2022)')
    expect(formatAlumniDegree({ degree: 'MDiv', graduationYear: null })).toBe('MDiv')
  })

  it('sanitizes alumni contact fields', () => {
    expect(sanitizeAlumniContact({
      email: ' alum@example.com ',
      phone: ' ',
      facebook: ' fb/me ',
      x: '',
      instagram: null,
    })).toEqual({
      email: 'alum@example.com',
      phone: null,
      facebook: 'fb/me',
      x: null,
      instagram: null,
    })
  })
})
