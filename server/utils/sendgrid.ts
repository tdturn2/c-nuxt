import { createError } from 'h3'
import {
  FORM_NOTIFICATION_FROM,
  normalizeFormEmailNotification,
  parseNotificationRecipients,
  type FormEmailNotification,
} from '~/types/forms'

export type SendFormNotificationInput = {
  formTitle?: string
  formSlug?: string
  notification?: FormEmailNotification | null
  /** Plain-text and/or HTML body pieces for the new entry. */
  textBody?: string
  htmlBody?: string
  /** Extra context for logs / future Personalizations. */
  meta?: Record<string, unknown>
}

export type SendFormNotificationResult =
  | { sent: false; reason: string }
  | { sent: true; statusCode: number }

/**
 * Sends a form entry notification via SendGrid Mail Send API.
 * No-ops when API key is missing or notification is disabled / has no recipients.
 * Does not throw for config/skip cases — callers should treat as best-effort.
 */
export async function sendFormEntryNotification(
  input: SendFormNotificationInput,
): Promise<SendFormNotificationResult> {
  const config = useRuntimeConfig()
  const apiKey = String(config.sendgridApiKey || '').trim()
  if (!apiKey) {
    return { sent: false, reason: 'SENDGRID_API_KEY not configured' }
  }

  const fallbackTitle = input.formTitle || input.formSlug || 'Form'
  const notification = normalizeFormEmailNotification(input.notification, fallbackTitle)
  if (!notification.enabled) {
    return { sent: false, reason: 'notification disabled' }
  }

  const recipients = parseNotificationRecipients(notification.to)
  if (!recipients.length) {
    return { sent: false, reason: 'no valid recipients' }
  }

  const subject =
    (notification.subject || '').trim() || `New Entry: ${fallbackTitle}`
  const from = FORM_NOTIFICATION_FROM
  const text =
    (input.textBody || '').trim() ||
    `A new entry was submitted for "${fallbackTitle}".`
  const html =
    (input.htmlBody || '').trim() ||
    `<p>A new entry was submitted for <strong>${escapeHtml(fallbackTitle)}</strong>.</p>`

  // SendGrid v3 Mail Send — https://docs.sendgrid.com/api-reference/mail-send/mail-send
  const payload = {
    personalizations: [
      {
        to: recipients.map((email) => ({ email })),
      },
    ],
    from: { email: from, name: 'Asbury Connect Forms' },
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html', value: html },
    ],
  }

  try {
    const res = await $fetch.raw('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: payload,
    })
    return { sent: true, statusCode: res.status || 202 }
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.response?.status || 502
    const message =
      err?.data?.errors?.[0]?.message ||
      err?.statusMessage ||
      err?.message ||
      'SendGrid request failed'
    console.error('[sendgrid] form notification failed', {
      statusCode,
      message,
      formSlug: input.formSlug,
      meta: input.meta,
    })
    throw createError({
      statusCode,
      statusMessage: `SendGrid notification failed: ${message}`,
      data: err?.data,
    })
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
