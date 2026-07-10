import { buildPagePathMap } from './connectPagesTreeCore'
import {
  hasConnectGroupSlug,
  normalizeConnectUserRoles,
  type ConnectUserAccessLike,
} from './connectUserAccess'

export function isStaffHubPath(path: string): boolean {
  const normalized = path.replace(/\/$/, '') || '/'
  return normalized === '/staff' || normalized.startsWith('/staff/')
}

export function hasStaffHubAccess(user: ConnectUserAccessLike | null | undefined): boolean {
  if (!user) return false
  if (normalizeConnectUserRoles(user).includes('staff')) return true
  return hasConnectGroupSlug(user, 'admin')
}

export function isStaffHubPageId(pageId: string | number, rawPages: unknown[]): boolean {
  const { pathById } = buildPagePathMap(rawPages)
  const path = pathById.get(String(pageId))
  return path ? isStaffHubPath(path) : false
}

export function filterOutStaffHubPages<T extends { id?: string | number }>(rawPages: T[]): T[] {
  const { pathById } = buildPagePathMap(rawPages)
  return rawPages.filter((page) => {
    const path = pathById.get(String(page.id))
    return !path || !isStaffHubPath(path)
  })
}
