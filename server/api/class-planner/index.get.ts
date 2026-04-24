import { createError, defineEventHandler } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

type OfferingSlice = {
  id?: number
  fullClassId?: string | null
  term?: string | null
  shortName?: string
  shortDescription?: string
  section?: string
  credits?: number | null
  instructor?: string | null
  deliveryMethod?: string | null
  location?: string | null
  classStatus?: string | null
}

type PlannerDoc = {
  id: number
  term?: string | null
  substitutionNotes?: string | null
  offering?: OfferingSlice | number | null
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

function offeringIdFromRel(rel: PlannerDoc['offering']): number | null {
  if (typeof rel === 'number' && Number.isFinite(rel)) return rel
  if (rel && typeof rel === 'object' && 'id' in rel) {
    const id = Number((rel as OfferingSlice).id)
    return Number.isFinite(id) ? id : null
  }
  return null
}

function offeringObject(rel: PlannerDoc['offering']): OfferingSlice | null {
  if (rel && typeof rel === 'object') return rel as OfferingSlice
  return null
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
    const headers = getPayloadProxyHeaders(event, auth)
    const response = await $fetch<{ docs?: PlannerDoc[] }>(`${payloadBaseUrl}/api/student-course-records/planner`, {
      headers,
      query: {
        email,
        depth: 2,
        limit: 500,
        sort: '-updatedAt',
      },
    })

    const docs = Array.isArray(response?.docs) ? response.docs : []

    const unresolvedOfferingIds = new Set<number>()
    for (const doc of docs) {
      const rel = doc.offering
      const obj = offeringObject(rel)
      if (obj?.fullClassId) continue
      const oid = offeringIdFromRel(rel)
      if (oid != null) unresolvedOfferingIds.add(oid)
    }

    const offeringById = new Map<number, OfferingSlice>()
    if (unresolvedOfferingIds.size > 0) {
      const ids = Array.from(unresolvedOfferingIds)
      const offeringRes = await $fetch<{ docs?: OfferingSlice[] }>(`${payloadBaseUrl}/api/course-offerings`, {
        headers,
        query: {
          'where[id][in]': ids.join(','),
          depth: '0',
          limit: String(Math.max(50, ids.length)),
        },
      })
      const offeringDocs = Array.isArray(offeringRes?.docs) ? offeringRes.docs : []
      for (const o of offeringDocs) {
        const id = Number(o.id)
        if (Number.isFinite(id)) offeringById.set(id, o)
      }
    }

    const items = docs
      .map((doc) => {
        const rel = doc.offering
        let offering: OfferingSlice | null = offeringObject(rel)
        if (!offering?.fullClassId) {
          const oid = offeringIdFromRel(rel)
          if (oid != null) offering = offeringById.get(oid) ?? null
        }
        if (!offering?.fullClassId) return null
        const termCode = offering.term || doc.term || null
        return {
          id: doc.id,
          sectionKey: String(offering.fullClassId || '').trim().toUpperCase(),
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
