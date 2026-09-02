import { describe, expect, it } from 'vitest'
import {
  formatMediaBytes,
  mediaDisplayName,
  mediaFilename,
  mediaIsImage,
  mediaUrl,
  userMediaKindLabel,
} from '../app/utils/dashboardMedia'

describe('dashboard media helpers', () => {
  it('reads names and urls from flat or nested docs', () => {
    expect(mediaDisplayName({ alt: 'Chapel flyer' })).toBe('Chapel flyer')
    expect(mediaFilename({ filename: 'flyer.pdf' })).toBe('flyer.pdf')
    expect(mediaFilename({ file: { filename: 'nested.png' } })).toBe('nested.png')
    expect(mediaUrl({ url: '/api/connect-pages-media/file/a.jpg' })).toBe('/api/connect-pages-media/file/a.jpg')
    expect(mediaUrl({ _normalizedUrl: '/api/connect-user-media/file/b.jpg' })).toBe('/api/connect-user-media/file/b.jpg')
  })

  it('detects images and formats size labels', () => {
    expect(mediaIsImage({ mimeType: 'image/png' })).toBe(true)
    expect(mediaIsImage({ filename: 'notes.pdf', mimeType: 'application/pdf' })).toBe(false)
    expect(formatMediaBytes(2048)).toBe('2.0 KB')
    expect(userMediaKindLabel('post-images')).toBe('Post images')
  })
})
