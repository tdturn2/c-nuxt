/**
 * Connect backend base URL helpers.
 * Upstream is Hono (`Sites/connect-api`), not Payload CMS.
 */

import { toBrowserMediaUrl } from '@shared/mediaUrls'

export { toBrowserMediaUrl }

export function resolveConnectApiUrl(
  config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig(),
): string {
  return (
    (config.connectApi || config.public.connectApi || '').trim() ||
    (import.meta.dev ? 'http://localhost:3003' : '')
  )
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
