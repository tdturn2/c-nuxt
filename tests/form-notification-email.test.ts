import { describe, expect, it } from 'vitest'
import { applyFormMergeTags, buildFormResultsEmail, htmlToPlainText, labeledFormAnswers } from '../shared/formNotificationEmail'

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

  it('fills confirmation copy from field labels', () => {
    const fields = [
      { id: 'name-of-the-group', type: 'text', label: 'Name of the Group' },
      { id: 'arrival-date', type: 'date', label: 'Arrival Date' },
      { id: 'departure-date', type: 'date', label: 'Departure Date' },
      { id: 'number-of-rooms', type: 'text', label: 'Number of Rooms' },
    ]
    const answers = {
      'name-of-the-group': 'Wesley <Cohort>',
      'arrival-date': '2026-11-02',
      'departure-date': '2026-11-04',
      'number-of-rooms': '12',
    }
    const html = applyFormMergeTags(
      '<p>Group: {Name of the Group}<br />Arrival: {Arrival Date:11}<br />Departure: {Departure Date}<br /># Rooms: {Number of Rooms}</p>',
      answers,
      fields,
      { escapeHtml: true },
    )
    expect(html).toContain('Wesley &lt;Cohort&gt;')
    expect(html).toContain('Arrival: 2026-11-02')
    expect(html).toContain('Departure: 2026-11-04')
    expect(html).toContain('# Rooms: 12')
    expect(html).not.toContain('<Cohort>')
    expect(applyFormMergeTags('{Name of the Group} - Confirmation', answers, fields)).toBe(
      'Wesley <Cohort> - Confirmation',
    )
    expect(htmlToPlainText(html)).toContain('Group: Wesley <Cohort>')
    expect(
      applyFormMergeTags('New {form_title}: {Guest Name}', { 'guest-name': 'Ada' }, [
        { id: 'guest-name', label: 'Guest Name' },
      ], { formTitle: 'Room Reservation' }),
    ).toBe('New Room Reservation: Ada')
  })

  it('expands all fields inside a custom message', () => {
    const html = applyFormMergeTags(
      '<p>{Name of person filling out the form} has requested a Travel Waiver for {Name of Traveller}.</p><p>{all_fields}</p>',
      { name: 'Ada', Name: 'John Wesley' },
      [
        { id: 'name', type: 'text', label: 'Name of person filling out the form' },
        { id: 'Name', type: 'text', label: 'Name of Traveller' },
      ],
      { escapeHtml: true },
    )
    expect(html).toContain('Ada has requested a Travel Waiver for John Wesley.')
    expect(html).toContain('<strong>Name of Traveller</strong>: John Wesley')
  })
})