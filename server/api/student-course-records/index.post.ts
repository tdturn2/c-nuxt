// Create a new student course record in PayloadCMS.
// Used by the Degree Map editor when a plan item has no existing record yet.
import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../utils/getUserIdFromEmail'

export default defineEventHandler(async (event) => {
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
    courseId?: number
    term?: string | null
    hoursEarned?: number | null
    hoursType?: string | null
    substitutionNotes?: string | null
    status?: string | null
  }

  if (!body.courseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'courseId is required to create a student course record',
    })
  }

  const userId = await getUserIdFromEmail(email, payloadBaseUrl)

  const createData: Record<string, unknown> = {
    user: userId,
    course: body.courseId,
  }

  if (body.term !== undefined) createData.term = body.term
  if (body.hoursEarned !== undefined) createData.hoursEarned = body.hoursEarned
  if (body.hoursType !== undefined) createData.hoursType = body.hoursType
  if (body.substitutionNotes !== undefined) createData.substitutionNotes = body.substitutionNotes
  if (body.status !== undefined) createData.status = body.status

  const headers = getPayloadProxyHeaders(event, auth)

  try {
    const created = await $fetch<any>(`${payloadBaseUrl}/api/student-course-records`, {
      method: 'POST',
      headers,
      body: createData,
    })
    return created
  } catch (err: any) {
    console.error('Student course record POST error:', err)
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to create course record',
      data: err.data,
    })
  }
})

