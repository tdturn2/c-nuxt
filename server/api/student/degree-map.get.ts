// Composite endpoint for the Degree Map page.
// Returns the student's degree plan + course records from Payload.
import { defineEventHandler, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../utils/getUserIdFromEmail'

export default defineEventHandler(async (event) => {
  const { email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

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

    // Normalize plan: Payload may return { docs: [...] }, { plan }, { data }, array, or single object
    let plan: any = null
    if (planRes != null) {
      if (Array.isArray(planRes?.docs)) plan = planRes.docs[0] ?? null
      else if (planRes?.plan != null) plan = planRes.plan
      else if (planRes?.data != null) plan = Array.isArray(planRes.data) ? planRes.data[0] : planRes.data
      else if (Array.isArray(planRes)) plan = planRes[0] ?? null
      else if (typeof planRes === 'object') plan = planRes
    }

    // Normalize course records: prefer docs[], then data[], then array
    let courseRecords: any[] = []
    if (Array.isArray(recordsRes?.docs)) courseRecords = recordsRes.docs
    else if (Array.isArray(recordsRes?.data)) courseRecords = recordsRes.data
    else if (Array.isArray(recordsRes)) courseRecords = recordsRes

    return { plan, courseRecords }
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

