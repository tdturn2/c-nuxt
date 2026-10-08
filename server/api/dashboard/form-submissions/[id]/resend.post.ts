import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { parseNotificationRecipients, type FormEmailNotification } from '~/types/forms'
import {
  buildFormResultsEmail,
  formatFormSubmittedAt,
  labeledFormAnswers,
  type FormAnswerField,
} from '@shared/formNotificationEmail'
import { sendFormEntryNotification } from '../../../../utils/sendgrid'
import { getDashboardPayloadHeaders, requireDashboardStaff, toProxyError } from '../../../../utils/dashboardForms'

type ResendBody = {
  to?: string
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event, { section: 'form-results' })
  const id = String(getRouterParam(event, 'id') || '').trim()
  if (!/^\d+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'A submission id is required' })
  }

  const body = (await readBody(event).catch(() => ({}))) as ResendBody
  const toOverride = typeof body.to === 'string' ? body.to.trim() : ''
  const recipients = parseNotificationRecipients(toOverride)
  if (!recipients.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Enter at least one valid email address',
    })
  }

  const headers = getDashboardPayloadHeaders(event, auth, { Accept: 'application/json' })
  const params = new URLSearchParams()
  params.set('limit', '1')
  params.set('where[id][equals]', id)

  const list: any = await $fetch(
    `${auth.payloadBaseUrl}/api/connect-form-submissions?${params.toString()}`,
    { headers },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to load form submission')
  })

  const submission = Array.isArray(list?.docs) ? list.docs[0] : null
  if (!submission) {
    throw createError({ statusCode: 404, statusMessage: 'Submission not found' })
  }

  const formSlug = String(submission.formSlug || submission.form?.slug || '').trim()
  const formDoc = formSlug ? await fetchFormDoc(auth.payloadBaseUrl, formSlug, headers) : null
  const formTitle = String(formDoc?.title || submission.form?.title || formSlug || 'Form')
  const fields = Array.isArray(formDoc?.schema?.fields) ? formDoc.schema.fields as FormAnswerField[] : []
  const answers = submission.answers && typeof submission.answers === 'object'
    ? submission.answers as Record<string, unknown>
    : {}
  const email = buildFormResultsEmail({
    formTitle,
    submitterEmail: String(submission.email || ''),
    submittedAt: formatFormSubmittedAt(submission.createdAt),
    answers: labeledFormAnswers(answers, fields),
    resent: true,
  })

  const notification = resolveNotification(formDoc)
  const sent = await sendFormEntryNotification({
    formTitle,
    formSlug,
    notification,
    toOverride,
    textBody: email.text,
    htmlBody: email.html,
    meta: { resend: true, submissionId: id, actor: auth.email },
  })

  if (!sent.sent) {
    throw createError({
      statusCode: sent.reason.includes('SENDGRID') ? 503 : 400,
      statusMessage: sent.reason === 'SENDGRID_API_KEY not configured'
        ? 'Email is not configured on this server'
        : 'Could not send form results',
    })
  }

  return { ok: true, sentTo: recipients }
})

async function fetchFormDoc(payloadBaseUrl: string, slug: string, headers: Record<string, string>) {
  const url =
    `${payloadBaseUrl}/api/connect-forms` +
    `?where[slug][equals]=${encodeURIComponent(slug)}` +
    '&limit=1&depth=0'
  const res: any = await $fetch(url, { headers }).catch(() => null)
  return Array.isArray(res?.docs) ? res.docs[0] ?? null : null
}

function resolveNotification(formDoc: any): FormEmailNotification {
  const raw = formDoc?.emailNotification ?? formDoc?.schema?.emailNotification
  const src = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  return {
    enabled: true,
    to: typeof src.to === 'string' ? src.to : '',
    subject: typeof src.subject === 'string' ? src.subject : '',
  }
}
