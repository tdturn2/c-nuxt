// GET minimal course list for dropdowns. Fallback to /api/courses if custom /list endpoint is unavailable.
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  if (!payloadBaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing Payload base URL',
    })
  }

  try {
    const response = await $fetch<any>(`${payloadBaseUrl}/api/courses/list`)
    return response
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.statusCode === 405) {
      try {
        const response = await $fetch<any>(`${payloadBaseUrl}/api/courses`, {
          query: { limit: 2000, sort: 'code', depth: 0 },
        })
        const docs = Array.isArray(response?.docs)
          ? response.docs.map((c: any) => ({
            id: Number(c?.id),
            code: c?.code || '',
            title: c?.title || '',
            credits: c?.credits ?? null,
          }))
          : []
        return { docs, totalDocs: docs.length }
      } catch (fallbackErr: any) {
        console.error('Courses list fallback API error:', fallbackErr)
        if (fallbackErr.statusCode) throw fallbackErr
        throw createError({
          statusCode: fallbackErr.statusCode || 500,
          statusMessage: fallbackErr.statusMessage || 'Failed to load courses list',
          data: fallbackErr.data,
        })
      }
    }

    console.error('Courses list API error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load courses list',
      data: err.data,
    })
  }
})
