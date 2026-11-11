import { createError, defineEventHandler, readBody } from 'h3'
import { messagePlainText, sanitizeMessageHtml } from '@shared/messageHtml'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
  toProxyError,
} from '../../../utils/dashboardForms'

const AUDIENCES = ['faculty', 'staff', 'students']

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const body = (await readBody(event).catch(() => ({}))) as {
    senderId?: number | string
    audiences?: unknown
    html?: unknown
  }
  const senderId = typeof body.senderId === 'number' ? body.senderId : Number.parseInt(String(body.senderId || ''), 10)
  if (!Number.isInteger(senderId) || senderId < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Choose an official account' })
  }
  const audiences = (Array.isArray(body.audiences) ? body.audiences : [])
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => AUDIENCES.includes(item))
  if (!audiences.length) {
    throw createError({ statusCode: 400, statusMessage: 'Choose at least one audience' })
  }
  const html = sanitizeMessageHtml(typeof body.html === 'string' ? body.html : '')
  if (!messagePlainText(html)) {
    throw createError({ statusCode: 400, statusMessage: 'Message is required' })
  }

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-messages/official-broadcast`, {
    event,
    auth,
    method: 'POST',
    body: { senderId, audiences, html },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to send official message')
  })
})
