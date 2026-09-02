import { describe, expect, it } from 'vitest'
import { toBrowserMediaUrl } from '../shared/mediaUrls'

describe('toBrowserMediaUrl', () => {
  it('rewrites connect-api user media to the same-origin proxy', () => {
    expect(toBrowserMediaUrl('http://localhost:3003/api/connect-user-media/file/jeff.jpg')).toBe(
      '/api/connect-user-media/file/jeff.jpg',
    )
    expect(toBrowserMediaUrl('/api/media/file/legacy.png')).toBe('/api/connect-user-media/file/legacy.png')
  })
})
