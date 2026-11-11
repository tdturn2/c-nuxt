import { describe, expect, it } from 'vitest'
import { canAccessMessagesDev } from '../shared/messagesDevAccess'

describe('messages dev access', () => {
  it('keeps the developer account', () => {
    expect(canAccessMessagesDev({ email: 'Terry.Turner@asburyseminary.edu' })).toBe(true)
  })

  it('allows the messages test group from Active Directory or Connect', () => {
    expect(canAccessMessagesDev({
      email: 'student@asburyseminary.edu',
      directoryGroups: ['CX Students', 'messages-test-group'],
    })).toBe(true)

    expect(canAccessMessagesDev({
      email: 'student@asburyseminary.edu',
      connectUser: { groups: [{ slug: 'messages-test-group', name: 'Messages Test Group' }] },
    })).toBe(true)
  })

  it('hides messages from everyone else', () => {
    expect(canAccessMessagesDev({
      email: 'student@asburyseminary.edu',
      directoryGroups: ['CX Students'],
      connectUser: { groups: [{ slug: 'staff', name: 'Staff' }] },
    })).toBe(false)
    expect(canAccessMessagesDev({})).toBe(false)
  })
})
