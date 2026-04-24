import { createError, defineEventHandler } from 'h3'
import { plannerItemFromDocAndOffering, type PlannerOfferingSlice } from '@shared/classPlannerItem'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

type PlannerDoc = {
  id: number
  term?: string | null
  substitutionNotes?: string | null
  offering?: PlannerOfferingSlice | number | null
  updatedAt?: string
}

function offeringIdFromRel(rel: PlannerDoc['offering']): number | null {
  if (typeof rel === 'number' && Number.isFinite(rel)) return rel
  if (rel && typeof rel === 'object' && 'id' in rel) {
    const id = Number((rel as PlannerOfferingSlice).id)
    return Number.isFinite(id) ? id : null
  }
  return null
}

function offeringObject(rel: PlannerDoc['offering']): PlannerOfferingSlice | null {
  if (rel && typeof rel === 'object') return rel as PlannerOfferingSlice
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

    const offeringById = new Map<number, PlannerOfferingSlice>()
    if (unresolvedOfferingIds.size > 0) {
      const ids = Array.from(unresolvedOfferingIds)
      const offeringRes = await $fetch<{ docs?: PlannerOfferingSlice[] }>(`${payloadBaseUrl}/api/course-offerings`, {
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
        let offering: PlannerOfferingSlice | null = offeringObject(rel)
        if (!offering?.fullClassId) {
          const oid = offeringIdFromRel(rel)
          if (oid != null) offering = offeringById.get(oid) ?? null
        }
        return plannerItemFromDocAndOffering(doc, offering)
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
