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
