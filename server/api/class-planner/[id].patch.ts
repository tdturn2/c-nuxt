import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Planner item id is required' })
  }

  const auth = await authenticateWithPayloadCMS(event)
  const { email } = auth
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing Payload base URL' })
  }

  const body = (await readBody(event).catch(() => ({}))) as { studentNote?: string | null }
  if (body.studentNote === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'studentNote is required' })
  }

  try {
    return await $fetch(`${payloadBaseUrl}/api/student-course-records/${id}`, {
      method: 'PATCH',
      headers: getPayloadProxyHeaders(event, auth),
      body: {
        substitutionNotes: body.studentNote,
      },
    })
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('Class planner PATCH error:', err)
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to update class planner note',
      data: err?.data,
    })
  }
})
