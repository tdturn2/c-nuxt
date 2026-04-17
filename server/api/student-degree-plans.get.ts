// GET current user's student degree plans from PayloadCMS.
// SSO: we pass email to Payload my-plans. Payload also supports session (no email) when caller has connect-user cookie.
import { defineEventHandler, createError } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../utils/payloadAuth'

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

  if (!payloadBaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing Payload base URL',
    })
  }

  try {
    const response = await $fetch<any>(`${payloadBaseUrl}/api/student-degree-plans/my-plans`, {
      headers: getPayloadProxyHeaders(event, auth),
      query: { email },
    })

    const plans = normalizePlans(response)
    return { plans, plan: plans[0] ?? null }
  } catch (err: any) {
    console.error('Student degree plans API error:', err)
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 500,
      statusMessage: err.statusMessage || 'Failed to load student degree plans',
      data: err.data,
    })
  }
})
