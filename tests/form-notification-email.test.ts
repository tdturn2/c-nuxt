import { describe, expect, it } from 'vitest'
import { buildFormResultsEmail, labeledFormAnswers } from '../shared/formNotificationEmail'

describe('form results email', () => {
  it('uses field labels and skips empty layout fields', () => {
    const rows = labeledFormAnswers(
      { name: 'Ada', campus: 'ky', notes: '', intro: '<p>hi</p>' },
      [
        { id: 'intro', type: 'html', label: 'Intro' },
        { id: 'name', type: 'text', label: 'Full name' },
        { id: 'campus', type: 'select', label: 'Campus', options: [{ label: 'Kentucky', value: 'ky' }] },
        { id: 'notes', type: 'textarea', label: 'Notes' },
      ],
    )
    expect(rows).toEqual([
      { label: 'Full name', value: 'Ada' },
      { label: 'Campus', value: 'Kentucky' },
    ])
  })

  it('brands the message and escapes answer text', () => {
    const email = buildFormResultsEmail({
      formTitle: 'Guest Form',
      submitterEmail: 'ada@asburyseminary.edu',
      submittedAt: 'Oct 8, 2026, 11:05 AM ET',
      answers: [{ label: 'Comment', value: '<script>alert(1)</script>' }],
      resent: true,
    })
    expect(email.html).toContain('https://connect.asburyseminary.edu/email/connect-logo.png')
    expect(email.html).not.toContain('cid:')
    expect(email.html).toContain('alt="Asbury Connect"')
    expect(email.html).toContain('#0d5e82')
    expect(email.html).not.toContain('Asbury Seminary')
    expect(email.html).toContain('Guest Form')
    expect(email.html).toContain('ada@asburyseminary.edu')
    expect(email.html).toContain('&lt;script&gt;')
    expect(email.html).not.toContain('<script>')
    expect(email.text).toContain('Resent from the Asbury Connect dashboard.')
  })
})