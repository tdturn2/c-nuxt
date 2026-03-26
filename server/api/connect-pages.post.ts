import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { token, email: sessionEmail } = await authenticateWithPayloadCMS(event)
  if (!sessionEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  // Detect admin-style Payload session: token that can access /api/users/me.
  let isAdminTokenSession = false
  if (token) {
    try {
      await $fetch(`${payloadBaseUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      isAdminTokenSession = true
    } catch {
      isAdminTokenSession = false
    }
  }

  const connectUserRes: any = await $fetch(
    `${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(sessionEmail)}&limit=1&depth=0`
  ).catch((err: any) => {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to load connect-user',
      data: err?.data,
    })
  })

  const connectUser = Array.isArray(connectUserRes?.docs) ? connectUserRes.docs[0] : null
  const connectUserRoles: string[] = [
    ...(Array.isArray(connectUser?.roles) ? connectUser.roles : []),
    ...(Array.isArray(connectUser?.fields?.roles) ? connectUser.fields.roles : []),
  ].filter((r): r is string => typeof r === 'string' && r.length > 0)

  const isConnectAdmin = connectUserRoles.includes('admin')

  const body = (await readBody(event).catch(() => ({}))) as any
  if (body?.email && body.email !== sessionEmail) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden - email mismatch' })
  }

  // For SSO-style create, always include email so Payload can authorize.
  const payloadBody = typeof body === 'object' && body != null ? { ...body, email: sessionEmail } : { email: sessionEmail }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (isAdminTokenSession && token) headers.Authorization = `Bearer ${token}`

  try {
    // Admin token can create directly. Otherwise use Payload custom create endpoint (email-based auth).
    const url = isAdminTokenSession
      ? `${payloadBaseUrl}/api/connect-pages`
      : `${payloadBaseUrl}/api/connect-pages/create`

    return await $fetch(url, {
      method: 'POST',
      headers,
      body: payloadBody,
    })
  } catch (err: any) {
    if ((err?.statusCode === 401 || err?.statusCode === 403) && !isAdminTokenSession && isConnectAdmin) {
      console.warn('[connect-pages/create] Forbidden for connect-user admin', {
        email: sessionEmail,
        roles: connectUserRoles,
      })
    }
    console.error('connect-pages create error:', err)
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to create page',
      data: err?.data,
    })
  }
})

