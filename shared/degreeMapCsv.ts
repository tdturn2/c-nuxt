/**
 * CSV format for Degree Builder import (one row per course in a section).
 *
 * Required columns: section_name, course_code
 * Optional: section_credits_required, section_order, specialization_name, item_order, course_title
 *
 * Example:
 * section_name,section_credits_required,section_order,specialization_name,course_code,item_order,course_title
 * Biblical Foundations,12,0,,OT501,0,Hebrew I
 * Biblical Foundations,,,,NT501,1,New Testament Introduction
 * Electives,6,1,Youth Ministry,YM610,0,Youth Ministry Practicum
 */

export const DEGREE_MAP_CSV_TEMPLATE = `section_name,section_credits_required,section_order,specialization_name,course_code,item_order,course_title
Biblical Foundations,12,0,,OT501,0,Hebrew I
Biblical Foundations,,,,NT501,1,New Testament Introduction
Electives,6,1,Youth Ministry,YM610,0,Youth Ministry Practicum
`

export type DegreeMapCsvRow = {
  line: number
  sectionName: string
  sectionCreditsRequired: number | null
  sectionOrder: number | null
  specializationName: string | null
  courseCode: string
  courseTitle: string | null
  itemOrder: number | null
}

export type ParseDegreeMapCsvResult = {
  rows: DegreeMapCsvRow[]
  errors: string[]
}

const HEADER_ALIASES: Record<keyof Omit<DegreeMapCsvRow, 'line'>, string[]> = {
  sectionName: ['section_name', 'section', 'section title'],
  sectionCreditsRequired: ['section_credits_required', 'section_credits', 'credits_required'],
  sectionOrder: ['section_order'],
  specializationName: ['specialization_name', 'specialization', 'track'],
  courseCode: ['course_code', 'code', 'course'],
  courseTitle: ['course_title', 'title', 'course name'],
  itemOrder: ['item_order', 'order', 'item order'],
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

function parseOptionalInt(value: string): number | null {
  const t = value.trim()
  if (!t) return null
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}

/** Minimal RFC-style CSV row parser (quoted fields, commas). */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ''
  }

  const pushRow = () => {
    if (row.length === 1 && row[0] === '' && rows.length > 0) return
    rows.push(row)
    row = []
  }

  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      pushField()
    } else if (ch === '\n') {
      pushField()
      pushRow()
    } else if (ch === '\r') {
      // handle \r\n
    } else {
      field += ch
    }
  }
  pushField()
  if (row.length > 0 || field.length > 0) pushRow()
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''))
}

function resolveHeaderIndex(headers: string[]): Partial<Record<keyof Omit<DegreeMapCsvRow, 'line'>, number>> {
  const normalized = headers.map(normalizeHeader)
  const out: Partial<Record<keyof Omit<DegreeMapCsvRow, 'line'>, number>> = {}
  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as Array<
    [keyof Omit<DegreeMapCsvRow, 'line'>, string[]]
  >) {
    const idx = normalized.findIndex((h) => aliases.includes(h))
    if (idx >= 0) out[key] = idx
  }
  return out
}

export function parseDegreeMapCsv(text: string): ParseDegreeMapCsvResult {
  const table = parseCsvText(text)
  const errors: string[] = []
  if (table.length === 0) {
    return { rows: [], errors: ['CSV is empty.'] }
  }

  const headerRow = table[0]
  const headerMap = resolveHeaderIndex(headerRow.map((h) => String(h)))
  if (headerMap.sectionName == null) {
    errors.push('Missing required column: section_name')
  }
  if (headerMap.courseCode == null) {
    errors.push('Missing required column: course_code')
  }
  if (errors.length) return { rows: [], errors }

  const rows: DegreeMapCsvRow[] = []
  for (let i = 1; i < table.length; i++) {
    const cells = table[i]
    const line = i + 1
    const get = (key: keyof Omit<DegreeMapCsvRow, 'line'>) => {
      const idx = headerMap[key]
      if (idx == null) return ''
      return String(cells[idx] ?? '').trim()
    }

    const sectionName = get('sectionName')
    const courseCode = get('courseCode').toUpperCase()
    if (!sectionName) {
      errors.push(`Line ${line}: section_name is required.`)
      continue
    }
    if (!courseCode) {
      errors.push(`Line ${line}: course_code is required.`)
      continue
    }

    const sectionCreditsRaw = get('sectionCreditsRequired')
    const sectionCreditsRequired = sectionCreditsRaw ? parseOptionalInt(sectionCreditsRaw) : null
    if (sectionCreditsRaw && sectionCreditsRequired == null) {
      errors.push(`Line ${line}: section_credits_required must be a whole number.`)
    }

    const sectionOrderRaw = get('sectionOrder')
    const sectionOrder = sectionOrderRaw ? parseOptionalInt(sectionOrderRaw) : null
    if (sectionOrderRaw && sectionOrder == null) {
      errors.push(`Line ${line}: section_order must be a whole number.`)
    }

    const itemOrderRaw = get('itemOrder')
    const itemOrder = itemOrderRaw ? parseOptionalInt(itemOrderRaw) : null
    if (itemOrderRaw && itemOrder == null) {
      errors.push(`Line ${line}: item_order must be a whole number.`)
    }

    const specializationName = get('specializationName') || null
    const courseTitle = get('courseTitle') || null

    rows.push({
      line,
      sectionName,
      sectionCreditsRequired,
      sectionOrder,
      specializationName,
      courseCode,
      courseTitle,
      itemOrder,
    })
  }

  return { rows, errors }
}

export function downloadDegreeMapCsvTemplate(filename = 'degree-map-template.csv') {
  if (typeof document === 'undefined') return
  const blob = new Blob([DEGREE_MAP_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
