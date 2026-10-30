import { describe, expect, it } from 'vitest'
import { matchYoutubeVideoId } from '../shared/matchPodcastYoutube'
import {
  continuationTokens,
  parseInnertubeConfig,
  parsePlaylistLockups,
  readPublishDate,
} from '../server/utils/youtubePlaylist'

describe('parsePlaylistLockups', () => {
  it('reads video ids and titles from playlist lockups', () => {
    const data = {
      contents: {
        lockupViewModel: {
          contentId: 'XXEZ5zSStuw',
          metadata: {
            lockupMetadataViewModel: {
              title: { content: 'Are We Worse Than the Devil? | WesWorld Podcast Ep. 11' },
            },
          },
        },
      },
    }
    expect(parsePlaylistLockups(data)).toEqual([
      {
        videoId: 'XXEZ5zSStuw',
        title: 'Are We Worse Than the Devil? | WesWorld Podcast Ep. 11',
      },
    ])
  })

  it('ignores a repeated video id', () => {
    const lockup = { lockupViewModel: { contentId: 'XXEZ5zSStuw', metadata: {} } }
    expect(parsePlaylistLockups({ a: lockup, b: lockup })).toHaveLength(1)
  })
})

describe('readPublishDate', () => {
  it('reads the player publish timestamp', () => {
    expect(readPublishDate({
      microformat: { playerMicroformatRenderer: { publishDate: '2026-05-26T06:30:20-07:00' } },
    })).toBe('2026-05-26T06:30:20-07:00')
  })
})

describe('parseInnertubeConfig', () => {
  it('reads the key and client version embedded in the playlist page', () => {
    const html = '"INNERTUBE_API_KEY":"test-key","INNERTUBE_CLIENT_VERSION":"2.20261029.01.00"'
    expect(parseInnertubeConfig(html)).toEqual({
      apiKey: 'test-key',
      clientVersion: '2.20261029.01.00',
    })
  })
})

describe('continuationTokens', () => {
  it('collects browse continuation tokens once', () => {
    const token = { continuationCommand: { token: 'abc' } }
    expect(continuationTokens({ a: token, b: token, c: { continuationCommand: { token: 'def' } } })).toEqual(['abc', 'def'])
  })
})

describe('matchYoutubeVideoId', () => {
  const items = [
    { videoId: 'same-day-id', title: 'Ep 11', publishedAt: '2026-05-26T06:30:20-07:00' },
    { videoId: 'next-day-id', title: "We're Back", publishedAt: '2025-11-18T13:11:05-08:00' },
  ]

  it('matches the RSS pubDate to the same Eastern day', () => {
    expect(matchYoutubeVideoId(
      { title: 'Ep 11', pubDate: 'Tue, 26 May 2026 06:30:00 -0400' },
      items,
    )).toBe('same-day-id')
  })

  it('uses the next Eastern day when that day has one video', () => {
    expect(matchYoutubeVideoId(
      { title: "We're Back", pubDate: 'Mon, 17 Nov 2025 12:00:00 -0500' },
      items,
    )).toBe('next-day-id')
  })

  it('does not guess when two videos fall on the next day', () => {
    expect(matchYoutubeVideoId(
      { title: 'Other', pubDate: 'Mon, 17 Nov 2025 12:00:00 -0500' },
      [
        ...items,
        { videoId: 'also-next', title: 'Other', publishedAt: '2025-11-18T18:00:00-05:00' },
      ],
    )).toBeUndefined()
  })
})
