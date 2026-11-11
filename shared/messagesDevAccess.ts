import { hasConnectGroupSlug, type ConnectUserAccessLike } from './connectUserAccess'

/** Temporary gate while Connect Messages is in development. */
const MESSAGES_DEV_EMAILS = new Set(['terry.turner@asburyseminary.edu'])

/** Connect group slug, or the same Active Directory group name. */
export const MESSAGES_TEST_GROUP = 'messages-test-group'

function hasDirectoryGroup(groups: unknown, name: string): boolean {
  if (!Array.isArray(groups)) return false
  const target = name.trim().toLowerCase()
  return groups.some((group) => typeof group === 'string' && group.trim().toLowerCase() === target)
}

function hasConnectGroupName(user: ConnectUserAccessLike | null | undefined, name: string): boolean {
  const target = name.trim().toLowerCase()
  const groups = Array.isArray(user?.groups) ? user.groups : []
  return groups.some((group) => {
    if (!group || typeof group !== 'object') return false
    return String((group as { name?: string | null }).name || '').trim().toLowerCase() === target
  })
}

export function canAccessMessagesDev(input: {
  email?: string | null
  directoryGroups?: unknown
  connectUser?: ConnectUserAccessLike | null
}): boolean {
  const email = String(input.email || '').trim().toLowerCase()
  if (MESSAGES_DEV_EMAILS.has(email)) return true
  if (hasDirectoryGroup(input.directoryGroups, MESSAGES_TEST_GROUP)) return true
  return (
    hasConnectGroupSlug(input.connectUser, MESSAGES_TEST_GROUP) ||
    hasConnectGroupName(input.connectUser, MESSAGES_TEST_GROUP)
  )
}

export function isMessagesPath(path: string): boolean {
  return path === '/messages' || path.startsWith('/messages/')
}
