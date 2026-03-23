// Proxy to Payload CMS connect-pages collection. Forward query params (e.g. where[slug][equals], limit, depth).
import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = process.env.PAYLOAD_BASE_URL
  const query = getQuery(event)
  const searchParams = new URLSearchParams(query as Record<string, string>)
  const url = `${payloadBaseUrl}/api/connect-pages?${searchParams.toString()}`
  try {
    const data = await $fetch(url)
    return data
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 502,
      statusMessage: err.statusMessage || 'Failed to fetch connect-pages',
    })
  }
})
