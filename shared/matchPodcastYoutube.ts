/**
 * Match RSS podcast episodes to YouTube playlist items by same calendar day (US Eastern)
 * and title; if exactly one video dropped that day, use it (titles often differ slightly).
 */

export interface YoutubePlaylistItem {
  videoId: string
  title: string
  publishedAt: string
}

export interface EpisodeForYoutubeMatch {
  title: string
  pubDate?: string
}

/** US Eastern calendar date YYYY-MM-DD — aligns RSS (-0400) with YouTube (UTC ISO). */
function calendarDayEastern(isoOrRss: string): string {
  const d = new Date(isoOrRss)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  if (!y || !m || !day) return ''
  return `${y}-${m}-${day}`
}

function normalizeTitle(s: string): string {
  let t = s.toLowerCase().replace(/\s+/g, ' ').trim()
  t = t.replace(/[""]/g, '"').replace(/['']/g, "'")
  return t
}

/**
 * Returns YouTube video id when a same-day playlist item matches (or single video that day).
 */
export function matchYoutubeVideoId(
  ep: EpisodeForYoutubeMatch,
  items: YoutubePlaylistItem[]
): string | undefined {
  if (!items.length || !ep.pubDate) return undefined
  const day = calendarDayEastern(ep.pubDate)
  if (!day) return undefined

  const candidates = items.filter((it) => calendarDayEastern(it.publishedAt) === day)
  if (candidates.length === 0) return undefined

  // One video that release day → podcast is weekly/biweekly; safe default
  if (candidates.length === 1) return candidates[0].videoId

  const nt = normalizeTitle(ep.title || '')
  if (!nt) return undefined

  const exact = candidates.find((c) => normalizeTitle(c.title) === nt)
  if (exact) return exact.videoId

  const loose = candidates.find((c) => {
    const t = normalizeTitle(c.title)
    return t.includes(nt) || nt.includes(t)
  })
  return loose?.videoId
}
