import type { DegreeMapCsvRow } from '@shared/degreeMapCsv'
import type { PayloadAuthResult } from './payloadAuth'
import { getPayloadProxyHeaders } from './payloadAuth'

type CourseOption = { id: number; code: string; title: string; credits?: number | null }

type BundleSection = {
  id: number
  name?: string
  title?: string
  creditsRequired?: number
  order?: number
  specialization?: number | null
  items?: Array<{
    id: number
    order?: number
    course?: { id?: number; code?: string }
    code?: string
  }>
}

type Bundle = {
  degree?: { id?: number }
  specializations?: Array<{ id: number; name?: string; title?: string }>
  sections?: BundleSection[]
}

export type DegreeMapImportSummary = {
  sectionsCreated: number
  sectionsUpdated: number
  itemsCreated: number
  itemsSkipped: number
  coursesCreated: number
  errors: string[]
  warnings: string[]
}

function normKey(value: string): string {
  return value.trim().toLowerCase()
}

function sectionDisplayName(sec: BundleSection): string {
  return String(sec.name ?? sec.title ?? '').trim()
}

function errMessage(err: unknown): string {
  const e = err as { data?: { message?: string }; statusMessage?: string; message?: string }
  return e?.data?.message || e?.statusMessage || e?.message || 'request failed'
}

async function fetchBundle(payloadBaseUrl: string, degreeId: number, email: string, headers: Record<string, string>) {
  return await $fetch<Bundle>(`${payloadBaseUrl}/api/degrees/${degreeId}/bundle`, {
    query: { email },
    headers,
  })
}

async function fetchCourses(payloadBaseUrl: string, headers: Record<string, string>): Promise<CourseOption[]> {
  try {
    const res = await $fetch<{ docs?: CourseOption[] }>(`${payloadBaseUrl}/api/courses/list`, { headers })
    return Array.isArray(res?.docs) ? res.docs : []
  } catch {
    const res = await $fetch<{ docs?: any[] }>(`${payloadBaseUrl}/api/courses`, {
      query: { limit: 2000, sort: 'code', depth: 0 },
      headers,
    })
    return (res?.docs ?? []).map((c) => ({
      id: Number(c.id),
      code: String(c.code || '').trim().toUpperCase(),
      title: String(c.title || '').trim(),
      credits: c.credits ?? null,
    }))
  }
}

export async function importDegreeMapRows(options: {
  event: any
  payloadBaseUrl: string
  auth: PayloadAuthResult
  email: string
  degreeId: number
  rows: DegreeMapCsvRow[]
  createMissingCourses?: boolean
}): Promise<DegreeMapImportSummary> {
  const { event, payloadBaseUrl, auth, email, degreeId, rows, createMissingCourses = false } = options
  const headers = getPayloadProxyHeaders(event, auth)

  const summary: DegreeMapImportSummary = {
    sectionsCreated: 0,
    sectionsUpdated: 0,
    itemsCreated: 0,
    itemsSkipped: 0,
    coursesCreated: 0,
    errors: [],
    warnings: [],
  }

  if (!rows.length) {
    summary.errors.push('No data rows to import.')
    return summary
  }

  const bundle = await fetchBundle(payloadBaseUrl, degreeId, email, headers)
  const courses = await fetchCourses(payloadBaseUrl, headers)
  const courseByCode = new Map<string, CourseOption>()
  for (const c of courses) {
    if (c.code) courseByCode.set(normKey(c.code), c)
  }

  const specByName = new Map<string, number>()
  for (const s of bundle.specializations ?? []) {
    const label = String(s.name ?? s.title ?? '').trim()
    if (label) specByName.set(normKey(label), s.id)
  }

  const sectionByName = new Map<string, BundleSection>()
  for (const sec of bundle.sections ?? []) {
    const label = sectionDisplayName(sec)
    if (label) sectionByName.set(normKey(label), { ...sec, items: [...(sec.items ?? [])] })
  }

  const sectionOrderKeys: string[] = []
  const rowsBySection = new Map<string, DegreeMapCsvRow[]>()
  for (const row of rows) {
    const key = normKey(row.sectionName)
    if (!rowsBySection.has(key)) {
      rowsBySection.set(key, [])
      sectionOrderKeys.push(key)
    }
    rowsBySection.get(key)!.push(row)
  }

  let nextSectionOrder = (bundle.sections ?? []).reduce(
    (max, s) => Math.max(max, Number(s.order ?? 0) + 1),
    0,
  )

  for (const sectionKey of sectionOrderKeys) {
    const sectionRows = rowsBySection.get(sectionKey) ?? []
    const first = sectionRows[0]
    if (!first) continue

    let section = sectionByName.get(sectionKey)
    const specializationId =
      first.specializationName && specByName.has(normKey(first.specializationName))
        ? specByName.get(normKey(first.specializationName))!
        : null

    if (first.specializationName && specializationId == null) {
      summary.warnings.push(
        `Section "${first.sectionName}": specialization "${first.specializationName}" not found; section created or left as core.`,
      )
    }

    if (!section) {
      const order = first.sectionOrder ?? nextSectionOrder++
      try {
        const created = await $fetch<{ id?: number }>(`${payloadBaseUrl}/api/degree-sections/create`, {
          method: 'POST',
          headers,
          body: {
            email,
            degree: degreeId,
            name: first.sectionName.trim(),
            creditsRequired: first.sectionCreditsRequired ?? undefined,
            order,
            specialization: specializationId,
          },
        })
        if (!created?.id) {
          summary.errors.push(`Section "${first.sectionName}": create did not return an id.`)
          continue
        }
        section = {
          id: Number(created.id),
          name: first.sectionName,
          creditsRequired: first.sectionCreditsRequired ?? undefined,
          order,
          specialization: specializationId,
          items: [],
        }
        sectionByName.set(sectionKey, section)
        summary.sectionsCreated++
      } catch (err: unknown) {
        summary.errors.push(`Section "${first.sectionName}": ${errMessage(err)}`)
        continue
      }
    } else if (first.sectionCreditsRequired != null) {
      try {
        await $fetch(`${payloadBaseUrl}/api/degree-sections/${section.id}`, {
          method: 'PATCH',
          headers,
          body: { email, creditsRequired: first.sectionCreditsRequired },
        })
        section.creditsRequired = first.sectionCreditsRequired
        summary.sectionsUpdated++
      } catch {
        summary.warnings.push(`Section "${first.sectionName}": could not update credits required.`)
      }
    }

    const existingCourseCodes = new Set(
      (section.items ?? [])
        .map((it) => normKey(String(it.course?.code ?? it.code ?? '')))
        .filter(Boolean),
    )

    let nextItemOrder = (section.items ?? []).reduce(
      (max, it) => Math.max(max, Number(it.order ?? 0) + 1),
      0,
    )

    for (const row of sectionRows) {
      const codeKey = normKey(row.courseCode)
      if (existingCourseCodes.has(codeKey)) {
        summary.itemsSkipped++
        continue
      }

      let course = courseByCode.get(codeKey)
      if (!course && createMissingCourses) {
        const title = row.courseTitle?.trim() || row.courseCode
        const credits = row.courseCredits ?? null
        try {
          const created = await $fetch<any>(`${payloadBaseUrl}/api/courses`, {
            method: 'POST',
            headers,
            body: { code: row.courseCode, title, ...(credits != null ? { credits } : {}) },
          })
          course = {
            id: Number(created.id),
            code: row.courseCode,
            title,
            credits: created.credits ?? credits,
          }
          courseByCode.set(codeKey, course)
          summary.coursesCreated++
        } catch (err: unknown) {
          summary.errors.push(`Line ${row.line}: could not create course ${row.courseCode} — ${errMessage(err)}`)
          continue
        }
      }

      if (!course) {
        summary.errors.push(
          `Line ${row.line}: course "${row.courseCode}" not found in catalog (add it first or enable Create missing courses).`,
        )
        continue
      }

      const order = row.itemOrder ?? nextItemOrder++
      const itemCredits = row.courseCredits ?? course.credits ?? undefined
      try {
        await $fetch(`${payloadBaseUrl}/api/degree-section-items/create`, {
          method: 'POST',
          headers,
          body: {
            email,
            degree: degreeId,
            section: section.id,
            type: 'single',
            course: course.id,
            label: row.courseTitle?.trim() || course.title,
            credits: itemCredits,
            order,
          },
        })
        existingCourseCodes.add(codeKey)
        summary.itemsCreated++
      } catch (err: unknown) {
        summary.errors.push(`Line ${row.line}: ${errMessage(err)}`)
      }
    }
  }

  return summary
}
