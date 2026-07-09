export type ConnectVideoRow = {
  id: string
  title: string
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

export function buildConnectVideosCollectionHtml(rows: ConnectVideoRow[]): string {
  if (!rows.length) {
    return '<div class="connect-video-collection connect-video-collection--empty not-prose my-2 text-xs text-gray-500">@connect-videos: no valid items</div>'
  }

  const items = rows
    .map((row) => {
      const id = escapeHtml(row.id)
      const title = escapeHtml(row.title)
      return `<li class="connect-video-collection__item">
  <button
    type="button"
    class="connect-video-collection__row"
    data-connect-play-vimeo="${id}"
    data-connect-video-title="${title}"
  >
    <span class="connect-video-collection__play" aria-hidden="true">${PLAY_ICON_SVG}</span>
    <span class="connect-video-collection__title">${title}</span>
  </button>
</li>`
    })
    .join('')

  return `<section class="connect-video-collection not-prose my-4" aria-label="Video library">
  <ul class="connect-video-collection__list">${items}</ul>
</section>`
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
