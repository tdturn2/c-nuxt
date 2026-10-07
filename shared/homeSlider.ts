/** Stored in `href` when a slide should open a Connect post in a modal. */
export const HOME_SLIDER_POST_MODAL_PREFIX = 'post-modal:'

export type HomeSliderLinkType = 'none' | 'url' | 'post'

export type HomeSliderWritePayload = {
  title: string
  href: string
  image: string | number | null
  active: boolean
  openInNewTab: boolean
  sortOrder: number
  startAt: string | null
  endAt: string | null
}

export function buildHomeSliderPostModalHref(postId: string | number): string {
  return `${HOME_SLIDER_POST_MODAL_PREFIX}${String(postId).trim()}`
}

export function parseHomeSliderPostModalHref(href: unknown): number | null {
  if (typeof href !== 'string') return null
  const trimmed = href.trim()
  const lower = trimmed.toLowerCase()
  if (!lower.startsWith(HOME_SLIDER_POST_MODAL_PREFIX)) return null
  const idPart = trimmed.slice(HOME_SLIDER_POST_MODAL_PREFIX.length).trim()
  if (!/^\d+$/.test(idPart)) return null
  const id = Number(idPart)
  return Number.isFinite(id) && id > 0 ? id : null
}

export function isHomeSliderPostModalHref(href: unknown): boolean {
  return parseHomeSliderPostModalHref(href) != null
}

export function resolveHomeSliderHref(input: {
  linkType?: HomeSliderLinkType | string | null
  href?: string | null
  postId?: string | number | null
}): string {
  const linkType = input.linkType || 'url'
  if (linkType === 'none') return ''
  if (linkType === 'post') {
    const id = input.postId == null || input.postId === '' ? null : String(input.postId).trim()
    if (!id || !/^\d+$/.test(id)) return ''
    return buildHomeSliderPostModalHref(id)
  }
  return String(input.href || '').trim()
}

export function homeSliderLinkTypeFromHref(href: unknown): HomeSliderLinkType {
  if (isHomeSliderPostModalHref(href)) return 'post'
  if (typeof href === 'string' && href.trim()) return 'url'
  return 'none'
}

export function nextHomeSliderSortOrder(items: Array<{ sortOrder?: number | string | null }>): number {
  const values = items.map((item) => Number(item.sortOrder)).filter((n) => Number.isFinite(n))
  if (!values.length) return 0
  return Math.max(...values) + 1
}

export function parseOptionalSortOrder(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function selectedImageIds(images: Array<string | number | null | undefined>): Array<string | number> {
  return images.filter((id): id is string | number => id != null && id !== '')
}

export function buildHomeSliderCreateItems(input: {
  images: Array<string | number | null | undefined>
  title?: string
  href?: string
  active?: boolean
  openInNewTab?: boolean
  sortOrder?: unknown
  startAt?: string | null
  endAt?: string | null
  existingItems?: Array<{ sortOrder?: number | string | null }>
}): HomeSliderWritePayload[] {
  const images = selectedImageIds(input.images)
  const startSort = parseOptionalSortOrder(input.sortOrder) ?? nextHomeSliderSortOrder(input.existingItems || [])
  const shared = {
    title: String(input.title || '').trim(),
    href: String(input.href || '').trim(),
    active: input.active !== false,
    openInNewTab: !!input.openInNewTab,
    startAt: input.startAt || null,
    endAt: input.endAt || null,
  }
  const ids: Array<string | number | null> = images.length ? images : [null]
  return ids.map((image, index) => ({
    ...shared,
    image,
    sortOrder: startSort + index,
  }))
}
