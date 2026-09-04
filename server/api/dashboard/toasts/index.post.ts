import { createError, defineEventHandler, readBody } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
  toProxyError,
} from '../../../utils/dashboardForms'

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseDays(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))]
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>

  const message = asTrimmed(body.message)
  const sendTime = asTrimmed(body.sendTime)
  const daysOfWeek = parseDays(body.daysOfWeek)
  if (!message) throw createError({ statusCode: 400, statusMessage: 'Message is required' })
  if (!/^\d{2}:\d{2}$/.test(sendTime)) {
    throw createError({ statusCode: 400, statusMessage: 'Send time must be HH:MM' })
  }
  if (!daysOfWeek.length) {
    throw createError({ statusCode: 400, statusMessage: 'Select at least one day' })
  }

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-toasts`, {
    event,
    auth,
    method: 'POST',
    body: {
      title: asTrimmed(body.title) || null,
      message,
      href: asTrimmed(body.href) || null,
      hrefLabel: asTrimmed(body.hrefLabel) || null,
      daysOfWeek,
      sendTime,
      timezone: asTrimmed(body.timezone) || 'America/New_York',
      enabled: body.enabled !== false,
      sortOrder: body.sortOrder ?? 0,
    },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create toast')
  })
})
