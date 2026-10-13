import { describe, expect, it } from 'vitest'
import {
  appendFormAttachmentSummary,
  FORM_NOTIFICATION_ATTACHMENT_BUDGET,
  partitionFormAttachments,
} from '../shared/formEmailAttachments'

describe('form email attachments', () => {
  it('keeps files that fit and leaves the rest off the message', () => {
    const budget = 10
    const { attached, omitted } = partitionFormAttachments(
      [
        { filename: 'a.pdf', bytes: 4 },
        { filename: 'b.pdf', bytes: 7 },
        { filename: 'c.pdf', bytes: 6 },
      ],
      budget,
    )
    expect(attached.map((file) => file.filename)).toEqual(['a.pdf', 'c.pdf'])
    expect(omitted.map((file) => file.filename)).toEqual(['b.pdf'])
    expect(FORM_NOTIFICATION_ATTACHMENT_BUDGET).toBeLessThan(30 * 1024 * 1024)
  })

  it('names attached files in the notification body', () => {
    const message = appendFormAttachmentSummary(
      { text: 'Results', html: '<html><body><p>Results</p></body></html>' },
      { attached: ['notes.pdf'], omitted: ['huge.zip'] },
    )
    expect(message.text).toContain('notes.pdf')
    expect(message.text).toContain('huge.zip (file is too large)')
    expect(message.html).toContain('notes.pdf')
    expect(message.html).toContain('</body>')
    expect(message.html.indexOf('notes.pdf')).toBeLessThan(message.html.indexOf('</body>'))
  })
})
