import { createError, defineEventHandler, getRouterParam } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event)
  const params = new URLSearchParams()
  params.set('where[owner][equals]', String(id))
  params.set('where[kind][equals]', 'avatars')
  params.set('sort', '-createdAt')
  params.set('limit', '50')
  params.set('depth', '0')

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-user-media?${params.toString()}`, {
    event,
    auth,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch avatar media')
  })
})
