import type { YoutubePlaylistItem } from '@shared/matchPodcastYoutube'

const ATOM_BASE = 'https://www.youtube.com/feeds/videos.xml'

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
}

export function parsePlaylistAtom(xml: string, defaultTitle: string): YoutubePlaylistItem[] {
  const out: YoutubePlaylistItem[] = []
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g
  let m: RegExpExecArray | null
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1]
    const videoId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim()
    const titleRaw = block.match(/<title>([^<]*)<\/title>/)?.[1]
    const publishedAt = block.match(/<published>([^<]+)<\/published>/)?.[1]?.trim()
    if (!videoId || !publishedAt) continue
    const title = decodeXmlEntities((titleRaw || defaultTitle).trim()) || defaultTitle
    out.push({ videoId, title, publishedAt })
  }
  return out
}

/**
 * Public YouTube playlist Atom feed — no API key (same approach as WesWorld).
 */
export async function fetchYoutubePlaylistAtom(playlistId: string, defaultTitle: string): Promise<YoutubePlaylistItem[]> {
  const url = `${ATOM_BASE}?playlist_id=${encodeURIComponent(playlistId)}`
  const xml = await $fetch<string>(url, {
    headers: {
      Accept: 'application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; AsburyConnect/1.0; +https://asburyseminary.edu)',
    },
  })
  return parsePlaylistAtom(xml, defaultTitle)
}
