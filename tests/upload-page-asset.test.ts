import { describe, expect, it } from 'vitest'
import { PAGE_ASSET_MAX_BYTES, PROXY_UPLOAD_MAX_BYTES, pageAssetUploadTransport } from '../app/utils/uploadPageAsset'

describe('page asset upload transport', () => {
  it('sends a 6 MB file directly to storage', () => {
    const handbookBytes = Math.round(6.3 * 1024 * 1024)
    expect(handbookBytes).toBeGreaterThan(PROXY_UPLOAD_MAX_BYTES)
    expect(handbookBytes).toBeLessThan(PAGE_ASSET_MAX_BYTES)
    expect(pageAssetUploadTransport(handbookBytes)).toBe('direct')
  })

  it('keeps small files on the proxied upload', () => {
    expect(pageAssetUploadTransport(1024 * 1024)).toBe('proxy')
    expect(pageAssetUploadTransport(PROXY_UPLOAD_MAX_BYTES)).toBe('proxy')
  })
})
