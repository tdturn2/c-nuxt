// Create student degree plan in Payload.
//
// 1) If NUXT_RUNTIME payloadStudentDegreePlanSsoPath (PAYLOAD_STUDENT_DEGREE_PLAN_SSO_PATH) is set:
//    POST /api/<path> with { email, degree, status, startDate, expectedGraduation, specialization? }
//    Implement that route in Payload (verify email, then create with overrideAccess if needed).
//
// 2) Else REST POST /api/student-degree-plans with { user, degree, ... } using sync cookies / Bearer.
//
// 3) If REST returns 403, retry with PAYLOAD_SERVER_BEARER (JWT for a Payload user allowed to create).
//    Connect still sets user from SSO email only (no client spoofing).
import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../utils/getUserIdFromEmail'

function defaultStartDateIso() {
  const y = new Date().getUTCFullYear()
  return new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)).toISOString()
}

function defaultExpectedGraduationIso() {
  const y = new Date().getUTCFullYear()
  return new Date(Date.UTC(y + 2, 4, 1, 0, 0, 0, 0)).toISOString()
}

function isForbidden(err: any) {
  return err?.statusCode === 403 || err?.response?.status === 403
}

function normalizeSsoPath(raw: string) {
  let p = raw.trim().replace(/^\/+/, '')
  if (p.startsWith('api/')) p = p.slice(4)
  return p.replace(/^\/+/, '')
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

  const raw = await readBody(event).catch(() => ({})) as {
    degreeId?: unknown
    specializationId?: unknown
    status?: unknown
    startDate?: unknown
    expectedGraduation?: unknown
  }

  const degree = Number(raw.degreeId)
  if (!Number.isFinite(degree) || degree <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'degreeId is required',
    })
  }

  const spec = Number(raw.specializationId)
  const hasSpec = Number.isFinite(spec) && spec > 0

  const status =
    typeof raw.status === 'string' && raw.status.trim() ? raw.status.trim() : 'active'
  const startDate =
    typeof raw.startDate === 'string' && raw.startDate.trim()
      ? raw.startDate.trim()
      : defaultStartDateIso()
  const expectedGraduation =
    typeof raw.expectedGraduation === 'string' && raw.expectedGraduation.trim()
      ? raw.expectedGraduation.trim()
      : defaultExpectedGraduationIso()

  const ssoPathRaw = (config.payloadStudentDegreePlanSsoPath as string | undefined) || ''
  const ssoPath = normalizeSsoPath(ssoPathRaw)
  if (ssoPath) {
    const ssoBody: Record<string, unknown> = {
      email,
      degree,
      status,
      startDate,
      expectedGraduation,
    }
    if (hasSpec) ssoBody.specialization = spec

    try {
      return await $fetch<any>(`${payloadBaseUrl}/api/${ssoPath}`, {
        method: 'POST',
        headers: getPayloadProxyHeaders(event, auth),
        body: ssoBody,
      })
    } catch (err: any) {
      console.error('Student degree plan SSO create error:', err)
      if (err.statusCode) {
        throw err
      }
      throw createError({
        statusCode: err?.statusCode || err?.response?.status || 500,
        statusMessage: err.statusMessage || 'Failed to create degree map',
        data: err.data,
      })
    }
  }

  const userId = await getUserIdFromEmail(email, payloadBaseUrl)

  const createData: Record<string, unknown> = {
    user: userId,
    degree,
    status,
    startDate,
    expectedGraduation,
  }
  if (hasSpec) {
    createData.specialization = spec
  }

  const proxyHeaders = getPayloadProxyHeaders(event, auth)
  const serverBearer = (config.payloadServerBearer as string | undefined)?.trim() || ''

  try {
    return await $fetch<any>(`${payloadBaseUrl}/api/student-degree-plans`, {
      method: 'POST',
      headers: proxyHeaders,
      body: createData,
    })
  } catch (err: any) {
    if (serverBearer && isForbidden(err)) {
      try {
        return await $fetch<any>(`${payloadBaseUrl}/api/student-degree-plans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serverBearer}`,
          },
          body: createData,
        })
      } catch (err2: any) {
        console.error('Student degree plan create (server bearer) error:', err2)
        if (err2.statusCode) {
          throw err2
        }
        throw createError({
          statusCode: err2?.statusCode || err2?.response?.status || 500,
          statusMessage: err2.statusMessage || 'Failed to create degree map',
          data: err2.data,
        })
      }
    }

    console.error('Student degree plan create error:', err)
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 500,
      statusMessage: err.statusMessage || 'Failed to create degree map',
      data: err.data,
    })
  }
})
