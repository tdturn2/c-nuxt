type ConnectGroupLike = {
  slug?: string | null
  name?: string | null
}

function rolesOf(user: { roles?: unknown }): string[] {
  return Array.isArray(user.roles)
    ? user.roles.map((role) => String(role || '').trim().toLowerCase()).filter(Boolean)
    : []
}

function hasAlumniGroup(user: { groups?: unknown }): boolean {
  const groups: ConnectGroupLike[] = Array.isArray(user.groups) ? user.groups : []
  return groups.some((group) => {
    const slug = String(group?.slug ?? '').toLowerCase()
    const name = String(group?.name ?? '').toLowerCase()
    return slug.includes('alumni') || name.includes('alumni')
  })
}

/** Still a student, employee, admin, or alumnus. Offboarded accounts with none of these drop out of directories and search. */
export function isActiveConnectMember(user: { roles?: unknown; groups?: unknown }): boolean {
  const roles = rolesOf(user)
  if (roles.some((role) => role === 'student' || role === 'staff' || role === 'faculty' || role === 'admin' || role === 'alumni')) {
    return true
  }
  return hasAlumniGroup(user)
}
