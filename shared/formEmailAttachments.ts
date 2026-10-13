/** Leave room under SendGrid's 30MB message limit for the HTML body. */
export const FORM_NOTIFICATION_ATTACHMENT_BUDGET = 25 * 1024 * 1024

export type FormAttachmentCandidate = {
  filename: string
  bytes: number
}

export function partitionFormAttachments<T extends FormAttachmentCandidate>(
  files: T[],
  budget = FORM_NOTIFICATION_ATTACHMENT_BUDGET,
): { attached: T[]; omitted: T[] } {
  const attached: T[] = []
  const omitted: T[] = []
  let used = 0
  for (const file of files) {
    const size = Number.isFinite(file.bytes) && file.bytes > 0 ? file.bytes : 0
    if (size > 0 && used + size <= budget) {
      attached.push(file)
      used += size
    } else {
      omitted.push(file)
    }
  }
  return { attached, omitted }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function appendFormAttachmentSummary(
  message: { text: string; html: string },
  input: { attached: string[]; omitted: string[] },
): { text: string; html: string } {
  const attached = input.attached.map((name) => name.trim()).filter(Boolean)
  const omitted = input.omitted.map((name) => name.trim()).filter(Boolean)
  if (!attached.length && !omitted.length) return message

  const omittedLines = omitted.map((name) => (name.includes('(') ? name : `${name} (file is too large)`))
  const textLines = [
    ...(attached.length ? ['Attachments', ...attached] : []),
    ...(omittedLines.length ? ['Not attached', ...omittedLines] : []),
  ]
  const htmlLines = [
    ...attached.map((name) => escapeHtml(name)),
    ...omittedLines.map((name) => escapeHtml(name)),
  ]
  const block = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1f2937;margin-top:16px;"><strong>Attachments</strong><br>${htmlLines.join('<br>')}</div>`
  const html = message.html.includes('</body>')
    ? message.html.replace('</body>', `${block}</body>`)
    : `${message.html}${block}`

  return {
    text: `${message.text.trim()}\n\n${textLines.join('\n')}`.trim(),
    html,
  }
}
