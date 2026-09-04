import { defineEventHandler, getQuery } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const query = getQuery(event)
  const params = new URLSearchParams()
  params.set('limit', String(Math.min(100, Math.max(1, Number(query.limit || 50)))))
  params.set('page', String(Math.max(1, Number(query.page || 1))))
  params.set('sort', 'sortOrder')
  if (typeof query.enabled === 'string' && query.enabled) {
    params.set('where[enabled][equals]', query.enabled)
  }

  return await dashboardPayloadFetch(
    `${auth.payloadBaseUrl}/api/connect-toasts?${params.toString()}`,
    { event, auth },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch toasts')
  })
})
