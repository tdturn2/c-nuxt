/**
 * Match RSS podcast episodes to YouTube playlist items by calendar day (US Eastern).
 * Same day wins. If that day is empty and exactly one video was published the next
 * Eastern day, use it. Multiple videos on a day fall back to the episode title.
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

function shiftEasternDay(day: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return ''
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + delta))
  return utc.toISOString().slice(0, 10)
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
  if (candidates.length === 0) {
    // YouTube sometimes publishes the next Eastern day (episode 1 of both shows).
    const nextDay = shiftEasternDay(day, 1)
    const next = nextDay
      ? items.filter((it) => calendarDayEastern(it.publishedAt) === nextDay)
      : []
    if (next.length === 1) return next[0].videoId
    return undefined
  }

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
