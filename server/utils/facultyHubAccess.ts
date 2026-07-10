import { createError, type H3Event } from 'h3'
import {
  filterOutFacultyHubPages,
  hasFacultyHubAccess,
  isFacultyHubPageId,
} from '@shared/facultyHubAccess'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from './payloadAuth'

export async function loadConnectUserDocForEvent(event: H3Event): Promise<any | null> {
  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  if (!payloadBaseUrl) return null

  const auth = await authenticateWithPayloadCMS(event)
  if (!auth.email) return null

  const headers = getPayloadProxyHeaders(event, auth, { Accept: 'application/json' })
  const res: any = await $fetch(
    `${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(auth.email)}&limit=1&depth=1`,
    { headers },
  ).catch(() => null)

  return Array.isArray(res?.docs) ? res.docs[0] ?? null : null
}

export async function userHasFacultyHubAccess(event: H3Event): Promise<boolean> {
  const doc = await loadConnectUserDocForEvent(event)
  return hasFacultyHubAccess(doc)
}

export function filterConnectPagesForFacultyHubAccess<T extends { id?: string | number }>(
  docs: T[],
  allowed: boolean,
): T[] {
  if (allowed) return docs
  return filterOutFacultyHubPages(docs)
}

export async function assertFacultyHubPageReadable(
  event: H3Event,
  pageId: string | number,
  payloadBaseUrl: string,
  headers: Record<string, string>,
): Promise<void> {
  if (await userHasFacultyHubAccess(event)) return

  const listRes: any = await $fetch(
    `${payloadBaseUrl}/api/connect-pages?limit=500&depth=0&pagination=false`,
    { headers: { Accept: 'application/json' } },
  ).catch(() => null)

  const pages = Array.isArray(listRes?.docs) ? listRes.docs : []
  if (isFacultyHubPageId(pageId, pages)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
}
