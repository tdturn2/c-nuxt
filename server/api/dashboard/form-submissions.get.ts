import { defineEventHandler, getQuery } from 'h3'
import { getDashboardPayloadHeaders, requireDashboardStaff, toProxyError } from '../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const { payloadBaseUrl } = auth
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page || 1))
  const limit = Math.min(100, Math.max(1, Number(query.limit || 25)))
  const formSlug = typeof query.formSlug === 'string' ? query.formSlug.trim() : ''
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  params.set('sort', '-createdAt')
  params.set('depth', '1')
  if (formSlug) {
    params.set('where[formSlug][equals]', formSlug)
  }
  if (search) {
    params.set('where[or][0][email][like]', search)
    params.set('where[or][1][id][equals]', search)
  }

  const headers = getDashboardPayloadHeaders(event, auth, { Accept: 'application/json' })

  return await $fetch(`${payloadBaseUrl}/api/connect-form-submissions?${params.toString()}`, {
    headers,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch form submissions')
  })
})
