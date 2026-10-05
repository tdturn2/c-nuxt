import { createError, defineEventHandler, readBody } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../../utils/dashboardForms'
import { isChapelCalendarThemeColor } from '@shared/chapelCalendarThemes'

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function ymd(value: unknown): string {
  const raw = asTrimmed(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event, { section: 'chapel' })
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>

  const label = asTrimmed(body.label)
  const startDate = ymd(body.startDate)
  const endDate = ymd(body.endDate)
  const color = asTrimmed(body.color).toLowerCase()
  if (!label) throw createError({ statusCode: 400, statusMessage: 'Label is required' })
  if (label.length > 80) throw createError({ statusCode: 400, statusMessage: 'Label must be 80 characters or fewer' })
  if (!startDate || !endDate) throw createError({ statusCode: 400, statusMessage: 'Start and end dates are required' })
  if (endDate < startDate) throw createError({ statusCode: 400, statusMessage: 'End date must be on or after the start date' })
  if (!isChapelCalendarThemeColor(color)) throw createError({ statusCode: 400, statusMessage: 'Choose a theme color' })

  const note = asTrimmed(body.note)

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/chapel-calendar-themes`, {
    event,
    auth,
    method: 'POST',
    body: {
      label,
      startDate,
      endDate,
      color,
      note: note || null,
      active: body.active !== false,
    },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create chapel calendar theme')
  })
})
