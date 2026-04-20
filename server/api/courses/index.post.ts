// POST create course in Payload catalog. Auth: SSO staff/faculty session.
import { createError, defineEventHandler, readBody } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const auth = await authenticateWithPayloadCMS(event)
  const { email } = auth
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = (await readBody(event).catch(() => ({}))) as {
    code?: string
    title?: string
    description?: string
    credits?: number | null
  }

  const code = String(body.code || '').trim().toUpperCase()
  const title = String(body.title || '').trim()
  const credits =
    body.credits == null || body.credits === ''
      ? null
      : Number.isFinite(Number(body.credits))
        ? Number(body.credits)
        : null

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Course code is required' })
  }
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Course title is required' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing Payload base URL' })
  }

  try {
    return await $fetch<any>(`${payloadBaseUrl}/api/courses`, {
      method: 'POST',
      headers: getPayloadProxyHeaders(event, auth),
      body: {
        code,
        title,
        description: body.description || undefined,
        credits: credits ?? undefined,
      },
    })
  } catch (err: any) {
    if (err?.statusCode === 400 && String(err?.statusMessage || '').toLowerCase().includes('code')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'A course with this code already exists'
      })
    }
    if (err.statusCode) throw err
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 500,
      statusMessage: err?.statusMessage || 'Failed to create course',
      data: err?.data,
    })
  }
})
