import type { ConnectUserAccessLike } from './connectUserAccess'
import { hasFacultyHubAccess, isFacultyHubPath } from './facultyHubAccess'
import { hasStaffHubAccess, isStaffHubPath } from './staffHubAccess'

export function canAccessAudienceHubPath(
  path: string,
  user: ConnectUserAccessLike | null | undefined,
): boolean {
  if (isFacultyHubPath(path)) return hasFacultyHubAccess(user)
  if (isStaffHubPath(path)) return hasStaffHubAccess(user)
  return true
}
