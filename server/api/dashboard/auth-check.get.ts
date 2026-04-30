import { createError, defineEventHandler } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const headers = withServerBearer(
    getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }),
  )

  const payloadMe: any = await $fetch(`${auth.payloadBaseUrl}/api/users/me`, {
    headers,
  }).catch((err: any) => {
    throw toProxyError(err, 'Dashboard auth-check failed against Payload /api/users/me')
  })

  const resolvedUser = (payloadMe && typeof payloadMe === 'object' && 'user' in payloadMe)
    ? (payloadMe as any).user
    : payloadMe

  if (!resolvedUser || resolvedUser.id == null) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Payload auth-check did not resolve an authenticated admin user',
      data: { payloadMe },
    })
  }

  return {
    ok: true,
    payloadUser: {
      collection: resolvedUser?.collection ?? null,
      id: resolvedUser?.id ?? null,
      email: resolvedUser?.email ?? null,
    },
  }
})
