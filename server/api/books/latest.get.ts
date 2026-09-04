import { createError, defineEventHandler } from 'h3'
import { normalizeUserAvatar, resolveConnectApiUrl, toBrowserMediaUrl } from '../../utils/connectApi'

function absoluteUrl(baseUrl: string, raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  return toBrowserMediaUrl(raw) || (raw.startsWith('http://') || raw.startsWith('https://') ? raw : `${baseUrl}${raw.startsWith('/') ? raw : `/${raw}`}`)
}

function ownerIdFrom(book: any): number | null {
  const owner = book?.owner
  if (typeof owner === 'number' && Number.isFinite(owner)) return owner
  if (owner && typeof owner === 'object' && typeof owner.id === 'number') return owner.id
  return null
}

function releaseDateSortValue(raw: string | null | undefined): number {
  if (!raw) return Number.NEGATIVE_INFINITY
  const t = Date.parse(`${String(raw).slice(0, 10)}T12:00:00Z`)
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY
}

export default defineEventHandler(async () => {
  const payloadBaseUrl = resolveConnectApiUrl().replace(/\/+$/, '')
  const payloadServerBearer = String(useRuntimeConfig().payloadServerBearer || '').trim()

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (payloadServerBearer) headers.Authorization = `Bearer ${payloadServerBearer}`

  const params = new URLSearchParams()
  params.set('where[type][equals]', 'book')
  params.set('sort', '-releaseDate,-updatedAt')
  params.set('limit', '200')
  params.set('depth', '1')

  try {
    const res: any = await $fetch(`${payloadBaseUrl}/api/connect-user-publications?${params.toString()}`, { headers })
    const docs = Array.isArray(res?.docs) ? res.docs : []

    const ownerIds = [...new Set(
      docs
        .map((book: any) => ownerIdFrom(book))
        .filter((id: unknown): id is number => typeof id === 'number' && Number.isFinite(id)),
    )]

    const ownersById = new Map<number, any>()
    for (const book of docs) {
      const owner = book?.owner
      if (owner && typeof owner === 'object' && typeof owner.id === 'number') {
        ownersById.set(owner.id, owner)
      }
    }
    const missingOwnerIds = ownerIds.filter((id) => !ownersById.has(id))
    if (missingOwnerIds.length) {
      const usersRes: any = await $fetch(`${payloadBaseUrl}/api/connect-users`, {
        headers,
        query: { limit: 500, depth: 1 },
      })
      for (const user of usersRes?.docs ?? []) {
        if (typeof user?.id === 'number' && missingOwnerIds.includes(user.id)) {
          ownersById.set(user.id, user)
        }
      }
    }

    const books = docs.map((book: any) => {
      const ownerId = ownerIdFrom(book)
      const owner =
        (book?.owner && typeof book.owner === 'object' ? book.owner : null) ||
        (ownerId != null ? ownersById.get(ownerId) : null)
      const avatar = owner ? normalizeUserAvatar(owner) : null
      return {
        id: book?.id,
        title: book?.title || 'Untitled',
        link: typeof book?.link === 'string' && book.link.trim() ? book.link.trim() : null,
        image: absoluteUrl(payloadBaseUrl, book?.image?.url),
        releaseDate: book?.releaseDate ? String(book.releaseDate).slice(0, 10) : null,
        author: owner?.name || null,
        authorId: owner?.id ?? ownerId,
        authorEmail: owner?.email ?? null,
        authorAvatar: avatar?.url ?? null,
        type: book?.type || null,
      }
    })

    // Newest release date first; undated books stay at the bottom.
    books.sort((a, b) => releaseDateSortValue(b.releaseDate) - releaseDateSortValue(a.releaseDate))

    return { books }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch latest books',
      data: error?.data,
    })
  }
})
