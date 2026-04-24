import { createError, defineEventHandler, readBody } from 'h3'
import { plannerItemFromDocAndOffering, type PlannerOfferingSlice } from '@shared/classPlannerItem'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

type SavePlannerBody = {
  sectionKey?: string
  /** Class Search term (e.g. FA26). Required for correct offering when the same section id exists in multiple terms. */
  termCode?: string | null
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
  const termCode = String(body.termCode || '').trim().toUpperCase()

  try {
    const headers = getPayloadProxyHeaders(event, auth)

    const offeringQuery: Record<string, string> = {
      depth: '0',
      limit: '1',
    }
    if (termCode) {
      offeringQuery['where[and][0][fullClassId][equals]'] = sectionKey
      offeringQuery['where[and][1][term][equals]'] = termCode
    } else {
      offeringQuery['where[fullClassId][equals]'] = sectionKey
    }

    const offeringLookup = await $fetch<{ docs?: Array<{ id: number; term?: string | null }> }>(
      `${payloadBaseUrl}/api/course-offerings`,
      {
        headers,
        query: offeringQuery,
      },
    )

    let offering = Array.isArray(offeringLookup?.docs) ? offeringLookup.docs[0] : null

    // DB may not have a per-term row yet (sync backfill). Fall back to any row with this section id so save still works;
    // we still persist the Class Search term on the student-course-record below.
    if (!offering?.id && termCode) {
      const fallback = await $fetch<{ docs?: Array<{ id: number; term?: string | null }> }>(
        `${payloadBaseUrl}/api/course-offerings`,
        {
          headers,
          query: {
            'where[fullClassId][equals]': sectionKey,
            depth: '0',
            limit: '1',
          },
        },
      )
      offering = Array.isArray(fallback?.docs) ? fallback.docs[0] : null
    }

    if (!offering?.id) {
      const hint = termCode ? ` for ${sectionKey} in term ${termCode}` : ` for ${sectionKey}`
      throw createError({ statusCode: 404, statusMessage: `Course offering not found${hint}` })
    }

    const plannedTerm =
      termCode ||
      (offering.term != null && String(offering.term).trim() !== ''
        ? String(offering.term).trim().toUpperCase()
        : undefined)

    const saved = await $fetch<{
      id: number
      term?: string | null
      substitutionNotes?: string | null
      updatedAt?: string | null
      offering?: PlannerOfferingSlice | number | null
    }>(`${payloadBaseUrl}/api/student-course-records/planner`, {
      method: 'POST',
      headers,
      body: {
        email,
        offeringId: offering.id,
        term: plannedTerm,
        substitutionNotes: body.studentNote ?? null,
      },
    })

    let resolvedOffering: PlannerOfferingSlice | null =
      saved?.offering && typeof saved.offering === 'object' ? (saved.offering as PlannerOfferingSlice) : null

    if (!resolvedOffering?.fullClassId && typeof saved?.offering === 'number') {
      const oid = saved.offering
      const one = await $fetch<{ docs?: PlannerOfferingSlice[] }>(`${payloadBaseUrl}/api/course-offerings`, {
        headers,
        query: {
          'where[id][equals]': String(oid),
          depth: '0',
          limit: '1',
        },
      })
      resolvedOffering = Array.isArray(one?.docs) ? (one.docs[0] ?? null) : null
    }

    const item = plannerItemFromDocAndOffering(saved, resolvedOffering)
    if (!item) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Saved planner row but could not build response item',
      })
    }

    return { item }
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
