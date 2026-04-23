import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { authenticateWithPayloadCMS } from '../../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../../utils/getUserIdFromEmail'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    const { token, email } = await authenticateWithPayloadCMS(event)
    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to upload media',
      })
    }

    const ownerId = await getUserIdFromEmail(email, payloadBaseUrl)
    const formData = await readMultipartFormData(event)
    const file = formData?.find((field) => field.name === 'file')
    const alt = formData?.find((field) => field.name === 'alt')?.data?.toString('utf-8')?.trim()

    if (!file?.data || file.data.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File is required',
      })
    }

    const outgoing = new FormData()
    const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' })
    outgoing.append('file', blob, file.filename || 'upload')
    outgoing.append('_payload', JSON.stringify({ owner: ownerId, alt: alt || undefined }))

    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`

    const uploadRes = await fetch(`${payloadBaseUrl}/api/connect-marketplace-media`, {
      method: 'POST',
      headers,
      body: outgoing,
    })
    const uploadJson = await uploadRes.json().catch(() => ({}))
    if (!uploadRes.ok) {
      throw createError({
        statusCode: uploadRes.status,
        statusMessage: uploadRes.statusText || 'Failed to upload marketplace media',
        data: uploadJson,
      })
    }

    const uploadedIdRaw = uploadJson?.id ?? uploadJson?.doc?.id
    const uploadedId = typeof uploadedIdRaw === 'string' ? parseInt(uploadedIdRaw, 10) : uploadedIdRaw
    if (!uploadedId || Number.isNaN(uploadedId)) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Upload succeeded but no media id returned',
      })
    }

    const url = uploadJson?.url
    const normalizedUrl =
      typeof url === 'string'
        ? url.startsWith('http')
          ? url
          : url.startsWith('/')
            ? `${payloadBaseUrl}${url}`
            : `${payloadBaseUrl}/${url}`
        : null

    return {
      id: uploadedId,
      url: normalizedUrl,
      alt: uploadJson?.alt || alt || '',
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to upload marketplace media',
      data: error.data,
    })
  }
})
