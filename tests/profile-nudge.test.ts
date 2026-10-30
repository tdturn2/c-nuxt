import { describe, expect, it } from 'vitest'
import {
  PROFILE_NUDGE_ACCOUNT_AGE_MS,
  PROFILE_NUDGE_MAX_PROMPTS,
  PROFILE_NUDGE_SNOOZE_MS,
  emptyProfileNudgeRecord,
  isProfileNudgeEligible,
  isProfileThin,
  optOutProfileNudge,
  parseProfileNudgeRecord,
  profileNudgeNeedsStudentAnswers,
  recordProfileNudgeVisit,
  shouldShowProfileNudge,
  snoozeProfileNudge,
  type ProfileNudgeRecord,
  type ProfileNudgeUser,
} from '../shared/profileNudge'

const NOW = Date.parse('2026-10-30T16:00:00.000Z')
const DAY = PROFILE_NUDGE_ACCOUNT_AGE_MS

function user(overrides: Partial<ProfileNudgeUser> = {}): ProfileNudgeUser {
  return {
    id: 7,
    roles: [],
    avatar: { url: '/api/connect-user-media/file/avatar.png' },
    createdAt: new Date(NOW - DAY - 1000).toISOString(),
    ...overrides,
  }
}

function record(overrides: Partial<ProfileNudgeRecord> = {}): ProfileNudgeRecord {
  return { ...emptyProfileNudgeRecord(), visitCount: 2, ...overrides }
}

describe('isProfileThin', () => {
  it('treats a missing photo as thin for any role', () => {
    expect(isProfileThin(user({ avatar: null }))).toBe(true)
    expect(isProfileThin(user({ avatar: { url: '  ' } }))).toBe(true)
  })

  it('treats a photo-only user with no role section as filled', () => {
    expect(isProfileThin(user())).toBe(false)
  })

  it('requires a faculty bio', () => {
    const faculty = user({ roles: ['faculty'] })
    expect(isProfileThin(faculty)).toBe(true)
    expect(isProfileThin(user({
      roles: ['faculty'],
      facultyBio: { root: { children: [{ type: 'text', text: 'I teach worship.' }] } },
    }))).toBe(false)
  })

  it('requires a phone or an office location for staff', () => {
    expect(isProfileThin(user({ roles: ['employee'] }))).toBe(true)
    expect(isProfileThin(user({ roles: ['staff'], phone: '859-555-0100' }))).toBe(false)
    expect(isProfileThin(user({ roles: ['staff'], location: 'BC 210' }))).toBe(false)
  })

  it('requires a degree or contact detail for alumni', () => {
    expect(isProfileThin(user({ roles: ['alumni'] }))).toBe(true)
    expect(isProfileThin(user({
      roles: ['alumni'],
      alumniDegrees: [{ degree: 'MDiv', graduationYear: 2014 }],
    }))).toBe(false)
    expect(isProfileThin(user({
      roles: ['alumni'],
      alumniContact: { email: 'alum@example.com' },
    }))).toBe(false)
  })

  it('does not treat a student who has not opted in as incomplete', () => {
    expect(isProfileThin(user({ roles: ['student'], studentOptIn: false }))).toBe(false)
    expect(profileNudgeNeedsStudentAnswers(user({ roles: ['student'], studentOptIn: false }))).toBe(false)
  })

  it('treats an opted-in student with no answers as thin', () => {
    const student = user({ roles: ['student'], studentOptIn: true })
    expect(profileNudgeNeedsStudentAnswers(student)).toBe(true)
    expect(isProfileThin(student)).toBe(false)
    expect(isProfileThin(student, {})).toBe(true)
    expect(isProfileThin(student, { program: 'MDiv' })).toBe(false)
  })

  it('skips the survey fetch when another section is already thin', () => {
    const student = user({ roles: ['student', 'faculty'], studentOptIn: true, avatar: null })
    expect(profileNudgeNeedsStudentAnswers(student)).toBe(false)
    expect(isProfileThin(student)).toBe(true)
  })
})

describe('shouldShowProfileNudge', () => {
  it('waits for a second visit when the account is new', () => {
    const fresh = user({ createdAt: new Date(NOW - 60_000).toISOString(), avatar: null })
    expect(isProfileNudgeEligible(fresh, record({ visitCount: 1 }), NOW)).toBe(false)
    expect(shouldShowProfileNudge(fresh, record({ visitCount: 1 }), NOW)).toBe(false)
    expect(shouldShowProfileNudge(fresh, record({ visitCount: 2 }), NOW)).toBe(true)
  })

  it('shows on the first visit when the account is at least a day old', () => {
    const existing = user({ avatar: null, createdAt: new Date(NOW - DAY).toISOString() })
    expect(shouldShowProfileNudge(existing, record({ visitCount: 1 }), NOW)).toBe(true)
  })

  it('hides while snoozed, after three reminders, when opted out, or while previewing a role', () => {
    const thin = user({ avatar: null })
    expect(shouldShowProfileNudge(thin, record({ snoozeUntil: NOW + 1000 }), NOW)).toBe(false)
    expect(shouldShowProfileNudge(thin, record({ snoozeUntil: NOW - 1, promptCount: 1 }), NOW)).toBe(true)
    expect(shouldShowProfileNudge(thin, record({ promptCount: PROFILE_NUDGE_MAX_PROMPTS }), NOW)).toBe(false)
    expect(shouldShowProfileNudge(thin, optOutProfileNudge(record()), NOW)).toBe(false)
    expect(shouldShowProfileNudge(user({ avatar: null, impersonation: { active: true } }), record(), NOW)).toBe(false)
  })

  it('snooze counts toward the cap and lasts two weeks', () => {
    const next = snoozeProfileNudge(record({ promptCount: 2 }), NOW)
    expect(next.promptCount).toBe(3)
    expect(next.snoozeUntil).toBe(NOW + PROFILE_NUDGE_SNOOZE_MS)
    expect(shouldShowProfileNudge(user({ avatar: null }), next, NOW + PROFILE_NUDGE_SNOOZE_MS + 1)).toBe(false)
  })

  it('counts a visit without dropping the other fields', () => {
    const next = recordProfileNudgeVisit(record({ visitCount: 1, optedOut: false }))
    expect(next.visitCount).toBe(2)
  })

  it('ignores malformed stored records', () => {
    expect(parseProfileNudgeRecord(null)).toEqual(emptyProfileNudgeRecord())
    expect(parseProfileNudgeRecord({ visitCount: '2', promptCount: -1, snoozeUntil: 'soon', optedOut: 1 })).toEqual({
      visitCount: 2,
      promptCount: 0,
      snoozeUntil: null,
      optedOut: false,
    })
  })
})
