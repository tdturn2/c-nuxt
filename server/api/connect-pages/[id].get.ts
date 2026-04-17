import { defineEventHandler, getRouterParam, getQuery, createError } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

/** Load one connect-page doc (full `content` Lexical). Forwards session so Payload returns fields editors are allowed to read. */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Page id is required' })
  }

  const q = getQuery(event)
  const depth = typeof q.depth === 'string' && q.depth ? q.depth : '2'
  const url = `${payloadBaseUrl}/api/connect-pages/${encodeURIComponent(id)}?depth=${encodeURIComponent(depth)}`

  const { token, payloadSessionCookie } = await authenticateWithPayloadCMS(event)
  const headers = getPayloadProxyHeaders(event, { token, payloadSessionCookie }, { Accept: 'application/json' })

  try {
    const data: any = await $fetch(url, { headers })
    const shouldHydrateContactsFromPublic = (doc: any) => {
      if (!doc || typeof doc !== 'object') return false
      if (!('contacts' in doc)) return false
      return Array.isArray(doc.contacts) && doc.contacts.length === 0
    }
    if (!shouldHydrateContactsFromPublic(data)) return data

    try {
      const publicDoc: any = await $fetch(url, { headers: { Accept: 'application/json' } })
      const out = { ...data }
      if (Array.isArray(out.contacts) && out.contacts.length === 0 && Array.isArray(publicDoc?.contacts) && publicDoc.contacts.length > 0) {
        out.contacts = publicDoc.contacts
      }
      if ((out.contactsHeading == null || out.contactsHeading === '') && publicDoc?.contactsHeading != null) {
        out.contactsHeading = publicDoc.contactsHeading
      }
      return out
    } catch {
      return data
    }
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 502,
      statusMessage: err?.statusMessage || err?.message || 'Failed to load connect-page',
      data: err?.data ?? err?.response?._data,
    })
  }
})
