import { readBody, createError, getRouterParam, type H3Event } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from './payloadAuth'

type UpdateBody = {
  email?: string
  title?: string
  slug?: string
  navCategory?: string | null
  formSlug?: string | null
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

function normalizeExpectedFormSlug(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value == null) return null
  if (typeof value !== 'string') return String(value)
  const v = value.trim()
  return v.length ? v : null
}

function readPersistedFormSlug(doc: any): string | null {
  if (!doc || typeof doc !== 'object') return null
  const direct = doc?.formSlug
  if (typeof direct === 'string') return direct.trim() || null
  if (direct == null) {
    const fieldValue = doc?.fields?.formSlug
    if (typeof fieldValue === 'string') return fieldValue.trim() || null
    if (fieldValue == null) return null
  }
  if (doc?.form?.slug && typeof doc.form.slug === 'string') return doc.form.slug.trim() || null
  return null
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

  const { token, email: sessionEmail, payloadSessionCookie } = await authenticateWithPayloadCMS(event)
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
  if (body.formSlug !== undefined) payloadUpdate.formSlug = body.formSlug
  if (body.parent !== undefined) payloadUpdate.parent = body.parent
  if (body.order !== undefined) payloadUpdate.order = body.order
  if (body.section !== undefined && isAdminSession) payloadUpdate.section = body.section
  if (body.content !== undefined) payloadUpdate.content = body.content
  if (body.contactsHeading !== undefined) payloadUpdate.contactsHeading = body.contactsHeading
  if (body.contacts !== undefined) payloadUpdate.contacts = toIdList(body.contacts)

  const customUpdateUrl = `${origin}/api/${updatePath}/${encodeURIComponent(id)}`
  const jsonHeaders = { 'Content-Type': 'application/json' }
  const restPageUrl = `${origin}/api/connect-pages/${encodeURIComponent(id)}`
  const expectedFormSlug = normalizeExpectedFormSlug(body.formSlug)

  const tryCustom = async (method: 'POST' | 'PATCH') =>
    $fetch(customUpdateUrl, {
      method,
      headers: jsonHeaders,
      body: payloadUpdate,
    })

  /**
   * Custom SSO routes often return 200 but only persist an allowlisted subset of fields.
   * If `formSlug` is present, merge it via native REST so it actually saves when the collection defines it.
   */
  const mergeFormSlugViaRestIfNeeded = async (customResult: unknown) => {
    if (body.formSlug === undefined) return customResult
    if (!token && !payloadSessionCookie) return customResult
    try {
      return await $fetch(restPageUrl, {
        method: 'PATCH',
        headers: getPayloadProxyHeaders(event, { token, payloadSessionCookie }),
        body: { formSlug: body.formSlug },
      })
    } catch (e: any) {
      console.error('connect-pages update proxy: formSlug REST merge after custom route failed', {
        restPageUrl,
      })
      throw mapUpstreamError(e)
    }
  }

  const assertFormSlugPersistedIfRequested = async () => {
    if (expectedFormSlug === undefined) return
    if (!token && !payloadSessionCookie) return
    try {
      const verifyDoc = await $fetch(`${restPageUrl}?depth=0`, {
        headers: getPayloadProxyHeaders(event, { token, payloadSessionCookie }, { Accept: 'application/json' }),
      })
      const persisted = readPersistedFormSlug(verifyDoc)
      if (persisted !== expectedFormSlug) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Saved, but attached form was not persisted in Payload.',
          data: {
            expectedFormSlug,
            persistedFormSlug: persisted,
            hint: 'Payload connect-pages schema or custom update allowlist may not include formSlug.',
          },
        })
      }
    } catch (err: any) {
      if (typeof err?.statusCode === 'number') throw err
      throw mapUpstreamError(err)
    }
  }

  try {
    try {
      const result = await mergeFormSlugViaRestIfNeeded(await tryCustom('POST'))
      await assertFormSlugPersistedIfRequested()
      return result
    } catch (first: any) {
      if (upstreamStatus(first) !== 404) throw mapUpstreamError(first)
      try {
        const result = await mergeFormSlugViaRestIfNeeded(await tryCustom('PATCH'))
        await assertFormSlugPersistedIfRequested()
        return result
      } catch (second: any) {
        if (upstreamStatus(second) !== 404 || !token) throw mapUpstreamError(second)
        const patchBody: Record<string, unknown> = { ...payloadUpdate }
        delete patchBody.email
        try {
          const result = await $fetch(restPageUrl, {
            method: 'PATCH',
            headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
            body: patchBody,
          })
          await assertFormSlugPersistedIfRequested()
          return result
        } catch (third: any) {
          console.error('connect-pages update proxy: custom POST/PATCH 404, REST PATCH failed', {
            customUpdateUrl,
            restUrl: restPageUrl,
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
