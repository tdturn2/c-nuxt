import { toBrowserMediaUrl } from '../../shared/mediaUrls'

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

/** Filename in `/api/connect-pages-media/file/:filename`, if this URL is one of ours. */
export function parseConnectPagesMediaFilenameFromUrl(urlRaw: string): string | null {
  const url = String(urlRaw || '').trim()
  if (!url) return null
  const m = url.match(/\/api\/connect-pages-media\/file\/([^/?#]+)/i)
  if (!m?.[1]) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

export function connectPagesMediaFileUrl(filename: string): string {
  const name = String(filename || '').trim()
  if (!name) return ''
  return `/api/connect-pages-media/file/${encodeURIComponent(name)}`
}

export type PageImageAlign = 'none' | 'left' | 'right'
export type PageImageSize = 'small' | 'medium' | 'large' | 'full'

export function normalizePageImageAlign(value: unknown): PageImageAlign {
  const align = String(value || '').trim().toLowerCase()
  if (align === 'left' || align === 'right') return align
  return 'none'
}

export function normalizePageImageSize(value: unknown): PageImageSize {
  const size = String(value || '').trim().toLowerCase()
  if (size === 'small' || size === 'medium' || size === 'large') return size
  return 'full'
}

export function resolveConnectPagesMediaFromLexicalValue(value: unknown): {
  mediaId: string | number | null
  url: string
  alt: string
  align: PageImageAlign
  size: PageImageSize
} {
  let mediaId: string | number | null = null
  let url = ''
  let alt = ''
  let align: PageImageAlign = 'none'
  let size: PageImageSize = 'full'

  const result = () => ({ mediaId, url, alt, align, size })

  if (value == null) return result()

  if (typeof value === 'number') {
    mediaId = value
    return result()
  }

  if (typeof value === 'string') {
    const t = value.trim()
    if (!t) return result()
    const n = Number(t)
    if (String(n) === t && Number.isFinite(n)) {
      mediaId = n
      return result()
    }
    // Older saves stored the filename in place of the media id, so the page had no URL to render.
    url = connectPagesMediaFileUrl(t)
    return result()
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
    if (!url && typeof o.filename === 'string') url = connectPagesMediaFileUrl(o.filename)
    if (!alt && typeof o.alt === 'string') alt = o.alt
    align = normalizePageImageAlign(o.align)
    size = normalizePageImageSize(o.size)
  }

  return result()
}

/**
 * Serialize a TipTap image to a Lexical `upload` node.
 * The file URL has to travel with the node. A bare media id or filename cannot be rendered later.
 */
export function tipTapImageToLexicalUploadNode(node: {
  attrs?: { src?: string; alt?: string; title?: string; align?: string; size?: string }
}): Record<string, unknown> | null {
  const src = typeof node.attrs?.src === 'string' ? node.attrs.src.trim() : ''
  const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''
  const browserUrl = toBrowserMediaUrl(src) || src
  if (!browserUrl) return null

  const filename = parseConnectPagesMediaFilenameFromUrl(browserUrl)
  const value: Record<string, unknown> = {
    url: browserUrl,
    alt,
    align: normalizePageImageAlign(node.attrs?.align),
    size: normalizePageImageSize(node.attrs?.size),
  }
  if (filename) value.filename = filename

  return {
    type: 'upload',
    version: 3,
    format: '',
    id: newLexicalUploadBlockId(),
    fields: null,
    relationTo: CONNECT_PAGES_MEDIA_RELATION,
    value,
  }
}

/** Lexical `upload` (connect-pages-media) → TipTap `image` for the dashboard editor. */
export function lexicalUploadNodeToTipTapImage(
  node: { relationTo?: string; value?: unknown },
  payloadBaseUrl: string,
): any[] {
  if (node.relationTo !== CONNECT_PAGES_MEDIA_RELATION) return []
  const { url, alt, align, size } = resolveConnectPagesMediaFromLexicalValue(node.value)
  const src = toBrowserMediaUrl(url) || normalizePayloadMediaUrl(url, payloadBaseUrl)
  if (!src) return []
  return [
    {
      type: 'image',
      attrs: {
        src,
        alt: alt || '',
        align,
        size,
      },
    },
  ]
}
