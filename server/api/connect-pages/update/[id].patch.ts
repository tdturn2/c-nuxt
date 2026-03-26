import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { authenticateWithPayloadCMS } from '../../../utils/payloadAuth'

type UpdateBody = {
  email?: string
  title?: string
  slug?: string
  navCategory?: string | null
  parent?: unknown
  order?: number
  section?: unknown
  content?: any
}

function normalizeRelId(value: any): number | string | null {
  if (value == null) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object') {
    if (typeof value.id === 'number' || typeof value.id === 'string') return value.id
    if (typeof value.value === 'number' || typeof value.value === 'string') return value.value
  }
  return null
}

function toIdList(value: any): Array<number | string> {
  if (!Array.isArray(value)) return []
  return value.map(normalizeRelId).filter((v): v is number | string => v != null)
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Page ID is required' })

  const { token, email: sessionEmail } = await authenticateWithPayloadCMS(event)
  if (!sessionEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - must be signed in' })
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

  const body = (await readBody(event).catch(() => ({}))) as UpdateBody
  if (body.email && body.email !== sessionEmail) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden - email mismatch' })
  }

  // Load connect-user to support role-based admin (connect-users.roles includes 'admin').
  const connectUserRes: any = await $fetch(
    `${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(sessionEmail)}&limit=1&depth=2`
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
  const isAdminSession = isAdminTokenSession || isConnectAdmin

  // Load existing page (need its current section for permission checks).
  const existing: any = await $fetch(`${payloadBaseUrl}/api/connect-pages/${encodeURIComponent(id)}?depth=2`).catch((err: any) => {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to load page',
      data: err?.data,
    })
  })

  const existingSectionId =
    normalizeRelId(existing?.section) ??
    normalizeRelId(existing?.fields?.section) ??
    normalizeRelId(existing?.sectionId) ??
    null

  if (!isAdminSession) {
    // Non-admin rules:
    // - can update only if page's existing section is in their editableSections
    // - cannot change section via this endpoint
    if (!connectUser) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    // Note: `[]` is truthy, so don't use `||` here.
    const editableSectionIds = [
      ...toIdList(connectUser?.editableSections),
      ...toIdList(connectUser?.fields?.editableSections),
    ]

    if (!existingSectionId || !editableSectionIds.includes(existingSectionId)) {
      console.warn('[connect-pages/update] Forbidden - section mismatch', {
        pageId: id,
        email: sessionEmail,
        existingSectionId,
        editableSectionIds,
      })
      throw createError({ statusCode: 403, statusMessage: 'Forbidden - not allowed to edit this section' })
    }

    const requestedSectionId = normalizeRelId(body.section)
    if (requestedSectionId && requestedSectionId !== existingSectionId) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden - cannot change section' })
    }
  }

  // Build payload update body. For SSO updates, always include email.
  const payloadUpdate: Record<string, unknown> = { email: sessionEmail }
  if (typeof body.title === 'string') payloadUpdate.title = body.title
  if (typeof body.slug === 'string') payloadUpdate.slug = body.slug
  if (body.navCategory !== undefined) payloadUpdate.navCategory = body.navCategory
  if (body.parent !== undefined) payloadUpdate.parent = body.parent
  if (body.order !== undefined) payloadUpdate.order = body.order
  if (body.section !== undefined && isAdminSession) payloadUpdate.section = body.section
  if (body.content !== undefined) payloadUpdate.content = body.content

  // Important: For non-admin SSO updates, do NOT forward a non-admin token.
  // Payload custom SSO endpoints typically authorize based on the `email` in body.
  // Sending a non-admin Bearer token can cause Payload to reject the request even if the SSO email is allowed.
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  // Admin token can PATCH collection directly; otherwise use Payload custom endpoint (email-based auth).
  const url = isAdminTokenSession
    ? `${payloadBaseUrl}/api/connect-pages/${encodeURIComponent(id)}`
    : `${payloadBaseUrl}/api/connect-pages/update/${encodeURIComponent(id)}`

  if (isAdminTokenSession && token) headers.Authorization = `Bearer ${token}`

  try {
    return await $fetch(url, {
      method: 'PATCH',
      headers,
      body: payloadUpdate,
    })
  } catch (err: any) {
    if (err?.statusCode === 401 || err?.statusCode === 403) throw err
    console.error('connect-pages sso update error:', err)
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to update page',
      data: err?.data,
    })
  }
})

