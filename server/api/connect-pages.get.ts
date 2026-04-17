// Proxy to Payload CMS connect-pages collection. Forward query params (e.g. where[slug][equals], limit, depth).
import { defineEventHandler, getQuery, createError } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  const query = getQuery(event)
  const searchParams = new URLSearchParams(query as Record<string, string>)
  const url = `${payloadBaseUrl}/api/connect-pages?${searchParams.toString()}`

  /** Same as connect-pages-media: without Cookie + JWT, Payload may omit restricted fields (e.g. `content`) for dashboard editors. */
  const { token, payloadSessionCookie } = await authenticateWithPayloadCMS(event)
  const headers = getPayloadProxyHeaders(event, { token, payloadSessionCookie }, { Accept: 'application/json' })
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
    let publicData: any = null

    const shouldHydrateContactsFromPublic = (doc: any) => {
      if (!doc || typeof doc !== 'object') return false
      if (!('contacts' in doc)) return false
      return Array.isArray(doc.contacts) && doc.contacts.length === 0
    }

    const loadPublicDataIfNeeded = async () => {
      if (publicData != null) return publicData
      try {
        publicData = await $fetch(url, { headers: { Accept: 'application/json' } })
      } catch {
        publicData = null
      }
      return publicData
    }

    const mergeContactsFromPublicDoc = (doc: any, publicDoc: any) => {
      if (!doc || typeof doc !== 'object' || !publicDoc || typeof publicDoc !== 'object') return doc
      const out = { ...doc }
      if (Array.isArray(out.contacts) && out.contacts.length === 0 && Array.isArray(publicDoc.contacts) && publicDoc.contacts.length > 0) {
        out.contacts = publicDoc.contacts
      }
      if ((out.contactsHeading == null || out.contactsHeading === '') && publicDoc.contactsHeading != null) {
        out.contactsHeading = publicDoc.contactsHeading
      }
      return out
    }

    if (Array.isArray(data?.docs)) {
      const docs = data.docs.map((doc: any) => normalizeDoc(doc))
      const needsFallback = docs.some((doc: any) => shouldHydrateContactsFromPublic(doc))
      if (needsFallback) {
        const publicRes = await loadPublicDataIfNeeded()
        const publicDocs = Array.isArray(publicRes?.docs) ? publicRes.docs : []
        const publicById = new Map<string, any>(publicDocs.map((d: any) => [String(d?.id ?? ''), d]))
        return {
          ...data,
          docs: docs.map((doc: any) => normalizeDoc(mergeContactsFromPublicDoc(doc, publicById.get(String(doc?.id ?? ''))))),
        }
      }
      return {
        ...data,
        docs,
      }
    }
    const normalized = normalizeDoc(data)
    if (shouldHydrateContactsFromPublic(normalized)) {
      const publicRes = await loadPublicDataIfNeeded()
      const merged = mergeContactsFromPublicDoc(normalized, publicRes)
      return normalizeDoc(merged)
    }
    return normalized
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
