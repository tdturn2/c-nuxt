import { createError, defineEventHandler, getQuery, getRouterParam, readBody } from 'h3'
import { dashboardPayloadFetch, requireDashboardStaff, toProxyError } from '../../../utils/dashboardForms'

function pathSuffix(event: Parameters<typeof getRouterParam>[0]) {
  const raw = getRouterParam(event, 'path') ?? event.context.params?.path
  if (Array.isArray(raw)) return raw.join('/')
  return String(raw || '').replace(/^\/+|\/+$/g, '')
}

function querySuffix(event: Parameters<typeof getQuery>[0]) {
  const query = getQuery(event)
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item))
    } else {
      search.set(key, String(value))
    }
  }
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ''
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const suffix = pathSuffix(event)
  if (!suffix) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const url = `${auth.payloadBaseUrl}/api/campus-hours/${suffix}${querySuffix(event)}`
  try {
    const method = event.method || 'GET'
    const init: { event: typeof event; auth: typeof auth; method: string; body?: unknown } = {
      event,
      auth,
      method,
    }
    if (!['GET', 'HEAD', 'DELETE'].includes(method)) {
      init.body = await readBody(event).catch(() => ({}))
    }
    return await dashboardPayloadFetch(url, init)
  } catch (err: any) {
    throw toProxyError(err, 'Failed to update campus hours')
  }
})
