import {
  COMMUNICATIONS_PRF_SLUG,
  communicationsPrfNotifyEmails,
} from '@shared/communicationsPrf'
import { appendFormAttachmentSummary } from '@shared/formEmailAttachments'
import {
  applyFormMergeTags,
  buildFormResultsEmail,
  formatFormSubmittedAt,
  htmlToPlainText,
  labeledFormAnswers,
  type FormAnswerField,
} from '@shared/formNotificationEmail'
import {
  normalizeFormEmailNotification,
  normalizeFormEmailNotificationList,
  parseNotificationRecipients,
  type FormEmailNotification,
} from '~/types/forms'
import type { FormEmailFile } from './formSubmissionAttachments'
import { sendFormEntryNotification } from './sendgrid'

export async function deliverFormEntryNotifications(input: {
  formDoc: any
  formSlug: string
  answers: Record<string, unknown>
  submitterEmail: string
  submittedAt?: unknown
  submissionId?: unknown
  resent?: boolean
  toOverride?: string
  attachments?: FormEmailFile[]
  omittedAttachmentNames?: string[]
}) {
  const notifications = resolveFormNotifications(input.formDoc)
  const primary = notifications.find((item) => item.toType !== 'submitter')
  if (input.formSlug === COMMUNICATIONS_PRF_SLUG && primary && !input.resent) {
    const title = String(input.answers['project-title'] || '').trim()
    if (title) primary.subject = `Project request: ${title}`
    const merged = new Set([
      ...parseNotificationRecipients(primary.to),
      ...communicationsPrfNotifyEmails(input.answers, input.submitterEmail).map((value) => value.toLowerCase()),
    ])
    primary.to = [...merged].join(', ')
    primary.enabled = true
  }

  const formTitle = String(input.formDoc?.title || input.formSlug)
  const fields = notificationFields(input.formDoc)
  const submittedAt = formatFormSubmittedAt(input.submittedAt)
  const mergeOptions = { formTitle }
  const attachments = input.attachments || []
  const results = []

  for (const notification of notifications) {
    const recipientTo = input.toOverride
      ? input.toOverride
      : resolveNotificationRecipient(notification, input.submitterEmail, input.answers, fields)
    if (!input.toOverride && (!notification.enabled || !recipientTo)) {
      if (notification.enabled) {
        console.warn('[form-submit] notification enabled but has no recipients', input.formSlug)
      }
      continue
    }
    notification.subject = applyFormMergeTags(notification.subject || '', input.answers, fields, mergeOptions)
    if (notification.fromName) {
      notification.fromName = applyFormMergeTags(notification.fromName, input.answers, fields, mergeOptions).trim()
    }
    if (notification.replyTo === 'submitter') notification.replyTo = input.submitterEmail
    const message = appendFormAttachmentSummary(
      notification.message
        ? {
            html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f2937;">${applyFormMergeTags(notification.message, input.answers, fields, { ...mergeOptions, escapeHtml: true })}</div>`,
            text: htmlToPlainText(applyFormMergeTags(notification.message, input.answers, fields, mergeOptions)),
          }
        : buildFormResultsEmail({
            formTitle,
            submitterEmail: input.submitterEmail,
            submittedAt,
            answers: labeledFormAnswers(input.answers, fields),
            resent: input.resent,
          }),
      {
        attached: attachments.map((file) => file.filename),
        omitted: input.omittedAttachmentNames || [],
      },
    )
    const sent = await sendFormEntryNotification({
      formTitle,
      formSlug: input.formSlug,
      notification: { ...notification, to: recipientTo, ...(input.toOverride ? { enabled: true } : {}) },
      textBody: message.text,
      htmlBody: message.html,
      attachments,
      toOverride: input.toOverride,
      meta: { submitter: input.submitterEmail, submissionId: input.submissionId, resent: Boolean(input.resent) },
    })
    if (!sent.sent) {
      console.warn('[form-submit] notification not sent', sent.reason, input.formSlug)
    }
    results.push(sent)
  }
  return results
}

export function notificationFields(formDoc: any): FormAnswerField[] {
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
