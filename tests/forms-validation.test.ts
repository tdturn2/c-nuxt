import { describe, expect, it } from 'vitest'
import { validateAnswersAgainstSchema, validateFormSchemaV1 } from '../app/utils/forms/validation'

describe('form schema validation', () => {
  it('accepts valid v1 schema', () => {
    const result = validateFormSchemaV1({
      version: 1,
      fields: [
        { id: 'name', type: 'text', label: 'Name', required: true },
        { id: 'receipt', type: 'file', label: 'Receipt', accept: ['.pdf'] },
      ],
    })

    expect(result.valid).toBe(true)
    expect(result.schema?.fields).toHaveLength(2)
  })

  it('accepts repeater fields with columns', () => {
    const result = validateFormSchemaV1({
      version: 1,
      fields: [
        {
          id: 'contacts',
          type: 'repeater',
          label: 'Contact Information for each destination',
          required: true,
          columns: [
            { id: 'contact_name', label: 'Contact Name' },
            { id: 'address', label: 'Address' },
            { id: 'phone', label: 'Phone number' },
          ],
        },
      ],
    })
    expect(result.valid).toBe(true)
    expect(result.schema?.fields[0]?.columns).toHaveLength(3)
  })

  it('defaults a column when repeater has none defined', () => {
    const result = validateFormSchemaV1({
      version: 1,
      fields: [{ id: 'contacts', type: 'repeater', label: 'Department Name' }],
    })
    expect(result.valid).toBe(true)
    expect(result.schema?.fields[0]?.columns).toEqual([
      { id: 'department_name', label: 'Department Name' },
    ])
  })

  it('accepts array-like column objects from Payload JSON', () => {
    const result = validateFormSchemaV1({
      version: 1,
      fields: [
        {
          id: 'contacts',
          type: 'repeater',
          label: 'Contacts',
          columns: {
            0: { id: 'name', label: 'Contact Name' },
            1: { id: 'phone', label: 'Phone' },
          },
        },
      ],
    })
    expect(result.valid).toBe(true)
    expect(result.schema?.fields[0]?.columns).toEqual([
      { id: 'name', label: 'Contact Name' },
      { id: 'phone', label: 'Phone' },
    ])
  })

  it('rejects invalid schema', () => {
    const result = validateFormSchemaV1({
      fields: [{ id: '', type: 'unknown' }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('answer validation', () => {
  it('requires required field values', () => {
    const schemaResult = validateFormSchemaV1({
      version: 1,
      fields: [
        { id: 'destination', type: 'text', label: 'Destination', required: true },
        { id: 'tags', type: 'checkbox', label: 'Tags', required: true, options: [{ label: 'One', value: 'one' }] },
      ],
    })
    expect(schemaResult.valid).toBe(true)

    const checked = validateAnswersAgainstSchema(schemaResult.schema!, {
      destination: '',
      tags: [],
    })
    expect(checked.valid).toBe(false)
    expect(checked.errors).toHaveLength(2)
  })

  it('requires at least one complete repeater row', () => {
    const schemaResult = validateFormSchemaV1({
      version: 1,
      fields: [
        {
          id: 'contacts',
          type: 'repeater',
          label: 'Contacts',
          required: true,
          columns: [
            { id: 'name', label: 'Name' },
            { id: 'phone', label: 'Phone' },
          ],
        },
      ],
    })
    expect(schemaResult.valid).toBe(true)

    const empty = validateAnswersAgainstSchema(schemaResult.schema!, {
      contacts: [{ name: '', phone: '' }],
    })
    expect(empty.valid).toBe(false)

    const ok = validateAnswersAgainstSchema(schemaResult.schema!, {
      contacts: [{ name: 'Ada', phone: '555-0100' }],
    })
    expect(ok.valid).toBe(true)
  })
})
