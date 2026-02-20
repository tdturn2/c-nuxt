// GET survey questions (public); proxies to Payload user-survey-responses/questions
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    const response = await $fetch<{ docs: Array<{ id: number; slug: string; label: string; type: string; options: Array<{ label: string; value: string }> }> }>(
      `${payloadBaseUrl}/api/user-survey-responses/questions`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    )
    return response
  } catch (error: any) {
    console.error('Survey questions API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to load survey questions',
      data: error.data
    })
  }
})
