import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'

export default defineEventHandler(async (event) => {
  const { email } = await getSSOSession(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - must be signed in' })
  }

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Missing multipart form data' })
  }

  const getValue = (name: string) => parts.find((p) => p.name === name && 'data' in p)?.data?.toString?.() ?? ''
  const filePart = parts.find((p) => p.name === 'file' && (p as any).data && (p as any).filename) as any

  const formSlug = String(getValue('formSlug') || '').trim()
  const submissionId = String(getValue('submissionId') || '').trim()
  const fieldKey = String(getValue('fieldKey') || '').trim()

  if (!formSlug) throw createError({ statusCode: 400, statusMessage: 'formSlug is required' })
  if (!submissionId) throw createError({ statusCode: 400, statusMessage: 'submissionId is required' })
  if (!fieldKey) throw createError({ statusCode: 400, statusMessage: 'fieldKey is required' })
  if (!filePart) throw createError({ statusCode: 400, statusMessage: 'file is required' })

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const fd = new FormData()
  fd.set('email', email)
  fd.set('formSlug', formSlug)
  fd.set('submissionId', submissionId)
  fd.set('fieldKey', fieldKey)

  const filename = String(filePart.filename || 'upload')
  const type = typeof filePart.type === 'string' ? filePart.type : 'application/octet-stream'
  const blob = new Blob([filePart.data], { type })
  fd.set('file', blob, filename)

  const res: any = await $fetch(`${payloadBaseUrl}/api/connect-form-uploads/upload`, {
    method: 'POST',
    body: fd as any,
  }).catch((err: any) => {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to upload file',
      data: err?.data,
    })
  })

  return res
})

