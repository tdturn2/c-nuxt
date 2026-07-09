import { normalizeVimeoCollectionIframeUrl } from '~/utils/vimeoEmbed'

export type ConnectVideoRow = {
  id: string
  title: string
}

export type ConnectVimeoCollectionRow = {
  title: string
  iframeUrl: string
}

type ConnectVideoListRow = {
  title: string
  playAttr: 'data-connect-play-vimeo' | 'data-connect-play-vimeo-collection'
  value: string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const PLAY_ICON_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11.04-7.36a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z"/></svg>`

function buildConnectVideoListHtml(rows: ConnectVideoListRow[], ariaLabel: string): string {
  if (!rows.length) return ''

  const items = rows
    .map((row) => {
      const title = escapeHtml(row.title)
      const value = escapeHtml(row.value)
      return `<li class="connect-video-collection__item">
  <button
    type="button"
    class="connect-video-collection__row"
    ${row.playAttr}="${value}"
    data-connect-video-title="${title}"
  >
    <span class="connect-video-collection__play" aria-hidden="true">${PLAY_ICON_SVG}</span>
    <span class="connect-video-collection__title">${title}</span>
  </button>
</li>`
    })
    .join('')

  return `<section class="connect-video-collection not-prose my-4" aria-label="${escapeHtml(ariaLabel)}">
  <ul class="connect-video-collection__list">${items}</ul>
</section>`
}

export function buildConnectVideosCollectionHtml(rows: ConnectVideoRow[]): string {
  if (!rows.length) {
    return '<div class="connect-video-collection connect-video-collection--empty not-prose my-2 text-xs text-gray-500">@connect-videos: no valid items</div>'
  }

  return buildConnectVideoListHtml(
    rows.map((row) => ({
      title: row.title,
      playAttr: 'data-connect-play-vimeo',
      value: row.id,
    })),
    'Video library',
  )
}

export function buildConnectVimeoCollectionListHtml(rows: ConnectVimeoCollectionRow[]): string {
  if (!rows.length) {
    return '<div class="connect-video-collection connect-video-collection--empty not-prose my-2 text-xs text-gray-500">@connect-vimeo-collection: no valid items</div>'
  }

  return buildConnectVideoListHtml(
    rows.map((row) => ({
      title: row.title,
      playAttr: 'data-connect-play-vimeo-collection',
      value: row.iframeUrl,
    })),
    'Video collections',
  )
}

export function parseConnectVideoRows(parsed: unknown[]): ConnectVideoRow[] {
  const rows: ConnectVideoRow[] = []
  for (const row of parsed) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const id = String(o.vimeoId ?? o.vimeo_id ?? '').trim()
    if (!id) continue
    const title = String(o.title ?? '').trim() || `Video ${id}`
    rows.push({ title, id })
  }
  return rows
}

export function parseConnectVimeoCollectionRows(parsed: unknown[]): ConnectVimeoCollectionRow[] {
  const rows: ConnectVimeoCollectionRow[] = []
  for (const row of parsed) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const title = String(item.title ?? '').trim() || 'Vimeo Collection'
    const parsedUrl = String(item.url ?? item.vimeoUrl ?? '').trim()
    const iframeUrl = normalizeVimeoCollectionIframeUrl(parsedUrl)
    if (!iframeUrl) continue
    rows.push({ title, iframeUrl })
  }
  return rows
}

export function parseConnectVimeoCollectionPayload(payload: string): {
  rows: ConnectVimeoCollectionRow[]
  errorHtml: string | null
} {
  const trimmed = payload.trim()
  if (!trimmed) {
    return {
      rows: [],
      errorHtml: '<div class="connect-video-collection connect-video-collection--error not-prose my-2 text-xs text-amber-800">@connect-vimeo-collection: missing payload</div>',
    }
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return { rows: parseConnectVimeoCollectionRows(parsed), errorHtml: null }
      }
      if (parsed && typeof parsed === 'object') {
        const item = parsed as Record<string, unknown>
        const title = String(item.title ?? '').trim() || 'Vimeo Collection'
        const parsedUrl = String(item.url ?? item.vimeoUrl ?? '').trim()
        const iframeUrl = normalizeVimeoCollectionIframeUrl(parsedUrl)
        if (!iframeUrl) {
          return {
            rows: [],
            errorHtml: '<div class="connect-video-collection connect-video-collection--error not-prose my-2 text-xs text-red-600">@connect-vimeo-collection: invalid collection url</div>',
          }
        }
        return { rows: [{ title, iframeUrl }], errorHtml: null }
      }
      return {
        rows: [],
        errorHtml: '<div class="connect-video-collection connect-video-collection--error not-prose my-2 text-xs text-red-600">@connect-vimeo-collection: invalid JSON</div>',
      }
    } catch {
      return {
        rows: [],
        errorHtml: '<div class="connect-video-collection connect-video-collection--error not-prose my-2 text-xs text-red-600">@connect-vimeo-collection: invalid JSON</div>',
      }
    }
  }

  const iframeUrl = normalizeVimeoCollectionIframeUrl(trimmed)
  if (!iframeUrl) {
    return {
      rows: [],
      errorHtml: '<div class="connect-video-collection connect-video-collection--error not-prose my-2 text-xs text-red-600">@connect-vimeo-collection: invalid collection url</div>',
    }
  }
  return { rows: [{ title: 'Vimeo Collection', iframeUrl }], errorHtml: null }
}
