import { defineEventHandler } from 'h3'
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

  const payloadUser: any = await $fetch(`${auth.payloadBaseUrl}/api/users/me`, {
    headers,
  }).catch((err: any) => {
    throw toProxyError(err, 'Dashboard auth-check failed against Payload /api/users/me')
  })

  return {
    ok: true,
    payloadUser: {
      collection: payloadUser?.collection ?? 'users',
      id: payloadUser?.id ?? null,
      email: payloadUser?.email ?? null,
    },
  }
})
