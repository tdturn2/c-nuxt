import { createError } from 'h3'
import { fetchYoutubePlaylist } from '../../utils/youtubePlaylist'

/** It's Elementary — matches YouTube playlist URL `list=PL-KmdD8ZVhX--hb2y5Ki5aiJaa7w6MWGU` */
const PLAYLIST_ID = 'PL-KmdD8ZVhX--hb2y5Ki5aiJaa7w6MWGU'

const CACHE_MAX_AGE = 24 * 60 * 60 // 24 hours
const STALE_MAX_AGE = 7 * 24 * 60 * 60 // keep the last good list through a YouTube outage

export default defineCachedEventHandler(
  async () => {
    try {
      const items = await fetchYoutubePlaylist(PLAYLIST_ID, "It's Elementary")
      return { items, source: 'playlist' as const }
    } catch (err: any) {
      console.error("YouTube It's Elementary playlist error:", err)
      const status = err?.response?.status ?? err?.statusCode ?? 502
      const msg = err?.message || 'Failed to load YouTube playlist feed'
      throw createError({
        statusCode: typeof status === 'number' ? status : 502,
        statusMessage: msg,
        data: err?.data,
      })
    }
  },
  {
    maxAge: CACHE_MAX_AGE,
    swr: true,
    staleMaxAge: STALE_MAX_AGE,
    name: 'youtube-elementary-playlist',
    getKey: () => 'elementary-playlist',
  }
)
