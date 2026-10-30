import type { YoutubePlaylistItem } from '@shared/matchPodcastYoutube'
import catalogJson from '../data/youtube-playlist-dates.json' with { type: 'json' }

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const PLAYER_CONCURRENCY = 6
const MAX_BROWSE_PAGES = 8

export interface PlaylistVideoRef {
  videoId: string
  title: string
}

export interface InnertubeConfig {
  apiKey: string
  clientVersion: string
}

export function parseInnertubeConfig(html: string): InnertubeConfig | null {
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1]
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1]
  if (!apiKey || !clientVersion) return null
  return { apiKey, clientVersion }
}

function readLockupTitle(vm: object): string {
  const content = (vm as {
    metadata?: { lockupMetadataViewModel?: { title?: { content?: unknown } } }
  }).metadata?.lockupMetadataViewModel?.title?.content
  return typeof content === 'string' ? content.trim() : ''
}

function walk(node: unknown, visit: (node: unknown) => void) {
  visit(node)
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  for (const child of Object.values(node as Record<string, unknown>)) walk(child, visit)
}

/** Video id + title from a playlist browse response. The row date is relative ("5 months ago"). */
export function parsePlaylistLockups(data: unknown): PlaylistVideoRef[] {
  const out: PlaylistVideoRef[] = []
  const seen = new Set<string>()
  walk(data, (node) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return
    const vm = (node as { lockupViewModel?: unknown }).lockupViewModel
    if (!vm || typeof vm !== 'object') return
    const videoId = (vm as { contentId?: unknown }).contentId
    if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId) || seen.has(videoId)) return
    seen.add(videoId)
    out.push({ videoId, title: readLockupTitle(vm) })
  })
  return out
}

export function continuationTokens(data: unknown): string[] {
  const tokens: string[] = []
  const seen = new Set<string>()
  walk(data, (node) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return
    const token = (node as { continuationCommand?: { token?: unknown } }).continuationCommand?.token
    if (typeof token !== 'string' || !token || seen.has(token)) return
    seen.add(token)
    tokens.push(token)
  })
  return tokens
}

/** Calendar timestamp from the player payload. Playlist rows do not include one. */
export function readPublishDate(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const date = (data as {
    microformat?: { playerMicroformatRenderer?: { publishDate?: unknown } }
  }).microformat?.playerMicroformatRenderer?.publishDate
  return typeof date === 'string' && date.trim() ? date.trim() : undefined
}

async function innertube(apiKey: string, path: 'browse' | 'player', body: unknown): Promise<unknown> {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/${path}?prettyPrint=false`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': BROWSER_UA,
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`YouTube ${path} failed (${res.status})`)
  return res.json()
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await fn(items[index]!)
    }
  }
  const workers = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

const playlistCatalog = catalogJson as Record<string, YoutubePlaylistItem[]>

export function catalogForPlaylist(playlistId: string): YoutubePlaylistItem[] {
  return playlistCatalog[playlistId] ?? []
}

/**
 * Keep saved dates for videos already seen. A live playlist list can add new ids;
 * only those need a publish-date lookup. Saved episodes stay even if that lookup fails.
 */
export function mergePlaylistDates(
  catalog: YoutubePlaylistItem[],
  refs: PlaylistVideoRef[],
  fresh: YoutubePlaylistItem[],
): YoutubePlaylistItem[] {
  const byId = new Map<string, YoutubePlaylistItem>()
  for (const item of catalog) byId.set(item.videoId, item)
  for (const item of fresh) byId.set(item.videoId, item)

  if (!refs.length) return [...byId.values()]

  const ordered: YoutubePlaylistItem[] = []
  const seen = new Set<string>()
  for (const ref of refs) {
    const known = byId.get(ref.videoId)
    if (!known) continue
    seen.add(ref.videoId)
    ordered.push({
      videoId: ref.videoId,
      title: ref.title || known.title,
      publishedAt: known.publishedAt,
    })
  }
  for (const item of catalog) {
    if (!seen.has(item.videoId)) ordered.push(item)
  }
  return ordered
}

async function listPlaylistRefs(playlistId: string): Promise<{ config: InnertubeConfig, refs: PlaylistVideoRef[] }> {
  const pageRes = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`, {
    headers: {
      Accept: 'text/html',
      'User-Agent': BROWSER_UA,
    },
  })
  if (!pageRes.ok) throw new Error(`YouTube playlist page failed (${pageRes.status})`)
  const config = parseInnertubeConfig(await pageRes.text())
  if (!config) throw new Error('YouTube playlist page did not include a client config')

  const context = {
    client: {
      clientName: 'WEB',
      clientVersion: config.clientVersion,
      hl: 'en',
      gl: 'US',
    },
  }

  const refs: PlaylistVideoRef[] = []
  const seen = new Set<string>()
  const seenTokens = new Set<string>()
  let payload: unknown = await innertube(config.apiKey, 'browse', {
    context,
    browseId: `VL${playlistId}`,
  })

  for (let page = 0; page < MAX_BROWSE_PAGES; page++) {
    for (const ref of parsePlaylistLockups(payload)) {
      if (seen.has(ref.videoId)) continue
      seen.add(ref.videoId)
      refs.push(ref)
    }
    // A short page is the whole playlist. The leftover token is not another page of videos.
    if (refs.length < 100) break
    const token = continuationTokens(payload).find((item) => !seenTokens.has(item))
    if (!token) break
    seenTokens.add(token)
    const next = await innertube(config.apiKey, 'browse', { context, continuation: token })
    if (parsePlaylistLockups(next).every((ref) => seen.has(ref.videoId))) break
    payload = next
  }

  if (!refs.length) throw new Error('YouTube playlist did not include any videos')
  return { config, refs }
}

async function publishDatesForNewVideos(
  config: InnertubeConfig,
  refs: PlaylistVideoRef[],
  defaultTitle: string,
): Promise<YoutubePlaylistItem[]> {
  const context = {
    client: {
      clientName: 'WEB',
      clientVersion: config.clientVersion,
      hl: 'en',
      gl: 'US',
    },
  }
  const dated = await mapPool(refs, PLAYER_CONCURRENCY, async (ref) => {
    try {
      const player = await innertube(config.apiKey, 'player', { context, videoId: ref.videoId })
      const publishedAt = readPublishDate(player)
      if (!publishedAt) return null
      return {
        videoId: ref.videoId,
        title: ref.title || defaultTitle,
        publishedAt,
      } satisfies YoutubePlaylistItem
    } catch {
      return null
    }
  })
  return dated.filter((item): item is YoutubePlaylistItem => item !== null)
}

/**
 * Saved publish dates for episodes already on the playlist, plus a short live check
 * for ids that are not saved yet. Past episodes do not call YouTube again.
 */
export async function fetchYoutubePlaylist(playlistId: string, defaultTitle: string): Promise<YoutubePlaylistItem[]> {
  const catalog = catalogForPlaylist(playlistId)
  try {
    const { config, refs } = await listPlaylistRefs(playlistId)
    const known = new Set(catalog.map((item) => item.videoId))
    const missing = refs.filter((ref) => !known.has(ref.videoId))
    const fresh = missing.length
      ? await publishDatesForNewVideos(config, missing, defaultTitle)
      : []
    const items = mergePlaylistDates(catalog, refs, fresh)
    if (!items.length) throw new Error('YouTube playlist videos did not include publish dates')
    return items
  } catch (err) {
    if (catalog.length) return catalog
    throw err
  }
}
