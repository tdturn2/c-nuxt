import { createError, defineEventHandler, readBody } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../utils/getUserIdFromEmail'

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
    const userId = await getUserIdFromEmail(email, payloadBaseUrl)
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

    const existing = await $fetch<{ docs?: Array<{ id: number }> }>(`${payloadBaseUrl}/api/student-course-records`, {
      headers,
      query: {
        'where[and][0][user][equals]': String(userId),
        'where[and][1][offering][equals]': String(offering.id),
        'where[and][2][status][equals]': 'planned',
        'where[and][3][plan][exists]': 'false',
        'where[and][4][degreeSectionItem][exists]': 'false',
        depth: 0,
        limit: 1,
      },
    })

    const existingId = Array.isArray(existing?.docs) ? existing.docs[0]?.id : undefined
    if (existingId) {
      return await $fetch(`${payloadBaseUrl}/api/student-course-records/${existingId}`, {
        method: 'PATCH',
        headers,
        body: {
          substitutionNotes: body.studentNote ?? undefined,
          term: offering.term ?? undefined,
          status: 'planned',
        },
      })
    }

    return await $fetch(`${payloadBaseUrl}/api/student-course-records`, {
      method: 'POST',
      headers,
      body: {
        user: userId,
        offering: offering.id,
        term: offering.term ?? undefined,
        status: 'planned',
        substitutionNotes: body.studentNote ?? undefined,
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
