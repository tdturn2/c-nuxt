// GET current user's survey responses; auth required, proxies to Payload with Connect auth
import { defineEventHandler, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - must be signed in to view your survey responses'
    })
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Same SSO pattern as connect-users/profile: pass email so Payload can identify user without a token
  const meUrl = `${payloadBaseUrl}/api/user-survey-responses/me?email=${encodeURIComponent(email)}`

  try {
    const response = await $fetch<{ id: number; answers: Record<string, unknown>; updatedAt: string } | null>(
      meUrl,
      {
        method: 'GET',
        headers
      }
    )
    // 204 or empty → return { answers: {} }
    if (response == null || (typeof response === 'object' && !('answers' in response))) {
      return { id: 0, answers: {}, updatedAt: '' }
    }
    return response
  } catch (error: any) {
    if (error.statusCode === 204) {
      return { id: 0, answers: {}, updatedAt: '' }
    }
    console.error('Survey me API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to load your survey responses',
      data: error.data
    })
  }
})
