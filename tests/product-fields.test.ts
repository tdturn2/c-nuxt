import { describe, expect, it } from 'vitest'
import {
  applyProductAndTotalAnswers,
  formatMoney,
  formatStoredAnswer,
  normalizeProductAnswer,
  resolveFormMergeTags,
} from '../app/utils/forms/productFields'

describe('product field helpers', () => {
  it('normalizes quantity, price, and line total', () => {
    expect(normalizeProductAnswer({ label: 'Carafe Regular', unitPrice: 11 }, { quantity: 2 })).toEqual({
      name: 'Carafe Regular',
      price: 11,
      quantity: 2,
      lineTotal: 22,
    })
  })

  it('sums visible product answers into the total field', () => {
    const fields = [
      { id: 'carafe', type: 'product', label: 'Carafe Regular', unitPrice: 11 },
      { id: 'tea', type: 'product', label: 'Tea', unitPrice: 7 },
      { id: 'total', type: 'total', label: 'Total' },
    ]
    const out = applyProductAndTotalAnswers(
      fields,
      {
        carafe: { quantity: 2 },
        tea: { quantity: 1 },
      },
      ['carafe', 'tea', 'total'],
    )
    expect(out.carafe).toMatchObject({ quantity: 2, lineTotal: 22 })
    expect(out.total).toEqual({ amount: 29, formatted: formatMoney(29) })
  })

  it('formats stored product and total answers', () => {
    expect(formatStoredAnswer({ name: 'Carafe Regular', price: 11, quantity: 2, lineTotal: 22 })).toBe(
      'Carafe Regular: 2 × $11.00 = $22.00',
    )
    expect(formatStoredAnswer({ amount: 29, formatted: '$29.00' })).toBe('$29.00')
  })

  it('resolves Gravity user email merge tags', () => {
    expect(resolveFormMergeTags('{user:user_email}', { email: 'ada@asburyseminary.edu' })).toBe(
      'ada@asburyseminary.edu',
    )
  })
})
