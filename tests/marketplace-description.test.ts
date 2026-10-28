import { describe, expect, it } from 'vitest'
import {
  marketplaceDescriptionDocFromStored,
  marketplaceDescriptionText,
  marketplaceDescriptionToHtml,
  sanitizeMarketplaceDescription,
} from '../app/utils/marketplaceDescription'

describe('marketplace description', () => {
  it('keeps plain listing text and turns the editor document into safe html', () => {
    const doc = marketplaceDescriptionDocFromStored('Pickup after chapel.\n\nBring a truck.')
    const html = marketplaceDescriptionToHtml(doc)
    expect(html).toContain('Pickup after chapel.')
    expect(html).toContain('Bring a truck.')
    expect(html).not.toContain('<script')
    expect(marketplaceDescriptionText(html)).toBe('Pickup after chapel. Bring a truck.')
  })

  it('drops unsafe links and keeps bold text', () => {
    const html = sanitizeMarketplaceDescription('<p><strong>Firm</strong> <a href="javascript:alert(1)">nope</a> <a href="https://example.com">site</a></p>')
    expect(html).toContain('<strong>Firm</strong>')
    expect(html).toContain('href="https://example.com"')
    expect(html).not.toContain('javascript:')
    expect(marketplaceDescriptionText(html)).toContain('Firm')
    expect(marketplaceDescriptionText(html)).toContain('site')
  })
})
