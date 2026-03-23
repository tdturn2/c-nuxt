// GET current user's student degree plans from PayloadCMS.
// SSO: we pass email to Payload my-plans. Payload also supports session (no email) when caller has connect-user cookie.
import { defineEventHandler, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = process.env.PAYLOAD_BASE_URL || 'http://localhost:3002'

  try {
    // SSO: no Payload cookie, so pass email. Payload my-plans returns plans for that user.
    const response = await $fetch<any>(`${payloadBaseUrl}/api/student-degree-plans/my-plans`, {
      headers: { 'Content-Type': 'application/json' },
      query: { email },
    })

    // Normalize: Payload may return { docs: [...] }, { plan }, { data }, or array
    let plan: any = null
    if (response != null) {
      if (Array.isArray(response?.docs)) plan = response.docs[0] ?? null
      else if (response?.plan != null) plan = response.plan
      else if (response?.data != null) plan = Array.isArray(response.data) ? response.data[0] : response.data
      else if (Array.isArray(response)) plan = response[0] ?? null
      else if (typeof response === 'object' && !Array.isArray(response)) plan = response
    }

    return { plan }
  } catch (err: any) {
    console.error('Student degree plans API error:', err)
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load student degree plans',
      data: err.data,
    })
  }
})

