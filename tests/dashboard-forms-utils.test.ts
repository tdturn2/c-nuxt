import { describe, expect, it } from 'vitest'
import { normalizeDashboardFormSchema, normalizeFormMetadata } from '../server/utils/dashboardForms'

describe('dashboard form metadata', () => {
  it('normalizes valid metadata', () => {
    const metadata = normalizeFormMetadata({
      slug: 'travel-request',
      title: 'Travel Request',
      status: 'active',
      componentKey: 'travel',
      editableMode: 'versioned',
      indexedFields: ['destination'],
      viewerGroups: [{ id: 'staff' }],
    })
    expect(metadata.slug).toBe('travel-request')
    expect(metadata.status).toBe('active')
    expect(metadata.editableMode).toBe('versioned')
  })
})

describe('dashboard form schema', () => {
  it('normalizes allowed field types', () => {
    const schema = normalizeDashboardFormSchema({
      version: 1,
      fields: [
        { id: 'destination', type: 'text', label: 'Destination', required: true },
        { id: 'receipt', type: 'file', label: 'Receipt', accept: ['.pdf'] },
      ],
    })
    expect(schema.fields).toHaveLength(2)
    expect(schema.fields[1]?.accept).toEqual(['.pdf'])
  })
})
