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

function authorAvatarUrl(owner: any): string | null {
  const avatar = normalizeUserAvatar(owner)
  if (avatar?.url) return avatar.url
  const faculty =
    (owner?.facultyPhotoSmall && typeof owner.facultyPhotoSmall === 'object' ? owner.facultyPhotoSmall : null) ||
    (owner?.facultyPhoto && typeof owner.facultyPhoto === 'object' ? owner.facultyPhoto : null)
  return faculty ? toBrowserMediaUrl(faculty.url) : null
}

async function loadOwnersById(
  baseUrl: string,
  headers: Record<string, string>,
  ids: number[],
): Promise<Map<number, any>> {
  const ownersById = new Map<number, any>()
  const chunkSize = 20
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const users = await Promise.all(
      chunk.map((id) =>
        $fetch(`${baseUrl}/api/connect-users/${id}?depth=1`, { headers }).catch(() => null),
      ),
    )
    for (const user of users) {
      if (user && typeof (user as any).id === 'number') ownersById.set((user as any).id, user)
    }
  }
  return ownersById
}

function featuredBookIdSet(settings: any): Set<number> {
  const books = Array.isArray(settings?.featuredBooks) ? settings.featuredBooks : []
  const ids = new Set<number>()
  for (const book of books) {
    const raw = typeof book === 'number' ? book : book?.id
    const id = Number(raw)
    if (Number.isFinite(id)) ids.add(id)
  }
  return ids
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

  const settingsParams = new URLSearchParams()
  settingsParams.set('sort', '-updatedAt')
  settingsParams.set('limit', '1')
  settingsParams.set('depth', '1')

  try {
    const [res, settingsRes]: any[] = await Promise.all([
      $fetch(`${payloadBaseUrl}/api/connect-user-publications?${params.toString()}`, { headers }),
      $fetch(`${payloadBaseUrl}/api/connect-settings?${settingsParams.toString()}`, { headers }).catch(() => null),
    ])
    const docs = Array.isArray(res?.docs) ? res.docs : []
    const settings = Array.isArray(settingsRes?.docs) ? settingsRes.docs[0] || null : null
    const featuredIds = featuredBookIdSet(settings)

    const ownerIds = [...new Set(
      docs
        .map((book: any) => ownerIdFrom(book))
        .filter((id: unknown): id is number => typeof id === 'number' && Number.isFinite(id)),
    )]

    // Publications depth=1 only returns owner stubs ({ id, name, email }).
    // The users list defaults to the first 500 names, Z–A, so earlier authors
    // never appear there. Load each owner by id so avatars are included.
    const ownersById = new Map<number, any>()
    for (const book of docs) {
      const owner = book?.owner
      if (owner && typeof owner === 'object' && typeof owner.id === 'number') {
        ownersById.set(owner.id, owner)
      }
    }
    if (ownerIds.length) {
      const loaded = await loadOwnersById(payloadBaseUrl, headers, ownerIds)
      for (const [id, user] of loaded) ownersById.set(id, user)
    }

    const books = docs.map((book: any) => {
      const ownerId = ownerIdFrom(book)
      const stubOwner = book?.owner && typeof book.owner === 'object' ? book.owner : null
      const owner = (ownerId != null ? ownersById.get(ownerId) : null) || stubOwner
      const avatarUrl = owner ? authorAvatarUrl(owner) : null
      return {
        id: book?.id,
        title: book?.title || 'Untitled',
        link: typeof book?.link === 'string' && book.link.trim() ? book.link.trim() : null,
        image: absoluteUrl(payloadBaseUrl, book?.image?.url),
        releaseDate: book?.releaseDate ? String(book.releaseDate).slice(0, 10) : null,
        author: owner?.name || null,
        authorId: owner?.id ?? ownerId,
        authorEmail: owner?.email ?? null,
        authorAvatar: avatarUrl,
        type: book?.type || null,
        homepageFeatured: featuredIds.has(Number(book?.id)),
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
