import { connectFaqAnswerToTipTapContent, faqAnswerDocToHtml, htmlToFaqAnswerDoc } from './connectFaq'

export type MarketplaceDescriptionDoc = { type: 'doc'; content: any[] }

export function emptyMarketplaceDescriptionDoc(): MarketplaceDescriptionDoc {
  return { type: 'doc', content: [{ type: 'paragraph', content: [] }] }
}

/** Stored listing text or HTML → the document the FAQ-style editor edits. */
export function marketplaceDescriptionDocFromStored(value: string | null | undefined): MarketplaceDescriptionDoc {
  const stored = (value || '').trim()
  if (!stored) return emptyMarketplaceDescriptionDoc()
  if (/<\/?[a-z][\s\S]*>/i.test(stored)) return htmlToFaqAnswerDoc(stored)
  return { type: 'doc', content: connectFaqAnswerToTipTapContent(stored) }
}

/** Editor document → sanitized HTML safe to store and render. */
export function marketplaceDescriptionToHtml(doc: MarketplaceDescriptionDoc | null | undefined): string {
  return faqAnswerDocToHtml(doc).trim()
}

/** Stored description → sanitized HTML. Plain text stays a paragraph. */
export function sanitizeMarketplaceDescription(value: string | null | undefined): string {
  return marketplaceDescriptionToHtml(marketplaceDescriptionDocFromStored(value))
}

/** Stored description → plain text for cards and the required-field check. */
export function marketplaceDescriptionText(value: string | null | undefined): string {
  return sanitizeMarketplaceDescription(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|div|ul|ol|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
