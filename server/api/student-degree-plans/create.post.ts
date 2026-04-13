// Create a student degree plan in Payload (SSO: server sets email from session).
// Expects Payload custom route POST /api/student-degree-plans/create with body { email, degree }.
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
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing Payload base URL',
    })
  }

  const raw = await readBody(event).catch(() => ({})) as { degreeId?: unknown }
  const n = Number(raw.degreeId)
  if (!Number.isFinite(n) || n <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'degreeId is required',
    })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    return await $fetch<any>(`${payloadBaseUrl}/api/student-degree-plans/create`, {
      method: 'POST',
      headers,
      body: {
        email,
        degree: n,
      },
    })
  } catch (err: any) {
    console.error('Student degree plan create error:', err)
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 500,
      statusMessage: err.statusMessage || 'Failed to create degree map',
      data: err.data,
    })
  }
})
