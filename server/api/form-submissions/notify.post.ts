import { createError, defineEventHandler, readBody } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'
import { resolveConnectApiUrl } from '../../utils/connectApi'
import { deliverFormEntryNotifications } from '../../utils/formEntryNotification'
import { loadFormEmailAttachments } from '../../utils/formSubmissionAttachments'

type NotifyBody = {
  formSlug?: string
  submissionId?: number | string
}

export default defineEventHandler(async (event) => {
  const { email } = await getSSOSession(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - must be signed in' })
  }

  const body = (await readBody(event).catch(() => ({}))) as NotifyBody
  const formSlug = typeof body.formSlug === 'string' ? body.formSlug.trim() : ''
  const submissionId = String(body.submissionId ?? '').trim()
  if (!formSlug) throw createError({ statusCode: 400, statusMessage: 'formSlug is required' })
  if (!/^\d+$/.test(submissionId)) {
    throw createError({ statusCode: 400, statusMessage: 'submissionId is required' })
  }

  const payloadBaseUrl = resolveConnectApiUrl()
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }

  const submission: any = await $fetch(
    `${payloadBaseUrl}/api/connect-form-submissions/${encodeURIComponent(submissionId)}?email=${encodeURIComponent(email)}`,
  ).catch((err: any) => {
    const statusCode = err?.statusCode || err?.response?.status || 502
    throw createError({
      statusCode,
      statusMessage: err?.data?.error || err?.statusMessage || 'Failed to load submission',
    })
  })
  if (!submission?.id) throw createError({ statusCode: 404, statusMessage: 'Submission not found' })
  const owner = String(submission.email || '').trim().toLowerCase()
  if (owner && owner !== email.trim().toLowerCase()) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  if (String(submission.formSlug || submission.form?.slug || '').trim() !== formSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Submission does not match this form' })
  }

  const formDoc = await fetchFormDocBySlug(payloadBaseUrl, formSlug)
  const answers = submission.answers && typeof submission.answers === 'object'
    ? submission.answers as Record<string, unknown>
    : {}
  const { files, omitted } = await loadFormEmailAttachments({
    payloadBaseUrl,
    submissionId,
    email,
  })

  try {
    await deliverFormEntryNotifications({
      formDoc,
      formSlug,
      answers,
      submitterEmail: email,
      submittedAt: submission.createdAt,
      submissionId,
      attachments: files,
      omittedAttachmentNames: omitted,
    })
  } catch (err: any) {
    console.warn('[form-notify] notification failed', err?.message || err)
  }

  return { ok: true, attachments: files.length, omitted }
})

async function fetchFormDocBySlug(payloadBaseUrl: string, slug: string): Promise<any | null> {
  const url =
    `${payloadBaseUrl}/api/connect-forms` +
    `?where[slug][equals]=${encodeURIComponent(slug)}` +
    `&limit=1`
  const res: any = await $fetch(url).catch(() => null)
  return Array.isArray(res?.docs) ? res.docs[0] ?? null : null
}
