import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { authenticateWithConnectApi, getConnectApiProxyHeaders } from '../../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../../utils/getUserIdFromEmail'
import { resolveConnectApiUrl } from '../../../utils/connectApi'

function upstreamMessage(uploadJson: any, fallback: string): string {
  if (typeof uploadJson?.error === 'string' && uploadJson.error.trim()) return uploadJson.error
  if (typeof uploadJson?.message === 'string' && uploadJson.message.trim()) return uploadJson.message
  if (typeof uploadJson?.errors?.[0]?.message === 'string' && uploadJson.errors[0].message.trim()) {
    return uploadJson.errors[0].message
  }
  return fallback
}

export default defineEventHandler(async (event) => {
  const connectApiUrl = resolveConnectApiUrl()
  if (!connectApiUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }

  try {
    const auth = await authenticateWithConnectApi(event)
    const { email } = auth
    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to upload media',
      })
    }

    const formData = await readMultipartFormData(event)
    const file = formData?.find((field) => field.name === 'file')
    const alt = formData?.find((field) => field.name === 'alt')?.data?.toString('utf-8')?.trim()

    if (!file?.data || file.data.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File is required',
      })
    }

    const ownerId = await getUserIdFromEmail(email, connectApiUrl)
    const outgoing = new FormData()
    const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' })
    outgoing.append('file', blob, file.filename || 'upload')
    // SSO fallback: connect-api accepts a session email when no JWT is present.
    outgoing.append('email', email)
    outgoing.append(
      '_payload',
      JSON.stringify({ owner: ownerId, alt: alt || undefined, email }),
    )

    // Multipart must set its own boundary, so drop the JSON content type.
    const headers = getConnectApiProxyHeaders(event, auth)
    delete headers['Content-Type']

    const uploadRes = await fetch(`${connectApiUrl}/api/connect-marketplace-media`, {
      method: 'POST',
      headers,
      body: outgoing,
    })
    const uploadJson = await uploadRes.json().catch(() => ({}))
    if (!uploadRes.ok) {
      throw createError({
        statusCode: uploadRes.status,
        statusMessage: upstreamMessage(uploadJson, uploadRes.statusText || 'Failed to upload marketplace media'),
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
            ? `${connectApiUrl}${url}`
            : `${connectApiUrl}/${url}`
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
