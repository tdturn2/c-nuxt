import { describe, expect, it } from 'vitest'
import { mediaDisplayUrl, toBrowserMediaUrl } from '../shared/mediaUrls'

describe('toBrowserMediaUrl', () => {
  it('rewrites connect-api user media to the same-origin proxy', () => {
    expect(toBrowserMediaUrl('http://localhost:3003/api/connect-user-media/file/jeff.jpg')).toBe(
      '/api/connect-user-media/file/jeff.jpg',
    )
    expect(toBrowserMediaUrl('/api/media/file/legacy.png')).toBe('/api/connect-user-media/file/legacy.png')
  })

  it('adds a display width only for resizable media proxies', () => {
    expect(mediaDisplayUrl('http://localhost:3003/api/connect-pages-media/file/slide.jpg', 1400)).toBe(
      '/api/connect-pages-media/file/slide.jpg?w=1400',
    )
    expect(mediaDisplayUrl('/api/connect-user-media/file/avatar.png?x=1', 256)).toBe(
      '/api/connect-user-media/file/avatar.png?w=256',
    )
    expect(mediaDisplayUrl('https://example.com/photo.jpg', 256)).toBe('https://example.com/photo.jpg')
  })
})
