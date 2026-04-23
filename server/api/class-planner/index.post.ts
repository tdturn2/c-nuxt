import { createError, defineEventHandler, readBody } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

type SavePlannerBody = {
  sectionKey?: string
  studentNote?: string | null
}

export default defineEventHandler(async (event) => {
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

  const body = (await readBody(event).catch(() => ({}))) as SavePlannerBody
  const sectionKey = String(body.sectionKey || '').trim().toUpperCase()
  if (!sectionKey) {
    throw createError({ statusCode: 400, statusMessage: 'sectionKey is required' })
  }

  try {
    const headers = getPayloadProxyHeaders(event, auth)

    const offeringLookup = await $fetch<{ docs?: Array<{ id: number; term?: string | null }> }>(
      `${payloadBaseUrl}/api/course-offerings`,
      {
        headers,
        query: {
          'where[fullClassId][equals]': sectionKey,
          depth: 0,
          limit: 1,
        },
      },
    )

    const offering = Array.isArray(offeringLookup?.docs) ? offeringLookup.docs[0] : null
    if (!offering?.id) {
      throw createError({ statusCode: 404, statusMessage: `Course offering not found for ${sectionKey}` })
    }

    return await $fetch(`${payloadBaseUrl}/api/student-course-records/planner`, {
      method: 'POST',
      headers,
      body: {
        email,
        offeringId: offering.id,
        term: offering.term ?? undefined,
        substitutionNotes: body.studentNote ?? null,
      },
    })
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('Class planner POST error:', err)
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to save class planner item',
      data: err?.data,
    })
  }
})
