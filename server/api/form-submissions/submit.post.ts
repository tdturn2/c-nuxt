import { defineEventHandler, createError, readBody } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'
import { sendFormEntryNotification } from '../../utils/sendgrid'
import {
  normalizeFormEmailNotification,
  type FormEmailNotification,
} from '~/types/forms'
import {
  buildFormResultsEmail,
  formatFormSubmittedAt,
  labeledFormAnswers,
  type FormAnswerField,
} from '@shared/formNotificationEmail'

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
  try {
    const formDoc = await fetchFormDocBySlug(payloadBaseUrl, formSlug)
    const notification = resolveFormNotification(formDoc)
    if (notification?.enabled && notification.to) {
      const formTitle = String(formDoc?.title || formSlug)
      const fields = Array.isArray(formDoc?.schema?.fields) ? formDoc.schema.fields as FormAnswerField[] : []
      const message = buildFormResultsEmail({
        formTitle,
        submitterEmail: email,
        submittedAt: formatFormSubmittedAt(res?.createdAt ?? res?.doc?.createdAt),
        answers: labeledFormAnswers(answers, fields),
      })
      const sent = await sendFormEntryNotification({
        formTitle,
        formSlug,
        notification,
        textBody: message.text,
        htmlBody: message.html,
        meta: { submitter: email, submissionId: res?.id ?? res?.doc?.id },
      })
      if (!sent.sent) {
        console.warn('[form-submit] notification not sent', sent.reason, formSlug)
      }
    } else if (notification?.enabled) {
      console.warn('[form-submit] notification enabled but has no recipients', formSlug)
    }
  } catch (err: any) {
    console.warn('[form-submit] notification prep failed', err?.message || err)
  }

  return res
})

async function fetchFormDocBySlug(payloadBaseUrl: string, slug: string): Promise<any | null> {
  const url =
    `${payloadBaseUrl}/api/connect-forms` +
    `?where[slug][equals]=${encodeURIComponent(slug)}` +
    `&limit=1`
  const res: any = await $fetch(url).catch(() => null)
  return Array.isArray(res?.docs) ? res.docs[0] ?? null : null
}

function resolveFormNotification(formDoc: any): FormEmailNotification | null {
  if (!formDoc) return null
  const raw = formDoc.emailNotification ?? formDoc.schema?.emailNotification
  if (!raw) return null
  return normalizeFormEmailNotification(raw, formDoc.title || formDoc.slug || '')
}
