import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
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
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Theme id is required' })

  const auth = await requireDashboardStaff(event, { section: 'chapel' })
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const patch: Record<string, unknown> = {}

  if (body.label !== undefined) {
    const label = asTrimmed(body.label)
    if (!label) throw createError({ statusCode: 400, statusMessage: 'Label is required' })
    if (label.length > 80) throw createError({ statusCode: 400, statusMessage: 'Label must be 80 characters or fewer' })
    patch.label = label
  }
  if (body.startDate !== undefined || body.endDate !== undefined) {
    const startDate = ymd(body.startDate)
    const endDate = ymd(body.endDate)
    if (!startDate || !endDate) throw createError({ statusCode: 400, statusMessage: 'Start and end dates are required' })
    if (endDate < startDate) throw createError({ statusCode: 400, statusMessage: 'End date must be on or after the start date' })
    patch.startDate = startDate
    patch.endDate = endDate
  }
  if (body.color !== undefined) {
    const color = asTrimmed(body.color).toLowerCase()
    if (!isChapelCalendarThemeColor(color)) throw createError({ statusCode: 400, statusMessage: 'Choose a theme color' })
    patch.color = color
  }
  if (body.note !== undefined) patch.note = asTrimmed(body.note) || null
  if (body.active !== undefined) patch.active = body.active !== false

  if (!Object.keys(patch).length) {
    throw createError({ statusCode: 400, statusMessage: 'No fields to update' })
  }

  return await dashboardPayloadFetch(
    `${auth.payloadBaseUrl}/api/chapel-calendar-themes/${encodeURIComponent(id)}`,
    { event, auth, method: 'PATCH', body: patch },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to update chapel calendar theme')
  })
})
