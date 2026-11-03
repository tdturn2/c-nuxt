import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { compressMarketplaceUpload } from '../server/utils/compressMarketplaceImage'

async function jpeg(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 40, g: 90, b: 140 } },
  })
    .jpeg()
    .toBuffer()
}

describe('marketplace upload compression', () => {
  it('shrinks a phone-sized photo to a 2048px jpeg', async () => {
    const data = await jpeg(4032, 3024)
    const result = await compressMarketplaceUpload({
      data,
      filename: 'IMG_2043.HEIC',
      mimeType: 'image/jpeg',
    })

    const meta = await sharp(result.data).metadata()
    expect(result.mimeType).toBe('image/jpeg')
    expect(result.filename).toBe('IMG_2043.jpg')
    expect(meta.width).toBeLessThanOrEqual(2048)
    expect(meta.height).toBeLessThanOrEqual(2048)
    expect(Math.max(meta.width || 0, meta.height || 0)).toBe(2048)
  })

  it('leaves a photo that already fits unchanged', async () => {
    const data = await jpeg(800, 600)
    const result = await compressMarketplaceUpload({
      data,
      filename: 'chair.jpg',
      mimeType: 'image/jpeg',
    })
    expect(result.data).toBe(data)
    expect(result.filename).toBe('chair.jpg')
  })
})
