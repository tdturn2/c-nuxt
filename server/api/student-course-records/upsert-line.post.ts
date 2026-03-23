// Proxy to Payload student-course-records upsert-line endpoint.
// Payload handles auth and ownership; we forward SSO session and body.
import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { token, email } = await authenticateWithPayloadCMS(event)

  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  const body = await readBody(event).catch(() => ({})) as {
    planId?: number
    degreeSectionItemId?: number
    courseId?: number | null
    offeringCode?: string | null
    term?: string | null
    hoursEarned?: number | null
    hoursType?: string | null
    status?: string | null
    grade?: string | null
    substitutionNotes?: string | null
  }

  if (body.planId == null || body.degreeSectionItemId == null) {
    throw createError({
      statusCode: 400,
      statusMessage: 'planId and degreeSectionItemId are required',
    })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const payloadBody = {
    ...body,
    email,
  }

  try {
    const result = await $fetch<any>(`${payloadBaseUrl}/api/student-course-records/upsert-line`, {
      method: 'POST',
      headers,
      body: payloadBody,
    })
    return result
  } catch (err: any) {
    console.error('Student course record upsert-line error:', err)
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to upsert course record',
      data: err.data,
    })
  }
})
