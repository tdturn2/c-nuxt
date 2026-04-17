// Composite endpoint for the Degree Map page.
// Returns the student's degree plan + course records from Payload.
import { defineEventHandler, createError } from 'h3'
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
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  const headers = getPayloadProxyHeaders(event, auth)

  try {
    // Resolve connect-users ID once for course records
    const userId = await getUserIdFromEmail(email, payloadBaseUrl)

    const [planRes, recordsRes] = await Promise.all([
      // Degree plan(s) for this user (Payload my-plans endpoint)
      $fetch<any>(`${payloadBaseUrl}/api/student-degree-plans/my-plans`, {
        headers,
        query: { email },
      }),
      // Student course records for this user
      $fetch<any>(`${payloadBaseUrl}/api/student-course-records`, {
        headers,
        query: {
          'where[user][equals]': String(userId),
          depth: 2,
          limit: 500,
        },
      }),
    ])

    function normalizePlans(response: unknown): any[] {
      if (response == null) return []
      const r = response as Record<string, unknown>
      if (Array.isArray(r.docs)) return r.docs.filter(Boolean) as any[]
      if (Array.isArray(r.plans)) return r.plans.filter(Boolean) as any[]
      if (r.plan != null) return [r.plan]
      if (Array.isArray(r.data)) return r.data.filter(Boolean) as any[]
      if (Array.isArray(response)) return (response as any[]).filter(Boolean)
      if (typeof response === 'object' && response !== null && 'id' in r) return [response]
      return []
    }

    const plans = normalizePlans(planRes)
    const plan = plans[0] ?? null

    // Normalize course records: prefer docs[], then data[], then array
    let courseRecords: any[] = []
    if (Array.isArray(recordsRes?.docs)) courseRecords = recordsRes.docs
    else if (Array.isArray(recordsRes?.data)) courseRecords = recordsRes.data
    else if (Array.isArray(recordsRes)) courseRecords = recordsRes

    return { plans, plan, courseRecords }
  } catch (err: any) {
    console.error('Student degree map API error:', err)
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load degree map',
      data: err.data,
    })
  }
})

