export type TimelineAudienceAccess = {
  canSeeAll?: boolean
  canSeeStudents?: boolean
  canSeeFaculty?: boolean
  canSeeStaff?: boolean
  canSeeEmployees?: boolean
}

export function audienceList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((value) => String(value).toLowerCase())
  if (raw && typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>).map((value) => String(value).toLowerCase())
  }
  if (typeof raw === 'string' && raw.trim()) return [raw.trim().toLowerCase()]
  return []
}

function audienceHas(audience: string[], value: string) {
  if (audience.includes(value)) return true
  if (value === 'students') return audience.includes('student')
  return false
}

export function isGeneralAudience(raw: unknown): boolean {
  const audience = audienceList(raw)
  return !audience.length || audienceHas(audience, 'all') || audienceHas(audience, 'general')
}

export function isPinnedPost(rawCategories: unknown): boolean {
  const list = Array.isArray(rawCategories) ? rawCategories : []
  return list.map((value) => String(value).toLowerCase()).includes('pinned')
}

export function postVisibleToViewer(rawAudience: unknown, access: TimelineAudienceAccess): boolean {
  if (access.canSeeAll || isGeneralAudience(rawAudience)) return true
  const audience = audienceList(rawAudience)
  if (access.canSeeStudents && audienceHas(audience, 'students')) return true
  if (access.canSeeFaculty && audienceHas(audience, 'faculty')) return true
  if (access.canSeeStaff && audienceHas(audience, 'staff')) return true
  if (access.canSeeEmployees && audienceHas(audience, 'employees')) return true
  return false
}

export function isRecentPost(createdAt: unknown, now = Date.now(), recentMs = 8 * 24 * 60 * 60 * 1000): boolean {
  const created = new Date(String(createdAt)).getTime()
  if (!Number.isFinite(created)) return true
  return now - created <= recentMs
}

export function authorIdFromPost(author: unknown): number | null {
  if (typeof author === 'number' && Number.isFinite(author)) return author
  if (author && typeof author === 'object' && 'id' in (author as { id?: unknown })) {
    const id = Number((author as { id?: unknown }).id)
    return Number.isFinite(id) ? id : null
  }
  return null
}

export function partitionTimelinePosts<T extends { audience?: unknown; categories?: unknown; createdAt?: unknown }>(
  posts: T[],
  access: TimelineAudienceAccess,
  options?: { olderVisibleCount?: number; now?: number; recentMs?: number },
): { displayed: T[]; hiddenOlderCount: number } {
  if (!posts.length) return { displayed: [], hiddenOlderCount: 0 }

  const now = options?.now ?? Date.now()
  const recentMs = options?.recentMs ?? 8 * 24 * 60 * 60 * 1000
  const olderVisibleCount = options?.olderVisibleCount ?? 0

  const visible = posts.filter((post) => postVisibleToViewer(post.audience, access))
  const sortByNewest = (list: T[]) =>
    [...list].sort(
      (a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime(),
    )

  const pinned = sortByNewest(visible.filter((post) => isPinnedPost(post.categories)))
  const nonPinned = visible.filter((post) => !isPinnedPost(post.categories))
  const recent = sortByNewest(nonPinned.filter((post) => isRecentPost(post.createdAt, now, recentMs)))
  const older = sortByNewest(nonPinned.filter((post) => !isRecentPost(post.createdAt, now, recentMs)))
  const olderVisible = older.slice(0, olderVisibleCount)

  return {
    displayed: [...pinned, ...recent, ...olderVisible],
    hiddenOlderCount: Math.max(0, older.length - olderVisible.length),
  }
}
