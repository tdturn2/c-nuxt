import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
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
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Toast id is required' })

  const auth = await requireDashboardAdmin(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  const patch: Record<string, unknown> = {}

  if (body.title !== undefined) patch.title = asTrimmed(body.title) || null
  if (body.message !== undefined) {
    const message = asTrimmed(body.message)
    if (!message) throw createError({ statusCode: 400, statusMessage: 'Message is required' })
    patch.message = message
  }
  if (body.href !== undefined) patch.href = asTrimmed(body.href) || null
  if (body.hrefLabel !== undefined) patch.hrefLabel = asTrimmed(body.hrefLabel) || null
  if (body.daysOfWeek !== undefined) {
    const daysOfWeek = parseDays(body.daysOfWeek)
    if (!daysOfWeek.length) throw createError({ statusCode: 400, statusMessage: 'Select at least one day' })
    patch.daysOfWeek = daysOfWeek
  }
  if (body.sendTime !== undefined) {
    const sendTime = asTrimmed(body.sendTime)
    if (!/^\d{2}:\d{2}$/.test(sendTime)) {
      throw createError({ statusCode: 400, statusMessage: 'Send time must be HH:MM' })
    }
    patch.sendTime = sendTime
  }
  if (body.timezone !== undefined) patch.timezone = asTrimmed(body.timezone) || 'America/New_York'
  if (body.enabled !== undefined) patch.enabled = body.enabled !== false
  if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder

  if (!Object.keys(patch).length) {
    throw createError({ statusCode: 400, statusMessage: 'No fields to update' })
  }

  return await dashboardPayloadFetch(
    `${auth.payloadBaseUrl}/api/connect-toasts/${encodeURIComponent(id)}`,
    { event, auth, method: 'PATCH', body: patch },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to update toast')
  })
})
