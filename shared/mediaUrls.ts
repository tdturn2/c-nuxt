/**
 * Prefer same-origin Nitro proxies for browser <img> / media so the client
 * does not need to talk to connect-api directly.
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
