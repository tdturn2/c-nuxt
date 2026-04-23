import { createError, defineEventHandler } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../utils/getUserIdFromEmail'

type PlannerDoc = {
  id: number
  term?: string | null
  substitutionNotes?: string | null
  offering?: {
    fullClassId?: string
    term?: string
    shortName?: string
    shortDescription?: string
    section?: string
    credits?: number | null
    instructor?: string | null
    deliveryMethod?: string | null
    location?: string | null
    classStatus?: string | null
  } | null
  updatedAt?: string
}

function termLabelFromCode(code: string | null | undefined): string {
  if (!code) return 'Unknown term'
  const upper = code.toUpperCase()
  const prefix = upper.slice(0, 2)
  const yearToken = upper.slice(2)
  const yearNum = Number(yearToken)
  const year = Number.isFinite(yearNum) ? 2000 + yearNum : null
  const season = prefix === 'SP' ? 'Spring' : prefix === 'SU' ? 'Summer' : prefix === 'FA' ? 'Fall' : upper
  return year ? `${season} ${year}` : season
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

  try {
    const userId = await getUserIdFromEmail(email, payloadBaseUrl)
    const response = await $fetch<{ docs?: PlannerDoc[] }>(`${payloadBaseUrl}/api/student-course-records/planner`, {
      headers: getPayloadProxyHeaders(event, auth),
      query: {
        email,
        depth: 2,
        limit: 500,
        sort: '-updatedAt',
      },
    })

    const docs = Array.isArray(response?.docs) ? response.docs : []
    const items = docs
      .map((doc) => {
        const offering = doc.offering || null
        if (!offering?.fullClassId) return null
        const termCode = offering.term || doc.term || null
        return {
          id: doc.id,
          sectionKey: offering.fullClassId,
          termCode,
          termLabel: termLabelFromCode(termCode),
          courseCode: offering.shortName || '',
          courseTitle: offering.shortDescription || '',
          section: offering.section || '',
          credits: offering.credits ?? null,
          instructor: offering.instructor || '',
          deliveryMethod: offering.deliveryMethod || '',
          location: offering.location || '',
          statusAtSave: offering.classStatus || '',
          studentNote: doc.substitutionNotes || '',
          updatedAt: doc.updatedAt || null,
        }
      })
      .filter(Boolean)

    return { items }
  } catch (err: any) {
    console.error('Class planner GET error:', err)
    if (err?.statusCode) throw err
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to load class planner',
      data: err?.data,
    })
  }
})
