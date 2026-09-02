export const ROLE_PREVIEW_ROLES = ['student', 'faculty', 'staff'] as const
export type RolePreviewRole = (typeof ROLE_PREVIEW_ROLES)[number]

export type ImpersonationState =
  | { active: false }
  | { active: true; mode: 'role'; role: RolePreviewRole; actorEmail: string }

export function isRolePreviewRole(value: unknown): value is RolePreviewRole {
  return typeof value === 'string' && (ROLE_PREVIEW_ROLES as readonly string[]).includes(value)
}

export function rolePreviewLabel(role: RolePreviewRole): string {
  if (role === 'faculty') return 'Faculty'
  if (role === 'staff') return 'Staff'
  return 'Student'
}

/**
 * Overlay roles/groups for QA. Identity (id, email, name, avatar) is unchanged.
 * Admin/staff groups are stripped so dashboard UI and admin FAB hide during preview.
 */
export function applyRolePreview<T extends Record<string, any>>(
  user: T,
  role: RolePreviewRole,
  actorEmail: string,
): T & { impersonation: Extract<ImpersonationState, { active: true }> } {
  const groups =
    role === 'faculty'
      ? [{ id: 'preview-faculty-access', slug: 'faculty-access', name: 'Faculty Access' }]
      : []

  const next: any = {
    ...user,
    roles: [role],
    groups,
    impersonation: {
      active: true,
      mode: 'role',
      role,
      actorEmail,
    },
  }

  if (user.fields && typeof user.fields === 'object') {
    next.fields = { ...user.fields, roles: [role] }
  }

  return next
}
