import { createError, type H3Event } from 'h3'
import { filterOutFacultyHubPages, hasFacultyHubAccess, isFacultyHubPageId } from '@shared/facultyHubAccess'
import { filterOutStaffHubPages, hasStaffHubAccess, isStaffHubPageId } from '@shared/staffHubAccess'
import { loadConnectUserDocForEvent } from './connectUserAccess'

export async function loadAudienceHubAccess(event: H3Event) {
  const connectUserDoc = await loadConnectUserDocForEvent(event)
  return {
    connectUserDoc,
    facultyHubAllowed: hasFacultyHubAccess(connectUserDoc),
    staffHubAllowed: hasStaffHubAccess(connectUserDoc),
  }
}

export function filterConnectPagesForAudienceHubAccess<T extends { id?: string | number }>(
  docs: T[],
  facultyHubAllowed: boolean,
  staffHubAllowed: boolean,
): T[] {
  let out = docs
  if (!facultyHubAllowed) out = filterOutFacultyHubPages(out)
  if (!staffHubAllowed) out = filterOutStaffHubPages(out)
  return out
}

export async function assertAudienceHubPageReadable(
  event: H3Event,
  pageId: string | number,
  payloadBaseUrl: string,
  headers: Record<string, string>,
): Promise<void> {
  const { facultyHubAllowed, staffHubAllowed } = await loadAudienceHubAccess(event)
  if (facultyHubAllowed && staffHubAllowed) return

  const listRes: any = await $fetch(
    `${payloadBaseUrl}/api/connect-pages?limit=500&depth=0&pagination=false`,
    { headers: { Accept: 'application/json' } },
  ).catch(() => null)

  const pages = Array.isArray(listRes?.docs) ? listRes.docs : []
  if (!facultyHubAllowed && isFacultyHubPageId(pageId, pages)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  if (!staffHubAllowed && isStaffHubPageId(pageId, pages)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
}
