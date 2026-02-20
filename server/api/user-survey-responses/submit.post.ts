// POST submit survey answers; auth required, proxies to Payload with Connect auth
import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - must be signed in to submit survey responses'
    })
  }

  const body = await readBody(event) as { answers?: Record<string, unknown> }
  const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {}

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Same SSO pattern as connect-users/profile: include email in body so Payload can identify user without a token
  try {
    const response = await $fetch<{ id: number; answers: Record<string, unknown>; updatedAt: string }>(
      `${payloadBaseUrl}/api/user-survey-responses/submit`,
      {
        method: 'POST',
        headers,
        body: { answers, email }
      }
    )
    return response
  } catch (error: any) {
    console.error('Survey submit API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to submit survey responses',
      data: error.data
    })
  }
})
