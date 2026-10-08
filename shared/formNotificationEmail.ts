import { formatStoredAnswer } from '../app/utils/forms/productFields'

export type FormAnswerField = {
  id?: string
  key?: string
  label?: string
  type?: string
  options?: Array<{ label?: string; value?: string }>
}

export type FormAnswerRow = {
  label: string
  value: string
}

export function formatFormSubmittedAt(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return ''
  return `${date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  })} ET`
}

export function labeledFormAnswers(
  answers: Record<string, unknown> | null | undefined,
  fields: FormAnswerField[] = [],
): FormAnswerRow[] {
  const source = answers && typeof answers === 'object' ? answers : {}
  const byKey = new Map<string, FormAnswerField>()
  for (const field of fields) {
    const key = String(field.id || field.key || '').trim()
    if (key) byKey.set(key, field)
  }

  const ordered = [
    ...fields.map((field) => String(field.id || field.key || '').trim()).filter(Boolean),
    ...Object.keys(source).filter((key) => !byKey.has(key)),
  ]

  const rows: FormAnswerRow[] = []
  const seen = new Set<string>()
  for (const key of ordered) {
    if (seen.has(key) || !(key in source)) continue
    seen.add(key)
    const field = byKey.get(key)
    const type = String(field?.type || '').toLowerCase()
    if (type === 'html' || type === 'section') continue
    const value = formatAnswerForEmail(source[key], field).trim()
    if (!value) continue
    rows.push({
      label: String(field?.label || '').trim() || humanizeKey(key),
      value,
    })
  }
  return rows
}

export function buildFormResultsEmail(input: {
  formTitle: string
  submitterEmail: string
  submittedAt?: string
  answers: FormAnswerRow[]
  resent?: boolean
}): { text: string; html: string } {
  const title = String(input.formTitle || 'Form').trim() || 'Form'
  const submitter = String(input.submitterEmail || '').trim() || 'Unknown'
  const when = String(input.submittedAt || '').trim()
  const answers = input.answers.length
    ? input.answers
    : [{ label: 'Answers', value: 'This submission has no answers.' }]

  const textLines = [
    'Asbury Connect',
    input.resent ? 'Form results (resent)' : 'Form results',
    '',
    title,
    `Submitted by: ${submitter}`,
    ...(when ? [`Submitted: ${when}`] : []),
    '',
    ...answers.flatMap((row) => [row.label, row.value, '']),
    input.resent
      ? 'Resent from the Asbury Connect dashboard.'
      : 'Sent from Asbury Connect.',
  ]

  const answerHtml = answers
    .map(
      (row) => `
        <tr>
          <td style="padding:14px 0;border-top:1px solid #e6edf0;">
            <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#5b7280;">${escapeHtml(row.label)}</div>
            <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f2937;margin-top:4px;white-space:pre-wrap;">${escapeHtml(row.value)}</div>
          </td>
        </tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#eef3f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f5;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #d7e2e8;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#0d5e82;padding:22px 28px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#d5e6ee;">Asbury Seminary</div>
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;color:#ffffff;margin-top:4px;">Connect</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px;">
                <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0d5e82;">${input.resent ? 'Form results · resent' : 'Form results'}</div>
                <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#12202a;margin:8px 0 14px;">${escapeHtml(title)}</h1>
                <p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#4b5563;margin:0 0 8px;">
                  Submitted by <strong style="color:#12202a;">${escapeHtml(submitter)}</strong>
                  ${when ? `<br>Submitted ${escapeHtml(when)}` : ''}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                  ${answerHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 22px;background:#f7fafb;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">
                ${input.resent ? 'Resent from the Asbury Connect dashboard.' : 'Sent from Asbury Connect.'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { text: textLines.join('\n').trim(), html }
}

function formatAnswerForEmail(value: unknown, field?: FormAnswerField): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    const lines = value
      .map((entry) => formatAnswerForEmail(entry, field))
      .map((entry) => entry.trim())
      .filter(Boolean)
    return lines.join('\n')
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const fileName = String(obj.filename || obj.originalName || '').trim()
    const url = String(obj.url || obj.href || '').trim()
    if (fileName || url) return [fileName, url].filter(Boolean).join('\n')
    const stored = formatStoredAnswer(value).trim()
    if (stored && !stored.startsWith('{') && !stored.startsWith('[')) return stored
    const lines = Object.entries(obj)
      .filter(([, entry]) => entry != null && entry !== '')
      .map(([key, entry]) => `${humanizeKey(key)}: ${formatAnswerForEmail(entry)}`)
    if (lines.length) return lines.join('\n')
  }
  const text = formatStoredAnswer(value).trim()
  if (!text) return ''
  const match = field?.options?.find((opt) => String(opt.value ?? '') === text)
  return String(match?.label || text)
}

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  if (!spaced) return 'Answer'
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
