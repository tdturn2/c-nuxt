import { defineEventHandler, getQuery } from 'h3'
import { getDashboardPayloadHeaders, requireDashboardStaff, toProxyError } from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const { payloadBaseUrl } = auth
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page || 1))
  const limit = Math.min(100, Math.max(1, Number(query.limit || 25)))
  const status = typeof query.status === 'string' ? query.status.trim().toLowerCase() : ''
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  params.set('sort', '-updatedAt')
  if (status === 'active' || status === 'inactive') {
    params.set('where[status][equals]', status)
  }
  if (search) {
    params.set('where[or][0][slug][like]', search)
    params.set('where[or][1][title][like]', search)
  }

  const headers = getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' })

  return await $fetch(`${payloadBaseUrl}/api/connect-forms?${params.toString()}`, {
    headers,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch forms')
  })
})
