/** Payload Lexical upload feature uses this collection slug for connect page assets. */
export const CONNECT_PAGES_MEDIA_RELATION = 'connect-pages-media'

export function newLexicalUploadBlockId(): string {
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function normalizePayloadMediaUrl(url: string, payloadBaseUrl: string): string {
  const t = String(url || '').trim()
  if (!t) return ''
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  const base = payloadBaseUrl.replace(/\/+$/, '')
  if (!base) return t
  return t.startsWith('/') ? `${base}${t}` : `${base}/${t}`
}

/**
 * Recover a connect-pages-media document id from a served file URL when `connectMediaId` is missing.
 */
export function parseConnectPagesMediaIdFromUrl(urlRaw: string): string | number | null {
  const url = String(urlRaw || '').trim()
  if (!url) return null
  const m = url.match(/\/api\/connect-pages-media\/file\/([^/?#]+)/i)
  if (!m?.[1]) return null
  const id = decodeURIComponent(m[1])
  const n = Number(id)
  if (String(n) === id && Number.isFinite(n)) return n
  return id
}

export function resolveConnectPagesMediaFromLexicalValue(value: unknown): {
  mediaId: string | number | null
  url: string
  alt: string
} {
  let mediaId: string | number | null = null
  let url = ''
  let alt = ''

  if (value == null) return { mediaId: null, url: '', alt: '' }

  if (typeof value === 'number') {
    return { mediaId: value, url: '', alt: '' }
  }

  if (typeof value === 'string') {
    const t = value.trim()
    if (!t) return { mediaId: null, url: '', alt: '' }
    const n = Number(t)
    if (String(n) === t && Number.isFinite(n)) return { mediaId: n, url: '', alt: '' }
    return { mediaId: t, url: '', alt: '' }
  }

  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    if (o.id != null) mediaId = o.id as string | number
    const file = o.file
    if (file && typeof file === 'object') {
      const f = file as Record<string, unknown>
      if (typeof f.url === 'string') url = f.url
      if (typeof f.alt === 'string') alt = f.alt
    }
    if (!url && typeof o.url === 'string') url = o.url
    if (!alt && typeof o.alt === 'string') alt = o.alt
  }

  return { mediaId, url, alt }
}

function coerceLexicalUploadValue(id: string | number): string | number {
  if (typeof id === 'number') return id
  const n = Number(id)
  if (String(n) === String(id).trim() && Number.isFinite(n)) return n
  return String(id)
}

/**
 * Serialize a TipTap image to Payload Lexical `upload` v3.
 * Media id is taken from the image URL path when possible (same graph as Nuxt UI's Image extension).
 */
export function tipTapImageToLexicalUploadNode(node: {
  attrs?: { src?: string; alt?: string; title?: string }
}): Record<string, unknown> | null {
  const src = typeof node.attrs?.src === 'string' ? node.attrs.src.trim() : ''
  let mediaId: string | number | null = null
  if (src) {
    mediaId = parseConnectPagesMediaIdFromUrl(src)
  }
  if (mediaId == null) return null

  return {
    type: 'upload',
    version: 3,
    format: '',
    id: newLexicalUploadBlockId(),
    fields: null,
    relationTo: CONNECT_PAGES_MEDIA_RELATION,
    value: coerceLexicalUploadValue(mediaId),
  }
}

/** Lexical `upload` (connect-pages-media) → TipTap `image` for the dashboard editor. */
export function lexicalUploadNodeToTipTapImage(
  node: { relationTo?: string; value?: unknown },
  payloadBaseUrl: string,
): any[] {
  if (node.relationTo !== CONNECT_PAGES_MEDIA_RELATION) return []
  const { url, alt, mediaId } = resolveConnectPagesMediaFromLexicalValue(node.value)
  const src = normalizePayloadMediaUrl(url, payloadBaseUrl)
  if (!src) return []
  return [
    {
      type: 'image',
      attrs: {
        src,
        alt: alt || '',
      },
    },
  ]
}
