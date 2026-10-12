import { describe, expect, it } from 'vitest'
import { wpUploadsFilename, wpUploadsMediaPath } from '../shared/wpUploadsRedirect'

describe('wp uploads redirect', () => {
  it('uses the file name from a flat uploads path', () => {
    expect(wpUploadsFilename('Proclaim-Map.pdf')).toBe('Proclaim-Map.pdf')
    expect(wpUploadsMediaPath('Proclaim-Map.pdf')).toBe('/api/connect-pages-media/file/Proclaim-Map.pdf')
  })

  it('uses the last segment when WordPress stored a dated folder', () => {
    expect(wpUploadsMediaPath('2024/10/Proclaim-Map.pdf')).toBe(
      '/api/connect-pages-media/file/Proclaim-Map.pdf',
    )
  })

  it('decodes the file name', () => {
    expect(wpUploadsFilename('ATS%20Map.pdf')).toBe('ATS Map.pdf')
    expect(wpUploadsMediaPath('ATS%20Map.pdf')).toBe('/api/connect-pages-media/file/ATS%20Map.pdf')
  })

  it('rejects an empty or parent path', () => {
    expect(wpUploadsMediaPath('')).toBeNull()
    expect(wpUploadsMediaPath('/')).toBeNull()
    expect(wpUploadsMediaPath('..')).toBeNull()
  })
})
