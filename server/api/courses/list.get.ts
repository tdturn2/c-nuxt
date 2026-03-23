// GET minimal course list for dropdowns. Payload read is public; we proxy for consistency.
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    const response = await $fetch<any>(`${payloadBaseUrl}/api/courses/list`)
    return response
  } catch (err: any) {
    console.error('Courses list API error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load courses list',
      data: err.data,
    })
  }
})
