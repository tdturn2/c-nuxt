import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { messagePlainText, sanitizeMessageHtml } from '@shared/messageHtml'
import { dashboardPayloadFetch, requireDashboardAdmin, toProxyError } from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const id = Number.parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  }
  const body = (await readBody(event).catch(() => ({}))) as { body?: unknown }
  const raw = typeof body.body === 'string' ? body.body : ''
  const message = /<[a-z]/i.test(raw) ? sanitizeMessageHtml(raw) : raw.trim()
  if (!messagePlainText(message)) {
    throw createError({ statusCode: 400, statusMessage: 'Message is required' })
  }
  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-messages/admin/messages/${id}`, {
    event,
    auth,
    method: 'PATCH',
    body: { body: message },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to update message')
  })
})
