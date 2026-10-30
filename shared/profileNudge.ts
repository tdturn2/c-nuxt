import { normalizeConnectUserRoles } from './connectUserAccess'
import { extractLexicalPlainText } from './lexicalPlainText'

/** Hide the card for two weeks after "Remind me later". */
export const PROFILE_NUDGE_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000

/** How many times the card may be brought back. The third "Remind me later" ends it. */
export const PROFILE_NUDGE_MAX_PROMPTS = 3

/** Existing accounts can see the card on the first visit in this browser. */
export const PROFILE_NUDGE_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000

export const PROFILE_NUDGE_STORAGE_PREFIX = 'connect-profile-nudge:'
export const PROFILE_NUDGE_SESSION_KEY = 'connect-profile-nudge-visit'

export type ProfileNudgeUser = {
  id?: number | string | null
  roles?: unknown
  fields?: { roles?: unknown }
  avatar?: { url?: string | null } | string | null
  facultyBio?: unknown
  phone?: unknown
  location?: unknown
  alumniDegrees?: unknown
  alumniContact?: unknown
  studentOptIn?: unknown
  createdAt?: unknown
  impersonation?: { active?: boolean } | null
}

export type ProfileNudgeRecord = {
  visitCount: number
  promptCount: number
  snoozeUntil: number | null
  optedOut: boolean
}

/** `undefined` means the student answers have not been loaded yet. */
export type ProfileNudgeStudentAnswers = Record<string, unknown> | undefined

export function profileNudgeStorageKey(userId: number | string): string {
  return `${PROFILE_NUDGE_STORAGE_PREFIX}${userId}`
}

export function emptyProfileNudgeRecord(): ProfileNudgeRecord {
  return {
    visitCount: 0,
    promptCount: 0,
    snoozeUntil: null,
    optedOut: false,
  }
}

function nonNegativeInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

export function parseProfileNudgeRecord(raw: unknown): ProfileNudgeRecord {
  if (!raw || typeof raw !== 'object') return emptyProfileNudgeRecord()
  const source = raw as Record<string, unknown>
  const snooze = source.snoozeUntil
  const snoozeUntil = typeof snooze === 'number' && Number.isFinite(snooze) ? snooze : null
  return {
    visitCount: nonNegativeInt(source.visitCount),
    promptCount: nonNegativeInt(source.promptCount),
    snoozeUntil,
    optedOut: source.optedOut === true,
  }
}

export function recordProfileNudgeVisit(record: ProfileNudgeRecord): ProfileNudgeRecord {
  return { ...record, visitCount: record.visitCount + 1 }
}

export function snoozeProfileNudge(record: ProfileNudgeRecord, now: number): ProfileNudgeRecord {
  return {
    ...record,
    promptCount: record.promptCount + 1,
    snoozeUntil: now + PROFILE_NUDGE_SNOOZE_MS,
  }
}

export function optOutProfileNudge(record: ProfileNudgeRecord): ProfileNudgeRecord {
  return { ...record, optedOut: true }
}

function hasRole(user: ProfileNudgeUser, role: string): boolean {
  return normalizeConnectUserRoles(user).includes(role)
}

function isStaffUser(user: ProfileNudgeUser): boolean {
  const roles = normalizeConnectUserRoles(user)
  return roles.includes('staff') || roles.includes('employee')
}

function avatarUrl(user: ProfileNudgeUser): string {
  const avatar = user.avatar
  if (typeof avatar === 'string') return avatar.trim()
  if (avatar && typeof avatar === 'object') return String(avatar.url ?? '').trim()
  return ''
}

function hasAlumniContent(user: ProfileNudgeUser): boolean {
  const degrees = Array.isArray(user.alumniDegrees) ? user.alumniDegrees : []
  const hasDegree = degrees.some((entry) => {
    if (!entry || typeof entry !== 'object') return false
    return String((entry as { degree?: unknown }).degree ?? '').trim().length > 0
  })
  const contact = user.alumniContact && typeof user.alumniContact === 'object'
    ? user.alumniContact as Record<string, unknown>
    : {}
  const hasContact = ['email', 'phone', 'facebook', 'x', 'instagram'].some((key) => {
    return String(contact[key] ?? '').trim().length > 0
  })
  return hasDegree || hasContact
}

function hasStudentAnswer(answers: ProfileNudgeStudentAnswers): boolean {
  if (!answers) return false
  return Object.values(answers).some((value) => String(value ?? '').trim().length > 0)
}

/**
 * True when a section other people see is still empty.
 * A student who has not opted in to share is not treated as incomplete.
 * Pass student answers only after they have loaded; `undefined` skips that check.
 */
export function isProfileThin(
  user: ProfileNudgeUser | null | undefined,
  studentAnswers?: ProfileNudgeStudentAnswers,
): boolean {
  if (!user) return false
  if (!avatarUrl(user)) return true
  if (hasRole(user, 'faculty') && !extractLexicalPlainText(user.facultyBio)) return true
  if (isStaffUser(user)) {
    const phone = String(user.phone ?? '').trim()
    const location = String(user.location ?? '').trim()
    if (!phone && !location) return true
  }
  if (hasRole(user, 'alumni') && !hasAlumniContent(user)) return true
  if (
    hasRole(user, 'student')
    && user.studentOptIn === true
    && studentAnswers !== undefined
    && !hasStudentAnswer(studentAnswers)
  ) {
    return true
  }
  return false
}

/** Fetch survey answers only when they are the remaining reason the profile might be thin. */
export function profileNudgeNeedsStudentAnswers(user: ProfileNudgeUser | null | undefined): boolean {
  if (!user || user.impersonation?.active) return false
  if (!hasRole(user, 'student') || user.studentOptIn !== true) return false
  return !isProfileThin(user)
}

export function isProfileNudgeEligible(
  user: ProfileNudgeUser,
  record: ProfileNudgeRecord,
  now: number,
): boolean {
  if (record.visitCount >= 2) return true
  const created = Date.parse(String(user.createdAt ?? ''))
  if (!Number.isFinite(created)) return false
  return now - created >= PROFILE_NUDGE_ACCOUNT_AGE_MS
}

export function shouldShowProfileNudge(
  user: ProfileNudgeUser | null | undefined,
  record: ProfileNudgeRecord,
  now: number,
  studentAnswers?: ProfileNudgeStudentAnswers,
): boolean {
  if (!user?.id || user.impersonation?.active) return false
  if (record.optedOut) return false
  if (record.promptCount >= PROFILE_NUDGE_MAX_PROMPTS) return false
  if (record.snoozeUntil != null && now < record.snoozeUntil) return false
  if (!isProfileNudgeEligible(user, record, now)) return false
  return isProfileThin(user, studentAnswers)
}
