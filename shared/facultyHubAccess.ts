import { buildPagePathMap } from './connectPagesTreeCore'
import {
  normalizeConnectGroupSlugs,
  normalizeConnectUserRoles,
  type ConnectUserAccessLike,
} from './connectUserAccess'

export type { ConnectUserAccessLike } from './connectUserAccess'

export const FACULTY_HUB_GROUP_SLUGS = new Set(['faculty-access', 'admin'])

export function isFacultyHubPath(path: string): boolean {
  const normalized = path.replace(/\/$/, '') || '/'
  return normalized === '/faculty' || normalized.startsWith('/faculty/')
}

export function hasFacultyHubAccess(user: ConnectUserAccessLike | null | undefined): boolean {
  if (!user) return false
  if (normalizeConnectUserRoles(user).includes('faculty')) return true
  return normalizeConnectGroupSlugs(user).some((slug) => FACULTY_HUB_GROUP_SLUGS.has(slug))
}

export function isFacultyHubPageId(pageId: string | number, rawPages: unknown[]): boolean {
  const { pathById } = buildPagePathMap(rawPages)
  const path = pathById.get(String(pageId))
  return path ? isFacultyHubPath(path) : false
}

export function filterOutFacultyHubPages<T extends { id?: string | number }>(rawPages: T[]): T[] {
  const { pathById } = buildPagePathMap(rawPages)
  return rawPages.filter((page) => {
    const path = pathById.get(String(page.id))
    return !path || !isFacultyHubPath(path)
  })
}
