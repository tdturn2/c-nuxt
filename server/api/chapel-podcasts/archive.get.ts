import { createError, defineEventHandler, getQuery } from 'h3'
import { resolveConnectApiUrl } from '../../utils/connectApi'

/** Public chapel message archive (full history) for ATS WordPress archive page. */
export default defineEventHandler(async (event) => {
  const connectApiUrl = resolveConnectApiUrl()
  if (!connectApiUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }

  const query = getQuery(event)
  const searchParams = new URLSearchParams()
  for (const key of ['limit', 'page', 'campus', 'year', 'q', 'search', 'service'] as const) {
    const value = query[key]
    if (value != null && String(value).trim() !== '') searchParams.set(key, String(value))
  }
  const qs = searchParams.toString()
  const url = `${connectApiUrl}/api/chapel-podcasts/archive${qs ? `?${qs}` : ''}`

  try {
    return await $fetch(url)
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 502,
      statusMessage: err?.statusMessage || err?.message || 'Failed to fetch chapel archive',
      data: err?.data,
    })
  }
})
