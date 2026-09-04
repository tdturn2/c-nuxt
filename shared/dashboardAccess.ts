/**
 * Keep this file in sync with Sites/connect-api/src/lib/dashboardAccess.ts
 *
 * Admins see every dashboard section. Other Connect groups unlock specific sections.
 * Assign members on /dashboard/users (Connect groups, not Azure/SSO).
 */
import {
  isConnectAdminUser,
  normalizeConnectGroupSlugs,
  type ConnectUserAccessLike,
} from './connectUserAccess'

export const CHAPEL_PODCAST_GROUP_SLUG = 'chapel-podcast'

export type DashboardSection =
  | 'home'
  | 'posts'
  | 'users'
  | 'docs'
  | 'media'
  | 'degrees'
  | 'forms'
  | 'home-slider'
  | 'daily-eucharist'
  | 'campus-hours'
  | 'chapel'
  | 'chapel-speakers'
  | 'jobs'
  | 'faculty-publications'
  | 'featured-publications'
  | 'form-results'
  | 'toasts'

/** Sections a non-admin group may use. Unlisted sections are admin-only. */
export const DASHBOARD_SECTION_GROUPS: Partial<Record<DashboardSection, readonly string[]>> = {
  chapel: [CHAPEL_PODCAST_GROUP_SLUG],
  'chapel-speakers': [CHAPEL_PODCAST_GROUP_SLUG],
}

function userHasAnySectionGroup(user: ConnectUserAccessLike | null | undefined): boolean {
  const slugs = new Set(normalizeConnectGroupSlugs(user))
  return Object.values(DASHBOARD_SECTION_GROUPS).some((groups) =>
    (groups ?? []).some((slug) => slugs.has(slug)),
  )
}

export function canAccessDashboard(user: ConnectUserAccessLike | null | undefined): boolean {
  return isConnectAdminUser(user) || userHasAnySectionGroup(user)
}

export function canAccessDashboardSection(
  user: ConnectUserAccessLike | null | undefined,
  section: DashboardSection,
): boolean {
  if (isConnectAdminUser(user)) return true
  if (section === 'home') return canAccessDashboard(user)
  const allowed = DASHBOARD_SECTION_GROUPS[section]
  if (!allowed?.length) return false
  const slugs = new Set(normalizeConnectGroupSlugs(user))
  return allowed.some((slug) => slugs.has(slug))
}
