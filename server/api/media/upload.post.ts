import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    const { token, email } = await authenticateWithPayloadCMS(event)

    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to upload media'
      })
    }

    const formData = await readMultipartFormData(event)
    const file = formData?.find(field => field.name === 'file')

    if (!file || !file.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File is required'
      })
    }

    const formDataToSend = new FormData()
    const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' })
    formDataToSend.append('file', blob, file.filename || 'upload')

    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const mediaResponse = await $fetch(`${payloadBaseUrl}/api/media`, {
      method: 'POST',
      headers,
      body: formDataToSend
    }) as { id: number; url: string }

    if (mediaResponse?.url && !mediaResponse.url.startsWith('http')) {
      mediaResponse.url = mediaResponse.url.startsWith('/')
        ? `${payloadBaseUrl}${mediaResponse.url}`
        : `${payloadBaseUrl}/${mediaResponse.url}`
    }

    return mediaResponse
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to upload media',
      data: error.data
    })
  }
})

