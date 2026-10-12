/** Last path segment of a WordPress uploads URL, used as the connect-pages-media filename. */
export function wpUploadsFilename(path: string | null | undefined): string | null {
  const segment = String(path ?? '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .pop()
  if (!segment) return null

  let filename = segment
  try {
    filename = decodeURIComponent(segment)
  } catch {
    filename = segment
  }
  filename = filename.trim()
  if (!filename || filename === '.' || filename === '..') return null
  if (filename.includes('/') || filename.includes('\\') || filename.includes('\0')) return null
  return filename
}

export function wpUploadsMediaPath(path: string | null | undefined): string | null {
  const filename = wpUploadsFilename(path)
  if (!filename) return null
  return `/api/connect-pages-media/file/${encodeURIComponent(filename)}`
}
