import { buildPagePathMap } from './connectPagesTreeCore'

export const FACULTY_HUB_GROUP_SLUGS = new Set(['faculty-access', 'admin'])

export type ConnectUserAccessLike = {
  roles?: unknown
  fields?: { roles?: unknown }
  groups?: Array<{ slug?: string | null; name?: string | null } | string | number>
}

export function normalizeConnectUserRoles(user: ConnectUserAccessLike | null | undefined): string[] {
  const roles: unknown[] = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    ...(Array.isArray(user?.fields?.roles) ? user.fields.roles : []),
  ]
  return roles
    .map((role) => String(role || '').trim().toLowerCase())
    .filter(Boolean)
}

export function normalizeConnectGroupSlugs(user: ConnectUserAccessLike | null | undefined): string[] {
  const groups = Array.isArray(user?.groups) ? user.groups : []
  return groups
    .map((group) => {
      if (group && typeof group === 'object' && 'slug' in group) {
        return String((group as { slug?: string | null }).slug || '').trim().toLowerCase()
      }
      return ''
    })
    .filter(Boolean)
}

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
