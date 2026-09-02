/**
 * Connect backend base URL helpers.
 * Upstream is Hono (`Sites/connect-api`), not Payload CMS.
 */

export function resolveConnectApiUrl(
  config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig(),
): string {
  return (
    (config.connectApi || config.public.connectApi || '').trim() ||
    (import.meta.dev ? 'http://localhost:3003' : '')
  )
}

/**
 * Prefer same-origin Nitro proxies for browser <img> / media so the client
 * does not need to talk to :3003 directly (CORS/cookies/port collisions).
 */
export function toBrowserMediaUrl(urlRaw: unknown): string | null {
  const input = typeof urlRaw === 'string' ? urlRaw.trim() : ''
  if (!input) return null

  const userMedia = input.match(/\/api\/connect-user-media\/file\/([^/?#]+)/i)
  if (userMedia?.[1]) return `/api/connect-user-media/file/${userMedia[1]}`

  const legacyMedia = input.match(/\/api\/media\/file\/([^/?#]+)/i)
  if (legacyMedia?.[1]) return `/api/connect-user-media/file/${legacyMedia[1]}`

  const pagesMedia = input.match(/\/api\/connect-pages-media\/file\/([^/?#]+)/i)
  if (pagesMedia?.[1]) return `/api/connect-pages-media/file/${pagesMedia[1]}`

  const speakerPhotos = input.match(/\/api\/speaker-photos\/file\/([^/?#]+)/i)
  if (speakerPhotos?.[1]) return `/api/speaker-photos/file/${speakerPhotos[1]}`

  const comicsMedia = input.match(/\/api\/connect-keeners-comics\/file\/([^/?#]+)/i)
  if (comicsMedia?.[1]) return `/api/connect-keeners-comics/file/${comicsMedia[1]}`

  return input
}

/** Absolute URL for server-side fetches or when the browser must hit CONNECT_API directly. */
export function toAbsoluteConnectUrl(urlRaw: unknown, connectApiUrl: string): string | null {
  const input = typeof urlRaw === 'string' ? urlRaw.trim() : ''
  if (!input) return null
  if (input.startsWith('http://') || input.startsWith('https://')) return input
  const base = connectApiUrl.replace(/\/+$/, '')
  return input.startsWith('/') ? `${base}${input}` : `${base}/${input}`
}

/** Prefer avatarConnectUserMedia, fall back to legacy avatar; rewrite url for the browser. */
export function normalizeUserAvatar(user: any): { url: string } | null {
  const media =
    (user?.avatarConnectUserMedia && typeof user.avatarConnectUserMedia === 'object'
      ? user.avatarConnectUserMedia
      : null) ||
    (user?.avatar && typeof user.avatar === 'object' ? user.avatar : null) ||
    null
  if (!media) return null
  const url = toBrowserMediaUrl(media.url)
  if (!url) return null
  return { ...media, url }
}

/** Normalize nested user.avatar on a reaction doc for browser display. */
export function normalizeReactionDoc<T extends Record<string, unknown>>(reaction: T): T {
  const user = reaction.user
  if (!user || typeof user !== 'object') return reaction
  return {
    ...reaction,
    user: {
      ...(user as Record<string, unknown>),
      avatar: normalizeUserAvatar(user),
    },
  }
}

export function normalizeReactionDocs(docs: unknown): unknown[] {
  if (!Array.isArray(docs)) return []
  return docs.map((doc) => normalizeReactionDoc(doc as Record<string, unknown>))
}
