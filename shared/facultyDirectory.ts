export function isHiddenFromFacultyDirectory(user: { hideFromFacultyDirectory?: boolean | null } | null | undefined): boolean {
  return user?.hideFromFacultyDirectory === true
}

/** Public faculty listing and faculty profile layout. The faculty role can remain for permissions. */
export function isPublicFaculty(user: {
  roles?: unknown
  hideFromFacultyDirectory?: boolean | null
} | null | undefined): boolean {
  if (isHiddenFromFacultyDirectory(user)) return false
  const roles = Array.isArray(user?.roles) ? user.roles : []
  return roles.some((role) => String(role).trim().toLowerCase() === 'faculty')
}
