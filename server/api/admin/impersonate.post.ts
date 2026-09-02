import { createError, defineEventHandler, readBody } from 'h3'
import { isRolePreviewRole, rolePreviewLabel } from '@shared/impersonation'
import { requireDashboardAdmin } from '../../utils/dashboardForms'
import { writeViewAsCookie } from '../../utils/impersonation'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const body = await readBody(event).catch(() => null)
  const role = body?.role
  if (!isRolePreviewRole(role)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'role must be student, faculty, or staff',
    })
  }

  const payload = writeViewAsCookie(event, role, auth.email)
  console.info('[impersonation] start', {
    actor: payload.actorEmail,
    role: payload.role,
    label: rolePreviewLabel(payload.role),
  })

  return {
    ok: true,
    impersonation: {
      active: true,
      mode: 'role' as const,
      role: payload.role,
      actorEmail: payload.actorEmail,
    },
  }
})
