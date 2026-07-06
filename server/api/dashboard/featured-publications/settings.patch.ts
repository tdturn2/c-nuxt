import { defineEventHandler, readBody } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
  toProxyError,
} from '../../../utils/dashboardForms'

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseFeaturedBookIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const ids: number[] = []
  for (const item of value) {
    const id = Number(item)
    if (Number.isFinite(id) && id > 0 && !ids.includes(id)) ids.push(id)
  }
  return ids
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  const featuredBookIds = parseFeaturedBookIds(body.featuredBookIds)

  const settingsLookup = new URLSearchParams()
  settingsLookup.set('sort', '-updatedAt')
  settingsLookup.set('limit', '1')
  settingsLookup.set('depth', '0')

  const existingRes = await dashboardPayloadFetch<any>(
    `${auth.payloadBaseUrl}/api/connect-settings?${settingsLookup.toString()}`,
    { event, auth, method: 'GET' },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to load existing connect settings')
  })

  const existing = Array.isArray(existingRes?.docs) ? existingRes.docs[0] || null : null

  const payload = {
    name: asTrimmedString(body.name) || (existing?.name || 'Default'),
    dailyEucharist: existing?.dailyEucharist || {
      enabledThisWeek: false,
      summary: null,
    },
    featuredBooks: featuredBookIds,
  }

  if (existing?.id != null) {
    return await dashboardPayloadFetch<any>(
      `${auth.payloadBaseUrl}/api/connect-settings/${encodeURIComponent(String(existing.id))}`,
      { event, auth, method: 'PATCH', body: payload },
    ).catch((err: any) => {
      throw toProxyError(err, 'Failed to update featured publications')
    })
  }

  return await dashboardPayloadFetch<any>(`${auth.payloadBaseUrl}/api/connect-settings`, {
    event,
    auth,
    method: 'POST',
    body: payload,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create connect settings')
  })
})
