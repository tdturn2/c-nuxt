// PATCH a student course record (term, hoursEarned, hoursType, substitutionNotes, status).
// Payload enforces ownership; we forward auth (token or identify by email).
import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Record ID is required',
    })
  }

  const auth = await authenticateWithPayloadCMS(event)
  const { email } = auth
  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  const body = await readBody(event).catch(() => ({})) as {
    term?: string | null
    hoursEarned?: number | null
    hoursType?: string | null
    substitutionNotes?: string | null
    status?: string | null
  }

  const updateData: Record<string, unknown> = {}
  if (body.term !== undefined) updateData.term = body.term
  if (body.hoursEarned !== undefined) updateData.hoursEarned = body.hoursEarned
  if (body.hoursType !== undefined) updateData.hoursType = body.hoursType
  if (body.substitutionNotes !== undefined) updateData.substitutionNotes = body.substitutionNotes
  if (body.status !== undefined) updateData.status = body.status

  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No fields to update',
    })
  }

  const headers = getPayloadProxyHeaders(event, auth)

  try {
    const response = await $fetch<any>(`${payloadBaseUrl}/api/student-course-records/${id}`, {
      method: 'PATCH',
      headers,
      body: updateData,
    })
    return response
  } catch (err: any) {
    console.error('Student course record PATCH error:', err)
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to update course record',
      data: err.data,
    })
  }
})
