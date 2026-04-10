import { readBody, createError, getRouterParam, type H3Event } from 'h3'
import { authenticateWithPayloadCMS } from './payloadAuth'

type UpdateBody = {
  email?: string
  title?: string
  slug?: string
  navCategory?: string | null
  parent?: unknown
  order?: number
  section?: unknown
  content?: any
  contactsHeading?: string | null
  contacts?: any
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

/** e.g. http://localhost:3002/api → http://localhost:3002 */
function payloadOrigin(raw: string): string {
  let b = raw.trim().replace(/\/+$/, '')
  if (b.endsWith('/api')) b = b.slice(0, -4).replace(/\/+$/, '')
  return b
}

function upstreamStatus(err: any): number {
  return err?.statusCode ?? err?.response?.status ?? err?.status ?? 0
}

function mapUpstreamError(err: any) {
  return createError({
    statusCode: upstreamStatus(err) || 502,
    statusMessage: err?.statusMessage || err?.message || 'Failed to update page',
    data: err?.data ?? err?.response?._data,
  })
}

/**
 * Proxies dashboard “save page” to Payload. Tries, in order:
 * 1) POST /api/{payloadConnectPagesUpdatePath}/:id (SSO body includes `email`)
 * 2) PATCH same URL (some Payload custom routes only register PATCH)
 * 3) PATCH /api/connect-pages/:id with Bearer from connect-users/sync (native REST)
 */
export async function handleConnectPagesPayloadUpdate(event: H3Event) {
  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const origin = payloadOrigin(payloadBaseUrl)
  const updatePath = String((config as { payloadConnectPagesUpdatePath?: string }).payloadConnectPagesUpdatePath || 'connect-pages/update')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Page ID is required' })

  const { token, email: sessionEmail } = await authenticateWithPayloadCMS(event)
  if (!sessionEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - must be signed in' })
  }

  let isPayloadAdminJwt = false
  if (token) {
    try {
      await $fetch(`${origin}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      isPayloadAdminJwt = true
    } catch {
      isPayloadAdminJwt = false
    }
  }

  const body = (await readBody(event).catch(() => ({}))) as UpdateBody
  if (body.email && body.email !== sessionEmail) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden - email mismatch' })
  }

  const connectUserRes: any = await $fetch(
    `${origin}/api/connect-users?where[email][equals]=${encodeURIComponent(sessionEmail)}&limit=1&depth=2`
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
  const isAdminSession = isPayloadAdminJwt || isConnectAdmin

  const existing: any = await $fetch(`${origin}/api/connect-pages/${encodeURIComponent(id)}?depth=2`).catch((err: any) => {
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
    if (!connectUser) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const editableSectionIds = [
      ...toIdList(connectUser?.editableSections),
      ...toIdList(connectUser?.fields?.editableSections),
    ]

    if (!existingSectionId || !editableSectionIds.includes(existingSectionId)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden - not allowed to edit this section' })
    }

    const requestedSectionId = normalizeRelId(body.section)
    if (requestedSectionId && requestedSectionId !== existingSectionId) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden - cannot change section' })
    }
  }

  const payloadUpdate: Record<string, unknown> = { email: sessionEmail }
  if (typeof body.title === 'string') payloadUpdate.title = body.title
  if (typeof body.slug === 'string') payloadUpdate.slug = body.slug
  if (body.navCategory !== undefined) payloadUpdate.navCategory = body.navCategory
  if (body.parent !== undefined) payloadUpdate.parent = body.parent
  if (body.order !== undefined) payloadUpdate.order = body.order
  if (body.section !== undefined && isAdminSession) payloadUpdate.section = body.section
  if (body.content !== undefined) payloadUpdate.content = body.content
  if (body.contactsHeading !== undefined) payloadUpdate.contactsHeading = body.contactsHeading
  if (body.contacts !== undefined) payloadUpdate.contacts = toIdList(body.contacts)

  const customUpdateUrl = `${origin}/api/${updatePath}/${encodeURIComponent(id)}`
  const jsonHeaders = { 'Content-Type': 'application/json' }

  const tryCustom = async (method: 'POST' | 'PATCH') =>
    $fetch(customUpdateUrl, {
      method,
      headers: jsonHeaders,
      body: payloadUpdate,
    })

  try {
    try {
      return await tryCustom('POST')
    } catch (first: any) {
      if (upstreamStatus(first) !== 404) throw mapUpstreamError(first)
      try {
        return await tryCustom('PATCH')
      } catch (second: any) {
        if (upstreamStatus(second) !== 404 || !token) throw mapUpstreamError(second)
        const patchBody: Record<string, unknown> = { ...payloadUpdate }
        delete patchBody.email
        try {
          return await $fetch(`${origin}/api/connect-pages/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
            body: patchBody,
          })
        } catch (third: any) {
          console.error('connect-pages update proxy: custom POST/PATCH 404, REST PATCH failed', {
            customUpdateUrl,
            restUrl: `${origin}/api/connect-pages/${id}`,
          })
          throw mapUpstreamError(third)
        }
      }
    }
  } catch (err: any) {
    if (typeof err?.statusCode === 'number') throw err
    console.error('connect-pages update proxy error:', err)
    throw mapUpstreamError(err)
  }
}
