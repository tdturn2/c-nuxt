import { defineEventHandler, createError, readBody } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'

type SubmitBody = {
  formSlug?: string
  rootSubmissionId?: number
  answers?: Record<string, unknown>
}

export default defineEventHandler(async (event) => {
  const { email } = await getSSOSession(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - must be signed in' })
  }

  const body = (await readBody(event).catch(() => ({}))) as SubmitBody
  const formSlug = typeof body.formSlug === 'string' ? body.formSlug.trim() : ''
  if (!formSlug) {
    throw createError({ statusCode: 400, statusMessage: 'formSlug is required' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const payloadBody: Record<string, unknown> = {
    email,
    formSlug,
    answers: body.answers && typeof body.answers === 'object' ? body.answers : {},
  }
  if (typeof body.rootSubmissionId === 'number') payloadBody.rootSubmissionId = body.rootSubmissionId

  const res: any = await $fetch(`${payloadBaseUrl}/api/connect-form-submissions/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payloadBody,
  }).catch((err: any) => {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to submit form',
      data: err?.data,
    })
  })

  return res
})

