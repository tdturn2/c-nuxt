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
    `${auth.payloadBaseUrl}/api/connect-groups?limit=1&depth=0`,
    {
      headers,
    },
  ).catch((err: any) => {
    throw toProxyError(err, 'Dashboard auth-check failed against protected Payload /api/connect-groups')
  })

  if (!payloadMe || !Array.isArray(payloadMe.docs)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Payload auth-check did not resolve a protected collection response',
      data: { payloadMe },
    })
  }

  return {
    ok: true,
    authContext: {
      via: headers.Authorization ? 'bearer' : 'cookie',
      protectedCollectionRead: true,
      sampleCount: payloadMe.docs.length,
    },
  }
})
