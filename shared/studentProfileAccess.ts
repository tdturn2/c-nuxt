export function canPublishStudentProfile(user: {
  roles?: unknown
  studentOptIn?: unknown
}): boolean {
  const roles = Array.isArray(user.roles)
    ? user.roles.map((role) => String(role || '').trim().toLowerCase()).filter(Boolean)
    : []
  if (!roles.includes('student')) return true
  return user.studentOptIn === true
}
