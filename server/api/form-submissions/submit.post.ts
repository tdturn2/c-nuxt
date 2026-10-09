import { defineEventHandler, createError, readBody } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'
import { sendFormEntryNotification } from '../../utils/sendgrid'
import {
  normalizeFormEmailNotification,
  normalizeFormEmailNotificationList,
  parseNotificationRecipients,
  type FormEmailNotification,
} from '~/types/forms'
import {
  COMMUNICATIONS_PRF_SLUG,
  communicationsPrfNotifyEmails,
} from '@shared/communicationsPrf'
import {
  applyFormMergeTags,
  buildFormResultsEmail,
  formatFormSubmittedAt,
  htmlToPlainText,
  labeledFormAnswers,
  type FormAnswerField,
} from '@shared/formNotificationEmail'
import { createCommunicationsTrelloCard } from '../../utils/trello'

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
  const formDoc = await fetchFormDocBySlug(payloadBaseUrl, formSlug).catch(() => null)
  try {
    const notifications = resolveFormNotifications(formDoc)
    const primary = notifications.find((item) => item.toType !== 'submitter')
    if (formSlug === COMMUNICATIONS_PRF_SLUG && primary) {
      const title = String(answers['project-title'] || '').trim()
      if (title) primary.subject = `Project request: ${title}`
      const merged = new Set([
        ...parseNotificationRecipients(primary.to),
        ...communicationsPrfNotifyEmails(answers, email).map((value) => value.toLowerCase()),
      ])
      primary.to = [...merged].join(', ')
      primary.enabled = true
    }
    const formTitle = String(formDoc?.title || formSlug)
    const fields = notificationFields(formDoc)
    const submittedAt = formatFormSubmittedAt(res?.createdAt ?? res?.doc?.createdAt)
    const mergeOptions = { formTitle }
    for (const notification of notifications) {
      const recipientTo = resolveNotificationRecipient(notification, email, answers, fields)
      if (!notification.enabled || !recipientTo) {
        if (notification.enabled) {
          console.warn('[form-submit] notification enabled but has no recipients', formSlug)
        }
        continue
      }
      notification.subject = applyFormMergeTags(notification.subject || '', answers, fields, mergeOptions)
      if (notification.fromName) {
        notification.fromName = applyFormMergeTags(notification.fromName, answers, fields, mergeOptions).trim()
      }
      if (notification.replyTo === 'submitter') notification.replyTo = email
      const message = notification.message
        ? {
            html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f2937;">${applyFormMergeTags(notification.message, answers, fields, { ...mergeOptions, escapeHtml: true })}</div>`,
            text: htmlToPlainText(applyFormMergeTags(notification.message, answers, fields, mergeOptions)),
          }
        : buildFormResultsEmail({
            formTitle,
            submitterEmail: email,
            submittedAt,
            answers: labeledFormAnswers(answers, fields),
          })
      const sent = await sendFormEntryNotification({
        formTitle,
        formSlug,
        notification: { ...notification, to: recipientTo },
        textBody: message.text,
        htmlBody: message.html,
        meta: { submitter: email, submissionId: res?.id ?? res?.doc?.id },
      })
      if (!sent.sent) {
        console.warn('[form-submit] notification not sent', sent.reason, formSlug)
      }
    }
  } catch (err: any) {
    console.warn('[form-submit] notification prep failed', err?.message || err)
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

function notificationFields(formDoc: any): FormAnswerField[] {
  const schema = formDoc?.schema
  if (Array.isArray(schema?.fields)) return schema.fields as FormAnswerField[]
  const gravity = schema?.['0']?.fields
  if (!Array.isArray(gravity)) return []
  return gravity
    .map((field: any) => ({
      id: String(field?.id ?? '').trim(),
      label: String(field?.label ?? '').trim(),
      type: String(field?.type ?? '').trim(),
    }))
    .filter((field: FormAnswerField) => field.id)
}

function resolveNotificationRecipient(
  notification: FormEmailNotification,
  submitterEmail: string,
  answers: Record<string, unknown>,
  fields: FormAnswerField[],
): string {
  if (notification.toType === 'submitter') return submitterEmail
  if (notification.toType === 'field') {
    const lookup = String(notification.toField || '').trim()
    if (!lookup) return ''
    return applyFormMergeTags(`{${lookup}}`, answers, fields).trim()
  }
  return String(notification.to || '').trim()
}

function resolveFormNotifications(formDoc: any): FormEmailNotification[] {
  if (!formDoc) return []
  const title = formDoc.title || formDoc.slug || ''
  const primary = formDoc.emailNotification ?? formDoc.schema?.emailNotification
  const extras = [
    ...normalizeFormEmailNotificationList(formDoc.emailNotifications, title),
    ...normalizeFormEmailNotificationList(formDoc.schema?.emailNotifications, title),
  ]
  return [
    ...(primary ? [normalizeFormEmailNotification(primary, title)] : []),
    ...extras,
  ]
}
