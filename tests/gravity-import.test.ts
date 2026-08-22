import { describe, expect, it } from 'vitest'
import { buildGravityImportReport } from '../server/utils/gravityImport'

describe('gravity import report', () => {
  it('maps basic supported fields in dry run', () => {
    const report = buildGravityImportReport(
      {
        version: '2.9.28',
        0: {
          id: 2,
          title: 'Asbury Inn Reservations',
          description: 'Test description',
          fields: [
            { id: 1, type: 'text', label: 'Name', isRequired: true },
            {
              id: 2,
              type: 'select',
              label: 'Rooms',
              choices: [
                { text: 'One', value: '1' },
                { text: 'Two', value: '2' },
              ],
            },
          ],
        },
      },
      'dryRun',
    )

    expect(report.totals.parsedForms).toBe(1)
    expect(report.totals.blockedForms).toBe(0)
    expect(report.forms[0]?.candidate?.payload.schema.fields).toHaveLength(2)
    expect(report.forms[0]?.candidate?.payload.schema.fields[0]?.id).toBe('name')
  })

  it('preserves conditional logic and metadata without blocking', () => {
    const report = buildGravityImportReport(
      {
        forms: [
          {
            id: 4,
            title: 'Complex Form',
            notifications: [{ id: 'a' }],
            fields: [
              {
                id: 11,
                type: 'text',
                label: 'Room Type',
                conditionalLogic: {
                  enabled: true,
                  rules: [{ fieldId: '10', operator: 'is', value: 'Suite' }],
                },
              },
            ],
          },
        ],
      },
      'dryRun',
    )

    expect(report.totals.blockedForms).toBe(0)
    const rules = report.forms[0]?.candidate?.payload.schema.rules as Array<any>
    expect(Array.isArray(rules)).toBe(true)
    expect(rules.some((r) => r.type === 'gravityConditional')).toBe(true)
    expect(rules.some((r) => r.type === 'gravityMetadata' && r.key === 'notifications')).toBe(true)
  })

  it('imports conditional logic when no blockers exist', () => {
    const report = buildGravityImportReport(
      {
        forms: [
          {
            id: 9,
            title: 'Conditional Form',
            fields: [
              { id: 10, type: 'select', label: 'Room Type', choices: [{ text: 'Suite', value: 'Suite' }] },
              {
                id: 11,
                type: 'text',
                label: 'Suite choice',
                conditionalLogic: {
                  enabled: true,
                  actionType: 'show',
                  logicType: 'all',
                  rules: [{ fieldId: '10', operator: 'is', value: 'Suite' }],
                },
              },
            ],
          },
        ],
      },
      'dryRun',
    )

    expect(report.totals.blockedForms).toBe(0)
    const rules = report.forms[0]?.candidate?.payload.schema.rules as Array<any>
    expect(Array.isArray(rules)).toBe(true)
    expect(rules[0]?.type).toBe('gravityConditional')
    expect(rules[0]?.targetFieldId).toBe('suite-choice')
    expect(rules[0]?.conditions?.[0]?.sourceFieldId).toBe('room-type')
  })

  it('blocks unsupported field types', () => {
    const report = buildGravityImportReport(
      {
        forms: [
          {
            id: 8,
            title: 'Unsupported Type',
            fields: [{ id: 1, type: 'captcha', label: 'CAPTCHA' }],
          },
        ],
      },
      'dryRun',
    )

    expect(report.totals.blockedForms).toBe(1)
    expect(report.forms[0]?.blockers.some((b) => b.code === 'unsupported_field_type')).toBe(true)
  })

  it('maps list fields and preserves list metadata', () => {
    const report = buildGravityImportReport(
      {
        forms: [
          {
            id: 12,
            title: 'List Form',
            fields: [
              { id: 25, type: 'list', label: 'Additional emails', enableColumns: true, maxRows: 5 },
            ],
          },
        ],
      },
      'dryRun',
    )

    expect(report.totals.blockedForms).toBe(0)
    const field = report.forms[0]?.candidate?.payload.schema.fields[0]
    expect(field?.type).toBe('textarea')
  })

  it('maps section and time field types', () => {
    const report = buildGravityImportReport(
      {
        forms: [
          {
            id: 20,
            title: 'Section and Time',
            fields: [
              { id: 36, type: 'section', label: 'Arrival Block', description: 'Choose date/time' },
              { id: 13, type: 'time', label: 'Arrival time' },
            ],
          },
        ],
      },
      'dryRun',
    )

    expect(report.totals.blockedForms).toBe(0)
    const fields = report.forms[0]?.candidate?.payload.schema.fields || []
    expect(fields.find((f) => f.id === 'arrival-block')?.type).toBe('section')
    expect(fields.find((f) => f.id === 'arrival-time')?.type).toBe('time')
  })

  it('maps product, total, html, and hidden fields', () => {
    const report = buildGravityImportReport(
      {
        forms: [
          {
            id: 30,
            title: 'Asbury Inn Coffee Services',
            fields: [
              {
                id: 1,
                type: 'product',
                inputType: 'singleproduct',
                label: 'Carafe Regular',
                basePrice: '$11.00',
                disableQuantity: false,
              },
              { id: 11, type: 'total', label: 'Total' },
              {
                id: 13,
                type: 'html',
                label: 'HTML Block',
                content: '<p>Return unused condiments.</p>',
              },
              { id: 17, type: 'hidden', label: 'Submitter', defaultValue: '{user:user_email}' },
            ],
          },
        ],
      },
      'dryRun',
    )

    expect(report.totals.blockedForms).toBe(0)
    const fields = report.forms[0]?.candidate?.payload.schema.fields || []
    const product = fields.find((f) => f.id === 'carafe-regular')
    expect(product?.type).toBe('product')
    expect(product?.unitPrice).toBe(11)
    expect(product?.disableQuantity).toBe(false)
    expect(fields.find((f) => f.id === 'total')?.type).toBe('total')
    expect(fields.find((f) => f.id === 'html-block')).toMatchObject({
      type: 'html',
      content: '<p>Return unused condiments.</p>',
    })
    expect(fields.find((f) => f.id === 'submitter')).toMatchObject({
      type: 'hidden',
      defaultValue: '{user:user_email}',
    })
  })

  it('slugifies labels and suffixes duplicate field ids', () => {
    const report = buildGravityImportReport(
      {
        forms: [
          {
            id: 41,
            title: 'Duplicate Labels',
            fields: [
              { id: 1, type: 'text', label: 'Contact Name' },
              { id: 2, type: 'text', label: 'Contact Name' },
              { id: 3, type: 'text', label: 'Tea Assortment (20)' },
            ],
          },
        ],
      },
      'dryRun',
    )

    expect(report.totals.blockedForms).toBe(0)
    const ids = (report.forms[0]?.candidate?.payload.schema.fields || []).map((f) => f.id)
    expect(ids).toEqual(['contact-name', 'contact-name-2', 'tea-assortment-20'])
  })
})
