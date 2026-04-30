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

  const payloadMe: any = await $fetch(
    `${auth.payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(auth.email)}&limit=1&depth=0`,
    {
    headers,
  }).catch((err: any) => {
    throw toProxyError(err, 'Dashboard auth-check failed against Payload /api/connect-users')
  })

  const resolvedUser = Array.isArray(payloadMe?.docs) ? payloadMe.docs[0] : null

  if (!resolvedUser || resolvedUser.id == null) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Payload auth-check did not resolve an authenticated connect user',
      data: { payloadMe },
    })
  }

  return {
    ok: true,
    payloadUser: {
      collection: 'connect-users',
      id: resolvedUser?.id ?? null,
      email: resolvedUser?.email ?? null,
    },
  }
})
