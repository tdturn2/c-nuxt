import { describe, expect, it } from 'vitest'
import { validateFormSchemaV1 } from '../app/utils/forms/validation'
import { visibilityForFields } from '../app/utils/forms/visibility'
import {
  communicationsPrfNotifyEmails,
  communicationsPrfSchema,
  communicationsPrfTrelloCard,
  parseTrelloMemberIds,
} from '../shared/communicationsPrf'

const ids = communicationsPrfSchema.fields.map((field) => field.id)

function visible(answers: Record<string, unknown>) {
  return visibilityForFields(ids, communicationsPrfSchema.rules, answers)
}

describe('communications project request form', () => {
  it('is a valid form schema', () => {
    const result = validateFormSchemaV1(communicationsPrfSchema)
    expect(result.valid).toBe(true)
    expect(result.schema?.confirmationMessage).toContain('Trello')
    expect(result.schema?.fields.find((field) => field.id === 'event-calendars')?.defaultValue).toBe('Master Calendar')
  })

  it('shows only the section for the selected request type', () => {
    const graphic = visible({ 'request-type': 'Graphic Design' })
    expect(graphic['graphic-options']).toBe(true)
    expect(graphic['email-subject']).toBe(false)
    expect(graphic['promo-options']).toBe(false)
    expect(graphic['completion-date']).toBe(true)

    const photo = visible({ 'request-type': 'Photo' })
    expect(photo['photo-description']).toBe(true)
    expect(photo['details-section']).toBe(false)
    expect(photo['completion-date']).toBe(false)

    const promo = visible({ 'request-type': 'Promotional (social media, press release, etc)' })
    expect(promo['promo-options']).toBe(true)
  })

  it('shows the print account only above 10 and the website url only for update options', () => {
    const low = visible({ 'request-type': 'Graphic Design', 'print-quantity': '10' })
    const high = visible({ 'request-type': 'Graphic Design', 'print-quantity': '11' })
    expect(low['print-account']).toBe(false)
    expect(high['print-account']).toBe(true)

    const website = visible({
      'request-type': 'Website',
      'website-options': ['New event page'],
    })
    const update = visible({
      'request-type': 'Website',
      'website-options': ['Connect update'],
    })
    expect(website['website-url']).toBe(false)
    expect(update['website-url']).toBe(true)
  })

  it('adds helpdesk for website and mass email, and tags configured trello members', () => {
    expect(communicationsPrfNotifyEmails({ 'request-type': 'Photo' }, 'ada@asburyseminary.edu')).toEqual([
      'communications.office@asburyseminary.edu',
      'ada@asburyseminary.edu',
    ])
    expect(communicationsPrfNotifyEmails({ 'request-type': 'Website' }, 'ada@asburyseminary.edu')).toContain(
      'helpdesk@asburyseminary.edu',
    )
    expect(parseTrelloMemberIds('aaa', '{"Website":"bbb,aaa"}', 'Website')).toEqual(['aaa', 'bbb'])

    const card = communicationsPrfTrelloCard(
      { 'project-title': 'Fall poster', 'request-type': 'Graphic Design', 'completion-date': '2026-11-01' },
      communicationsPrfSchema.fields,
      'ada@asburyseminary.edu',
    )
    expect(card.name).toBe('Fall poster')
    expect(card.due).toBe('2026-11-01')
    expect(card.desc).toContain('Graphic Design')
  })
})