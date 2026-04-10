// Proxy to Payload CMS connect-pages collection. Forward query params (e.g. where[slug][equals], limit, depth).
import { defineEventHandler, getQuery, getHeader, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  const query = getQuery(event)
  const searchParams = new URLSearchParams(query as Record<string, string>)
  const url = `${payloadBaseUrl}/api/connect-pages?${searchParams.toString()}`

  /** Same as connect-pages-media: without Cookie + JWT, Payload may omit restricted fields (e.g. `content`) for dashboard editors. */
  const { token } = await authenticateWithPayloadCMS(event)
  const headers: Record<string, string> = {}
  const cookie = getHeader(event, 'cookie')
  if (cookie) headers.Cookie = cookie
  if (token) headers.Authorization = `Bearer ${token}`
  const toAbsoluteUrl = (value: unknown): unknown => {
    if (!payloadBaseUrl) return value
    if (typeof value !== 'string') return value
    const v = value.trim()
    if (!v || v.startsWith('http')) return v
    return v.startsWith('/') ? `${payloadBaseUrl}${v}` : `${payloadBaseUrl}/${v}`
  }
  const toParentId = (parent: unknown): string | null => {
    if (parent == null) return null
    if (typeof parent === 'object') {
      const id = (parent as { id?: number | string }).id
      return id == null ? null : String(id)
    }
    return String(parent)
  }
  const normalizeDoc = (doc: any) => {
    if (!doc || typeof doc !== 'object') return doc
    const navCategory = typeof doc.navCategory === 'string'
      ? doc.navCategory.trim().toLowerCase()
      : null
    const normalizeContact = (c: any) => {
      if (!c || typeof c !== 'object') return c
      // Backward compatibility: prefer legacy avatar, fallback to avatarConnectUserMedia.
      if (!c.avatar?.url && c.avatarConnectUserMedia?.url) c.avatar = c.avatarConnectUserMedia
      if (c.avatar?.url) c.avatar.url = toAbsoluteUrl(c.avatar.url)
      return c
    }
    const contacts = Array.isArray(doc.contacts)
      ? doc.contacts.map((c: any) => normalizeContact(c))
      : doc.contacts
    return {
      ...doc,
      navCategory,
      parentId: toParentId(doc.parent),
      contacts,
    }
  }
  try {
    const data: any = await $fetch(url, { headers })
    if (Array.isArray(data?.docs)) {
      return {
        ...data,
        docs: data.docs.map((doc: any) => normalizeDoc(doc)),
      }
    }
    return normalizeDoc(data)
  } catch (err: any) {
    const statusCode = err?.response?.status || err?.statusCode || 502
    const data = err?.data
    throw createError({
      statusCode,
      statusMessage: err?.statusMessage || err?.message || 'Failed to fetch connect-pages',
      data,
    })
  }
})
