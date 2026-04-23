import { createError, defineEventHandler, getQuery } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

type PlannerCountDoc = {
  user?: number | { id?: number } | null
  offering?: number | { id?: number; fullClassId?: string; term?: string } | null
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

  const query = getQuery(event)
  const term = typeof query.term === 'string' ? query.term.trim().toUpperCase() : ''

  try {
    const whereQuery: Record<string, string> = {
      'where[and][0][status][equals]': 'planned',
      'where[and][1][plan][exists]': 'false',
      'where[and][2][degreeSectionItem][exists]': 'false',
      depth: '1',
      limit: '5000',
    }

    const response = await $fetch<{ docs?: PlannerCountDoc[] }>(`${payloadBaseUrl}/api/student-course-records`, {
      headers: getPayloadProxyHeaders(event, auth),
      query: whereQuery,
    })

    const docs = Array.isArray(response?.docs) ? response.docs : []
    const bySection = new Map<string, Set<number>>()
    const sectionTermByKey = new Map<string, string>()
    const unresolvedOfferingIds = new Set<number>()

    for (const doc of docs) {
      const userIdRaw = doc.user
      const userId =
        typeof userIdRaw === 'number'
          ? userIdRaw
          : userIdRaw && typeof userIdRaw === 'object'
            ? Number(userIdRaw.id)
            : NaN
      if (!Number.isFinite(userId)) continue

      const offeringRel = doc.offering
      if (offeringRel && typeof offeringRel === 'object') {
        const sectionKey = String(offeringRel.fullClassId || '').trim().toUpperCase()
        if (sectionKey) {
          const offeringTerm = String(offeringRel.term || '').trim().toUpperCase()
          if (offeringTerm) sectionTermByKey.set(sectionKey, offeringTerm)
          if (!bySection.has(sectionKey)) bySection.set(sectionKey, new Set<number>())
          bySection.get(sectionKey)!.add(userId)
          continue
        }
        const offeringId = Number(offeringRel.id)
        if (Number.isFinite(offeringId)) {
          unresolvedOfferingIds.add(offeringId)
        }
      } else {
        const offeringId = Number(offeringRel)
        if (Number.isFinite(offeringId)) {
          unresolvedOfferingIds.add(offeringId)
        }
      }
    }

    let offeringIdToSection = new Map<number, string>()
    if (unresolvedOfferingIds.size > 0) {
      const ids = Array.from(unresolvedOfferingIds)
      const offeringRes = await $fetch<{ docs?: Array<{ id: number; fullClassId?: string | null }> }>(
        `${payloadBaseUrl}/api/course-offerings`,
        {
          headers: getPayloadProxyHeaders(event, auth),
          query: {
            'where[id][in]': ids.join(','),
            depth: '0',
            limit: String(Math.max(50, ids.length)),
          },
        },
      )
      const offeringDocs = Array.isArray(offeringRes?.docs) ? offeringRes.docs : []
      offeringIdToSection = new Map(
        offeringDocs
          .map((o) => [Number(o.id), String(o.fullClassId || '').trim().toUpperCase()] as const)
          .filter(([, key]) => Boolean(key)),
      )
      for (const o of offeringDocs) {
        const key = String(o.fullClassId || '').trim().toUpperCase()
        const t = String((o as any).term || '').trim().toUpperCase()
        if (key && t) sectionTermByKey.set(key, t)
      }
    }

    for (const doc of docs) {
      const userIdRaw = doc.user
      const userId =
        typeof userIdRaw === 'number'
          ? userIdRaw
          : userIdRaw && typeof userIdRaw === 'object'
            ? Number(userIdRaw.id)
            : NaN
      if (!Number.isFinite(userId)) continue
      const offeringRel = doc.offering
      const offeringId =
        offeringRel && typeof offeringRel === 'object'
          ? Number(offeringRel.id)
          : Number(offeringRel)
      if (!Number.isFinite(offeringId)) continue
      const sectionKey = offeringIdToSection.get(offeringId)
      if (!sectionKey) continue
      if (!bySection.has(sectionKey)) bySection.set(sectionKey, new Set<number>())
      bySection.get(sectionKey)!.add(userId)
    }

    const counts: Record<string, number> = {}
    for (const [section, users] of bySection.entries()) {
      if (term) {
        const sectionTerm = sectionTermByKey.get(section) || ''
        if (sectionTerm !== term) continue
      }
      counts[section] = users.size
    }

    return { counts }
  } catch (err: any) {
    console.error('Class planner counts API error:', err)
    if (err?.statusCode) throw err
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to load class planner counts',
      data: err?.data,
    })
  }
})
