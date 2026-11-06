import { describe, expect, it } from 'vitest'
import { publicContactEmail } from '../shared/publicContactEmail'

describe('publicContactEmail', () => {
  it('uses the preferred address when one is set', () => {
    expect(publicContactEmail({
      email: 'kriss.whiteman@asburyseminary.edu',
      preferredEmail: 'advancedresearchprograms@asburyseminary.edu',
    })).toBe('advancedresearchprograms@asburyseminary.edu')
  })

  it('falls back to the login email', () => {
    expect(publicContactEmail({
      email: 'terry.turner@asburyseminary.edu',
      preferredEmail: '  ',
    })).toBe('terry.turner@asburyseminary.edu')
    expect(publicContactEmail({ email: 'terry.turner@asburyseminary.edu' })).toBe('terry.turner@asburyseminary.edu')
  })

  it('returns null when neither address is set', () => {
    expect(publicContactEmail({ email: null, preferredEmail: null })).toBeNull()
    expect(publicContactEmail(null)).toBeNull()
  })
})
