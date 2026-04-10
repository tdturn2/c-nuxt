import { createError } from 'h3'
import { fetchYoutubePlaylistAtom } from '../../utils/youtubePlaylistAtom'

/** It's Elementary — matches YouTube playlist URL `list=PL-KmdD8ZVhX--hb2y5Ki5aiJaa7w6MWGU` */
const PLAYLIST_ID = 'PL-KmdD8ZVhX--hb2y5Ki5aiJaa7w6MWGU'

const CACHE_MAX_AGE = 24 * 60 * 60 // 24 hours

export default defineCachedEventHandler(
  async () => {
    try {
      const items = await fetchYoutubePlaylistAtom(PLAYLIST_ID, "It's Elementary")
      return { items, source: 'atom' as const }
    } catch (err: any) {
      console.error("YouTube It's Elementary playlist Atom feed error:", err)
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
    name: 'youtube-elementary-playlist',
    getKey: () => 'elementary-atom',
  }
)
