// Proxy list (find) to Payload chapel-podcasts
import { defineEventHandler, getQuery, createError } from 'h3'

/** Chapel list pulls speaker → connect-user graphs; depth≥3 often blows serverless memory/time limits on prod. */
const MAX_LIST_DEPTH = 2

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = String(config.public.payloadBaseUrl || 'http://localhost:3002').replace(/\/+$/, '')
  const payloadServerBearer = String(config.payloadServerBearer || '').trim()
  const url = `${payloadBaseUrl}/api/chapel-podcasts`

  try {
    const rawQuery = getQuery(event)
    const query = { ...rawQuery }
    // Ensure normal pagination: default limit 20 if missing or too small
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const page = Math.max(1, Number(query.page) || 1)
    const depthRaw = Number(query.depth)
    const depth = Number.isFinite(depthRaw) ? Math.min(Math.max(depthRaw, 0), MAX_LIST_DEPTH) : MAX_LIST_DEPTH

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (payloadServerBearer) headers.Authorization = `Bearer ${payloadServerBearer}`

    const response = await $fetch(url, {
      headers,
      query: {
        ...query,
        limit: String(limit),
        page: String(page),
        depth: String(depth),
      },
    })
    return response
  } catch (error: any) {
    const upstream =
      error?.data?.errors?.[0]?.message ||
      error?.data?.message ||
      error?.message ||
      ''
    console.error('Chapel podcasts API Error:', upstream || error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch chapel episodes',
      data: error.data,
    })
  }
})
