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

export function hasConnectGroupSlug(
  user: ConnectUserAccessLike | null | undefined,
  slug: string,
): boolean {
  const normalized = slug.trim().toLowerCase()
  return normalizeConnectGroupSlugs(user).includes(normalized)
}
