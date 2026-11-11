import { createError, defineEventHandler, readBody } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const body = (await readBody(event).catch(() => ({}))) as { userId?: number | string }
  const userId = typeof body.userId === 'number' ? body.userId : Number.parseInt(String(body.userId || ''), 10)
  if (!Number.isInteger(userId) || userId < 1) {
    throw createError({ statusCode: 400, statusMessage: 'User is required' })
  }

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-messages/official-senders`, {
    event,
    auth,
    method: 'POST',
    body: { userId },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to add official account')
  })
})
