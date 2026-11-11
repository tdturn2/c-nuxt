import { createError, defineEventHandler, readBody } from 'h3'
import { messagePlainText, sanitizeMessageHtml } from '@shared/messageHtml'
import { dashboardPayloadFetch, requireDashboardAdmin, toProxyError } from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const body = (await readBody(event).catch(() => ({}))) as {
    conversationId?: number | string
    senderId?: number | string | null
    kind?: unknown
    body?: unknown
  }
  const conversationId = typeof body.conversationId === 'number'
    ? body.conversationId
    : Number.parseInt(String(body.conversationId || ''), 10)
  if (!Number.isInteger(conversationId) || conversationId < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a conversation' })
  }
  const raw = typeof body.body === 'string' ? body.body : ''
  const message = /<[a-z]/i.test(raw) ? sanitizeMessageHtml(raw) : raw.trim()
  if (!messagePlainText(message)) {
    throw createError({ statusCode: 400, statusMessage: 'Message is required' })
  }
  const senderRaw = body.senderId
  const senderId = senderRaw == null || senderRaw === ''
    ? null
    : typeof senderRaw === 'number'
      ? senderRaw
      : Number.parseInt(String(senderRaw), 10)
  const kind = body.kind === 'official' || body.kind === 'system' ? body.kind : 'user'
  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-messages/admin/messages`, {
    event,
    auth,
    method: 'POST',
    body: {
      conversationId,
      senderId: senderId != null && Number.isInteger(senderId) && senderId > 0 ? senderId : null,
      kind,
      body: message,
    },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create message')
  })
})
