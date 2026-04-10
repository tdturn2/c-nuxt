import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../utils/payloadAuth'

function toProxyError(err: any, fallbackMessage: string) {
  const statusCode =
    err?.statusCode ??
    err?.response?.status ??
    err?.response?.statusCode ??
    err?.status ??
    500

  const data = err?.data ?? err?.response?._data ?? err?.response?.data
  const statusMessage =
    data?.message ||
    err?.statusMessage ||
    err?.message ||
    fallbackMessage

  return createError({ statusCode, statusMessage, data })
}

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
    throw toProxyError(err, 'Failed to load connect-user')
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

  const rawTitle = typeof body?.title === 'string' ? body.title.trim() : ''
  const rawSlug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  if (!rawTitle) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  if (!rawSlug) throw createError({ statusCode: 400, statusMessage: 'Slug is required' })

  // For SSO-style create, always include email so Payload can authorize.
  const payloadBody =
    typeof body === 'object' && body != null
      ? { ...body, title: rawTitle, slug: rawSlug, email: sessionEmail }
      : { title: rawTitle, slug: rawSlug, email: sessionEmail }

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
    throw toProxyError(err, 'Failed to create page')
  }
})

