// Proxy list (find) to Payload chapel-podcasts
import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const url = `${payloadBaseUrl}/api/chapel-podcasts`

  try {
    const query = getQuery(event)
    // Ensure normal pagination: default limit 20 if missing or too small
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const page = Math.max(1, Number(query.page) || 1)
    const response = await $fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      query: {
        ...query,
        limit: String(limit),
        page: String(page)
      }
    })
    return response
  } catch (error: any) {
    console.error('Chapel podcasts API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch chapel episodes',
      data: error.data
    })
  }
})
