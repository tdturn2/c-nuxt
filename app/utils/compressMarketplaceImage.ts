const MAX_EDGE = 2048
const JPEG_QUALITY = 0.82
const SKIP_UNDER_BYTES = 2_500_000

function isGif(file: File): boolean {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name)
}

function looksLikeImage(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|heic|heif|tiff?)$/i.test(file.name)
}

function jpegName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').trim() || 'photo'
  return `${base}.jpg`
}

/**
 * Shrink phone photos before upload. iOS usually hands the page a full-resolution
 * JPEG; this keeps the long edge at 2048px. If the browser cannot decode the file,
 * the original is uploaded and the server compresses it.
 */
export async function compressMarketplaceImage(file: File): Promise<File> {
  if (!looksLikeImage(file) || isGif(file) || typeof createImageBitmap !== 'function') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  try {
    const maxEdge = Math.max(bitmap.width, bitmap.height)
    const alreadySmall = file.type === 'image/jpeg' && file.size <= SKIP_UNDER_BYTES && maxEdge > 0 && maxEdge <= MAX_EDGE
    if (alreadySmall || maxEdge === 0) return file

    const scale = Math.min(1, MAX_EDGE / maxEdge)
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })
    if (!blob) return file
    if (scale === 1 && blob.size >= file.size) return file
    return new File([blob], jpegName(file.name), { type: 'image/jpeg', lastModified: file.lastModified })
  } finally {
    bitmap.close()
  }
}
