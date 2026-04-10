import { createError } from 'h3'
import { fetchYoutubePlaylistAtom } from '../../utils/youtubePlaylistAtom'

/** WesWorld — matches YouTube playlist URL `list=PL-KmdD8ZVhX9MSAcl0xR1y7Kfgk5bfxat` */
const PLAYLIST_ID = 'PL-KmdD8ZVhX9MSAcl0xR1y7Kfgk5bfxat'

const CACHE_MAX_AGE = 24 * 60 * 60 // 24 hours

export default defineCachedEventHandler(
  async () => {
    try {
      const items = await fetchYoutubePlaylistAtom(PLAYLIST_ID, 'WesWorld')
      return { items, source: 'atom' as const }
    } catch (err: any) {
      console.error('YouTube WesWorld playlist Atom feed error:', err)
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
    name: 'youtube-wesworld-playlist',
    getKey: () => 'wesworld-atom',
  }
)
