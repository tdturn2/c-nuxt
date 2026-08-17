import { defineEventHandler, createError, readBody } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'
import { sendFormEntryNotification } from '../../utils/sendgrid'
import {
  defaultFormNotificationSubject,
  normalizeFormEmailNotification,
  type FormEmailNotification,
} from '~/types/forms'

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
      const textBody = buildPlainTextSummary(formTitle, email, answers)
      await sendFormEntryNotification({
        formTitle,
        formSlug,
        notification,
        textBody,
        htmlBody: buildHtmlSummary(formTitle, email, answers),
        meta: { submitter: email, submissionId: res?.id ?? res?.doc?.id },
      }).catch((err) => {
        console.warn('[form-submit] notification send skipped/failed', err?.statusMessage || err?.message || err)
      })
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

function buildPlainTextSummary(
  formTitle: string,
  submitterEmail: string,
  answers: Record<string, unknown>,
): string {
  const lines = [
    defaultFormNotificationSubject(formTitle),
    '',
    `Form: ${formTitle}`,
    `Submitted by: ${submitterEmail}`,
    '',
    'Answers:',
  ]
  for (const [key, value] of Object.entries(answers)) {
    lines.push(`- ${key}: ${formatAnswerValue(value)}`)
  }
  return lines.join('\n')
}

function buildHtmlSummary(
  formTitle: string,
  submitterEmail: string,
  answers: Record<string, unknown>,
): string {
  const rows = Object.entries(answers)
    .map(
      ([key, value]) =>
        `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb;"><strong>${escapeHtml(key)}</strong></td><td style="padding:4px 8px;border:1px solid #e5e7eb;">${escapeHtml(formatAnswerValue(value))}</td></tr>`,
    )
    .join('')
  return `
    <h2>${escapeHtml(defaultFormNotificationSubject(formTitle))}</h2>
    <p><strong>Form:</strong> ${escapeHtml(formTitle)}<br/>
    <strong>Submitted by:</strong> ${escapeHtml(submitterEmail)}</p>
    <table style="border-collapse:collapse;font-size:14px;">${rows}</table>
  `.trim()
}

function formatAnswerValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
