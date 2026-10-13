import { defineEventHandler, createError, readBody } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'
import { COMMUNICATIONS_PRF_SLUG } from '@shared/communicationsPrf'
import type { FormAnswerField } from '@shared/formNotificationEmail'
import { deliverFormEntryNotifications, notificationFields } from '../../utils/formEntryNotification'
import { createCommunicationsTrelloCard } from '../../utils/trello'

type SubmitBody = {
  formSlug?: string
  rootSubmissionId?: number
  answers?: Record<string, unknown>
  /** Wait until uploaded files exist, then send from /api/form-submissions/notify. */
  deferNotification?: boolean
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
    (config.connectApi || config.public.connectApi || '').trim() ||
    (import.meta.dev ? 'http://localhost:3003' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }

  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {}
  const payloadBody: Record<string, unknown> = {
    email,
    formSlug,
    answers,
  }
  if (typeof body.rootSubmissionId === 'number') payloadBody.rootSubmissionId = body.rootSubmissionId

  const res: any = await $fetch(`${payloadBaseUrl}/api/connect-form-submissions/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payloadBody,
  }).catch((err: any) => {
    const data = err?.data ?? err?.response?._data
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: data?.error || data?.message || err?.statusMessage || 'Failed to submit form',
      data,
    })
  })

  // Best-effort notification — never fail the submit if email sending fails/skips.
  // File fields upload after this response, so callers with files defer until /notify.
  const formDoc = await fetchFormDocBySlug(payloadBaseUrl, formSlug).catch(() => null)
  if (body.deferNotification !== true) {
    try {
      await deliverFormEntryNotifications({
        formDoc,
        formSlug,
        answers,
        submitterEmail: email,
        submittedAt: res?.createdAt ?? res?.doc?.createdAt,
        submissionId: res?.id ?? res?.doc?.id,
      })
    } catch (err: any) {
      console.warn('[form-submit] notification prep failed', err?.message || err)
    }
  }

  let trelloCardId: string | null = null
  let trelloCardUrl: string | null = null
  if (formSlug === COMMUNICATIONS_PRF_SLUG) {
    try {
      const fields = Array.isArray(formDoc?.schema?.fields) ? formDoc.schema.fields as FormAnswerField[] : []
      const card = await createCommunicationsTrelloCard({
        formSlug,
        answers,
        fields,
        submitterEmail: email,
      })
      trelloCardId = card?.id ?? null
      trelloCardUrl = card?.url ?? null
    } catch (err: any) {
      console.warn('[form-submit] trello card failed', err?.message || err)
    }
  }

  return { ...res, trelloCardId, trelloCardUrl }
})

async function fetchFormDocBySlug(payloadBaseUrl: string, slug: string): Promise<any | null> {
  const url =
    `${payloadBaseUrl}/api/connect-forms` +
    `?where[slug][equals]=${encodeURIComponent(slug)}` +
    `&limit=1`
  const res: any = await $fetch(url).catch(() => null)
  return Array.isArray(res?.docs) ? res.docs[0] ?? null : null
}

