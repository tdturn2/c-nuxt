import { humanizeFilename } from '../../shared/humanizeFilename'

export type DashboardMediaDoc = {
  id?: number | string
  alt?: string | null
  url?: string | null
  filename?: string | null
  mimeType?: string | null
  filesize?: number | string | null
  createdAt?: string | Date | null
  kind?: string | null
  owner?: number | string | null
  prefix?: string | null
  file?: { url?: string | null; filename?: string | null; name?: string | null; alt?: string | null }
  _normalizedUrl?: string | null
}

export function mediaDisplayName(doc: DashboardMediaDoc | null | undefined): string {
  const alt = doc?.alt ?? doc?.file?.alt
  if (typeof alt === 'string' && alt.trim()) return alt.trim()
  const filename = mediaFilename(doc)
  if (filename) return humanizeFilename(filename)
  return 'Untitled file'
}

export function mediaFilename(doc: DashboardMediaDoc | null | undefined): string | null {
  const file = doc?.file
  if (file && typeof file === 'object') {
    for (const key of ['filename', 'name'] as const) {
      const value = file[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  }
  if (typeof doc?.filename === 'string' && doc.filename.trim()) return doc.filename.trim()
  const url = mediaUrl(doc)
  if (!url) return null
  const seg = url.split('?')[0]?.split('/').filter(Boolean).pop()
  if (!seg) return null
  try {
    return decodeURIComponent(seg)
  } catch {
    return seg
  }
}

export function mediaUrl(doc: DashboardMediaDoc | null | undefined): string | null {
  const raw = doc?._normalizedUrl || doc?.url || doc?.file?.url
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export function mediaIsImage(doc: DashboardMediaDoc | null | undefined): boolean {
  const mime = String(doc?.mimeType || '').toLowerCase()
  if (mime.startsWith('image/')) return true
  const name = (mediaFilename(doc) || '').toLowerCase()
  return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(name)
}

export function formatMediaBytes(value: unknown): string {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatMediaDate(value: unknown): string {
  if (!value) return '—'
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export function userMediaKindLabel(kind: unknown): string {
  const value = String(kind || '').trim().toLowerCase()
  if (value === 'avatars') return 'Avatars'
  if (value === 'post-images') return 'Post images'
  if (value === 'pubs-images') return 'Publications'
  return value || 'Other'
}
