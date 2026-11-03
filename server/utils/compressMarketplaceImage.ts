import sharp from 'sharp'

const MAX_EDGE = 2048
const SKIP_UNDER_BYTES = 2_500_000

export type MarketplaceUploadFile = {
  data: Buffer
  filename: string
  mimeType: string
}

function jpegName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').trim() || 'photo'
  return `${base}.jpg`
}

function looksLikeImage(file: MarketplaceUploadFile): boolean {
  if (/^image\//i.test(file.mimeType) && file.mimeType !== 'image/gif') return true
  return /\.(jpe?g|png|webp|heic|heif|tiff?)$/i.test(file.filename)
}

/** Resize marketplace photos to a 2048px long edge. Leave the original if it already fits or cannot be decoded. */
export async function compressMarketplaceUpload(file: MarketplaceUploadFile): Promise<MarketplaceUploadFile> {
  if (!looksLikeImage(file) || file.data.length === 0) return file

  try {
    const source = sharp(file.data, { failOn: 'none', limitInputPixels: 40_000_000 })
    const meta = await source.metadata()
    const maxEdge = Math.max(meta.width || 0, meta.height || 0)
    const format = meta.format || ''
    const alreadyFits =
      (format === 'jpeg' || format === 'webp') &&
      maxEdge > 0 &&
      maxEdge <= MAX_EDGE &&
      file.data.length <= SKIP_UNDER_BYTES
    if (alreadyFits) return file

    const output = await sharp(file.data, { failOn: 'none', limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()

    if (output.length >= file.data.length && (format === 'jpeg' || format === 'jpg') && maxEdge <= MAX_EDGE) {
      return file
    }

    return {
      data: output,
      filename: jpegName(file.filename),
      mimeType: 'image/jpeg',
    }
  } catch {
    return file
  }
}
