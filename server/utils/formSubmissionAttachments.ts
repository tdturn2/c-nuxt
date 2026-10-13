import {
  FORM_NOTIFICATION_ATTACHMENT_BUDGET,
  partitionFormAttachments,
  type FormAttachmentCandidate,
} from '@shared/formEmailAttachments'

export type FormEmailFile = {
  filename: string
  mimeType: string
  content: string
}

type UploadDoc = {
  id?: number | string
  filename?: string | null
  mimeType?: string | null
  filesize?: number | null
}

export async function loadFormEmailAttachments(input: {
  payloadBaseUrl: string
  submissionId: string | number
  email?: string
  headers?: Record<string, string>
}): Promise<{ files: FormEmailFile[]; omitted: string[] }> {
  const base = input.payloadBaseUrl.replace(/\/$/, '')
  const params = new URLSearchParams({ submissionId: String(input.submissionId) })
  if (input.email) params.set('email', input.email)
  const headers = input.headers || {}
  const list = await $fetch<{ docs?: UploadDoc[] }>(`${base}/api/connect-form-uploads?${params.toString()}`, {
    headers,
  }).catch(() => null)
  const docs = Array.isArray(list?.docs) ? list.docs : []
  const candidates: Array<FormAttachmentCandidate & { id: string; mimeType: string }> = []
  for (const doc of docs) {
    const id = String(doc?.id ?? '').trim()
    if (!id) continue
    const listed = typeof doc.filesize === 'number' ? doc.filesize : Number(doc.filesize)
    candidates.push({
      id,
      filename: String(doc?.filename || '').trim() || 'attachment',
      bytes: Number.isFinite(listed) && listed > 0 ? listed : 0,
      mimeType: String(doc.mimeType || 'application/octet-stream'),
    })
  }

  const known = candidates.filter((file) => file.bytes > 0)
  const { omitted } = partitionFormAttachments(known)
  const omittedIds = new Set(omitted.map((file) => file.id))
  const files: FormEmailFile[] = []
  const omittedNames = omitted.map((file) => file.filename)
  let used = 0

  for (const file of candidates) {
    if (omittedIds.has(file.id)) continue
    const fileParams = new URLSearchParams()
    if (input.email) fileParams.set('email', input.email)
    const query = fileParams.toString()
    const res = await fetch(`${base}/api/connect-form-uploads/file/${encodeURIComponent(file.id)}${query ? `?${query}` : ''}`, {
      headers,
    }).catch(() => null)
    if (!res?.ok) {
      omittedNames.push(`${file.filename} (could not be loaded)`)
      continue
    }
    const bytes = Buffer.from(await res.arrayBuffer())
    if (!bytes.length) continue
    if (used + bytes.length > FORM_NOTIFICATION_ATTACHMENT_BUDGET) {
      omittedNames.push(file.filename)
      continue
    }
    used += bytes.length
    files.push({
      filename: file.filename,
      mimeType: res.headers.get('content-type') || file.mimeType,
      content: bytes.toString('base64'),
    })
  }
  return { files, omitted: omittedNames }
}
