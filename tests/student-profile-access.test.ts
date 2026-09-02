import { describe, expect, it } from 'vitest'
import { canPublishStudentProfile } from '../shared/studentProfileAccess'

describe('canPublishStudentProfile', () => {
  it('hides a student who has not opted in', () => {
    expect(canPublishStudentProfile({ roles: ['student'], studentOptIn: false })).toBe(false)
    expect(canPublishStudentProfile({ roles: ['student'] })).toBe(false)
  })

  it('shows a student who opted in', () => {
    expect(canPublishStudentProfile({ roles: ['student'], studentOptIn: true })).toBe(true)
  })

  it('does not gate faculty-only users', () => {
    expect(canPublishStudentProfile({ roles: ['faculty'], studentOptIn: false })).toBe(true)
  })

  it('still requires opt-in when a student also has another role', () => {
    expect(canPublishStudentProfile({ roles: ['student', 'staff'], studentOptIn: false })).toBe(false)
    expect(canPublishStudentProfile({ roles: ['student', 'staff'], studentOptIn: true })).toBe(true)
  })
})
