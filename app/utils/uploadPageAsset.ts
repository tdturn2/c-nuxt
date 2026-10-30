import { $fetch } from 'ofetch'

export type UploadedPageAsset = {
  id?: unknown
  filename?: string
  url: string
}

/** Stay under the ~4.5 MB Vercel/Nitro request-body limit. Larger files PUT directly to S3. */
export const PROXY_UPLOAD_MAX_BYTES = 3 * 1024 * 1024
/** Keep in sync with connect-api PAGE_ASSET_MAX_BYTES. */
export const PAGE_ASSET_MAX_BYTES = 200 * 1024 * 1024

export function pageAssetUploadTransport(bytes: number): 'proxy' | 'direct' {
  return bytes > PROXY_UPLOAD_MAX_BYTES ? 'direct' : 'proxy'
}

async function uploadPageAssetDirect(file: File, alt: string): Promise<UploadedPageAsset> {
  const signed = await $fetch<{ uploadUrl?: string; filename?: string; contentType?: string }>(
    '/api/connect-pages-media/presign',
    {
      method: 'POST',
      body: {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        filesize: file.size,
        ...(alt ? { alt } : {}),
      },
    },
  )
  if (!signed?.uploadUrl || !signed?.filename) {
    throw new Error('Upload URL was not returned')
  }

  const contentType = signed.contentType || file.type || 'application/octet-stream'
  const putRes = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => '')
    throw new Error(
      detail
        ? `Storage upload failed (${putRes.status}): ${detail.slice(0, 200)}`
        : `Storage upload failed (${putRes.status})`,
    )
  }

  const completed = await $fetch<UploadedPageAsset>('/api/connect-pages-media/complete', {
    method: 'POST',
    body: {
      filename: signed.filename,
      originalFilename: file.name,
      contentType,
      ...(alt ? { alt } : {}),
    },
  })
  if (!completed?.url) throw new Error('Upload succeeded but no file URL was returned')
  return completed
}

/** Upload a page asset. Files over ~3 MB go straight to S3 so they are not cut off at 413. */
export async function uploadConnectPageAsset(file: File, alt = ''): Promise<UploadedPageAsset> {
  if (file.size > PAGE_ASSET_MAX_BYTES) {
    throw new Error('File is too large. Maximum upload size is 200 MB.')
  }
  const trimmedAlt = alt.trim()
  if (pageAssetUploadTransport(file.size) === 'direct') {
    return uploadPageAssetDirect(file, trimmedAlt)
  }

  const body = new FormData()
  body.append('file', file)
  if (trimmedAlt) body.append('alt', trimmedAlt)
  const uploaded = await $fetch<UploadedPageAsset>('/api/connect-pages-media/upload', {
    method: 'POST',
    body,
  })
  if (!uploaded?.url) throw new Error('Upload succeeded but no file URL was returned')
  return uploaded
}
