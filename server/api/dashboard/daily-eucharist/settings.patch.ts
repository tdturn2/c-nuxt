import { defineEventHandler, readBody } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../../utils/dashboardForms'

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>

  const settingsLookup = new URLSearchParams()
  settingsLookup.set('sort', '-updatedAt')
  settingsLookup.set('limit', '1')
  settingsLookup.set('depth', '0')
  const existingRes = await dashboardPayloadFetch<any>(
    `${auth.payloadBaseUrl}/api/connect-settings?${settingsLookup.toString()}`,
    { event, auth, method: 'GET' },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to load existing Daily Eucharist settings')
  })
  const existing = Array.isArray(existingRes?.docs) ? existingRes.docs[0] || null : null

  const payload = {
    name: asTrimmedString(body.name) || (existing?.name || 'Default'),
    dailyEucharist: {
      enabledThisWeek: body?.dailyEucharist?.enabledThisWeek === true,
      summary: asTrimmedString(body?.dailyEucharist?.summary) || null,
    },
  }

  if (existing?.id != null) {
    return await dashboardPayloadFetch<any>(
      `${auth.payloadBaseUrl}/api/connect-settings/${encodeURIComponent(String(existing.id))}`,
      { event, auth, method: 'PATCH', body: payload },
    ).catch((err: any) => {
      throw toProxyError(err, 'Failed to update Daily Eucharist settings')
    })
  }

  return await dashboardPayloadFetch<any>(`${auth.payloadBaseUrl}/api/connect-settings`, {
    event,
    auth,
    method: 'POST',
    body: payload,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create Daily Eucharist settings')
  })
})
