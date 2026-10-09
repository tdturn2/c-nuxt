export type ElectiveRecord = {
  id?: number
  hoursEarned?: number | null
  hoursType?: string | null
  status?: string | null
  term?: string | null
  enteredCourseCode?: string | null
  enteredCourseTitle?: string | null
  offeringFullClassId?: string | null
  offeringShortDescription?: string | null
  course?: { code?: string; title?: string; credits?: number; description?: string } | null
  [key: string]: unknown
}

export type ElectiveBucketItem = {
  id?: number
  type?: string
  credits?: number | null
  label?: string
  title?: string
  description?: string | null
  record?: ElectiveRecord | null
  records?: ElectiveRecord[] | null
  electiveLine?: boolean
  [key: string]: unknown
}

/** "MS501 W2" or "MS501-W2" → "MS501" for the class-search box. */
export function courseSearchSeed(raw: string | null | undefined): string {
  const text = String(raw ?? '').trim()
  if (!text) return ''
  const withoutSection = text.replace(/[\s-]+[A-Za-z]?\d{1,2}$/, '')
  const head = withoutSection.split(/[\s-]+/)[0] ?? withoutSection
  return head.toUpperCase()
}

/** Catalog placeholders such as MH9__ / "Concentration Electives" stand for a block of hours, not one class. */
export function isElectivePlaceholderCode(code: string | null | undefined): boolean {
  return /_{2,}$/.test(String(code ?? '').trim())
}

export function isElectiveBucket(
  item: {
    type?: string | null
    electiveLine?: boolean
    code?: string | null
    course?: { code?: string | null } | null
  } | null | undefined,
): boolean {
  if (!item || item.electiveLine) return false
  if (item.type === 'other_course') return true
  return isElectivePlaceholderCode(item.course?.code ?? item.code)
}

export function electiveRecords(item: ElectiveBucketItem | null | undefined): ElectiveRecord[] {
  if (!item) return []
  if (Array.isArray(item.records)) return item.records.filter(Boolean)
  return item.record ? [item.record] : []
}

export function formatHours(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export function hoursNumber(value: unknown): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Catalog credit hours for this class, when we know them. */
export function recordCreditHours(record: ElectiveRecord | null | undefined): number | null {
  const credits = record?.course?.credits
  if (credits == null || credits === '') return null
  const n = hoursNumber(credits)
  return n > 0 ? n : null
}

export function isCompletedRecord(record: { status?: string | null } | null | undefined): boolean {
  const status = String(record?.status ?? '').trim().toLowerCase()
  return status === 'completed' || status === 'complete'
}

/**
 * Hours this class applies to a section.
 * A class cannot contribute more than its own credit hours, so a 1-credit
 * course stored with a larger hours-earned value still counts as 1.
 */
export function appliedElectiveHours(record: ElectiveRecord | null | undefined): number | null {
  if (!record) return null
  const raw = record.hoursEarned
  if (raw == null || raw === '') return null
  const earned = hoursNumber(raw)
  const cap = recordCreditHours(record)
  if (cap == null) return earned
  return Math.min(earned, cap)
}

/** Assign hours in order, stopping at the limit. Extra hours do not carry into the total. */
export function countTowardLimit(amounts: number[], limit?: number | null): number[] {
  let room = limit != null && Number.isFinite(limit) ? Math.max(0, limit) : Number.POSITIVE_INFINITY
  return amounts.map((amount) => {
    const safe = Number.isFinite(amount) && amount > 0 ? amount : 0
    const counted = Math.min(safe, room)
    room -= counted
    return counted
  })
}

export function filledElectiveHours(records: ElectiveRecord[], limit?: number | null): number {
  const applied = records.map((record) => appliedElectiveHours(record) ?? 0)
  return countTowardLimit(applied, limit).reduce((sum, hours) => sum + hours, 0)
}

export function electiveCourseCode(record: ElectiveRecord | null | undefined): string {
  const entered = typeof record?.enteredCourseCode === 'string' ? record.enteredCourseCode.trim() : ''
  if (entered) return entered
  const offering = typeof record?.offeringFullClassId === 'string' ? record.offeringFullClassId.trim() : ''
  if (offering) return offering
  const code = record?.course?.code?.trim()
  return code || ''
}

export function electiveCourseTitle(record: ElectiveRecord | null | undefined): string {
  const entered = typeof record?.enteredCourseTitle === 'string' ? record.enteredCourseTitle.trim() : ''
  if (entered) return entered
  const offering = typeof record?.offeringShortDescription === 'string' ? record.offeringShortDescription.trim() : ''
  if (offering) return offering
  const title = record?.course?.title?.trim()
  return title || ''
}

/** One student course under an elective bucket, shaped like a degree-map row. */
export function electiveLineView<T extends ElectiveBucketItem>(bucket: T, record: ElectiveRecord): T & {
  electiveLine: true
  code?: string
  title?: string
  credits: number | null
  description: undefined
  record: ElectiveRecord
} {
  const code = electiveCourseCode(record)
  const title = electiveCourseTitle(record)
  const catalogCredits = record.course?.credits
  const credits = catalogCredits != null && hoursNumber(catalogCredits) > 0 ? hoursNumber(catalogCredits) : null
  return {
    ...bucket,
    electiveLine: true,
    record,
    course: record.course?.code || record.course?.title ? record.course : undefined,
    code: code || undefined,
    label: title || 'Course',
    title: title || undefined,
    credits: credits || null,
    description: undefined,
  }
}
