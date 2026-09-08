import { createError, defineEventHandler, getQuery } from 'h3'
import { resolveConnectApiUrl } from '../../../utils/connectApi'

/** Public KY chapel podcast feed for herd RSS (no auth). */
export default defineEventHandler(async (event) => {
  const connectApiUrl = resolveConnectApiUrl()
  if (!connectApiUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }

  const query = getQuery(event)
  const searchParams = new URLSearchParams()
  if (query.limit != null) searchParams.set('limit', String(query.limit))
  const qs = searchParams.toString()
  const url = `${connectApiUrl}/api/chapel-podcasts/feed/ky${qs ? `?${qs}` : ''}`

  try {
    return await $fetch(url)
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 502,
      statusMessage: err?.statusMessage || err?.message || 'Failed to fetch chapel KY feed',
      data: err?.data,
    })
  }
})
