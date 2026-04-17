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
})
