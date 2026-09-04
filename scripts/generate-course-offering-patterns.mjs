/**
 * Offline generator for course offering patterns.
 *
 * Historical ClassList terms (before FA26) are fixed and never need
 * to be re-fetched on request. Run this when a term closes / rarely:
 *
 *   node scripts/generate-course-offering-patterns.mjs
 *   node scripts/generate-course-offering-patterns.mjs --include-fa26
 *
 * Default: closed terms only (everything before FA26).
 * --include-fa26: also fold in the current Fall 2026 schedule snapshot.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_BASE = 'https://my.asburyseminary.edu/ClassListDataGateway/ClassList/Where/Term'
const yearsBack = 4
const endYear = 2026
const startYear = endYear - yearsBack + 1 // 2023
const seasonOrder = { SP: 1, JA: 2, SU: 3, FA: 4 }
const includeFa26 = process.argv.includes('--include-fa26')

function normalizeClassListPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data
    if (Array.isArray(payload.items)) return payload.items
  }
  if (typeof payload === 'string' && payload.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(payload)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return []
    }
  }
  return []
}

function buildTermCodes() {
  const years = Array.from({ length: yearsBack }, (_, idx) => startYear + idx)
  const termCodes = []
  for (const year of years) {
    const yy = String(year % 100).padStart(2, '0')
    let seasons
    if (year <= 2025) seasons = ['SP', 'JA', 'SU', 'FA']
    else if (includeFa26) seasons = ['SP', 'SU', 'FA']
    else seasons = ['SP', 'SU'] // 2026 closed terms only (before FA26)
    for (const season of seasons) termCodes.push(`${season}${yy}`)
  }
  return { years, termCodes }
}

async function fetchTerm(termCode) {
  const response = await fetch(`${API_BASE}/${termCode}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AsburyConnect-OfferingPatterns-Generate/1.0',
    },
  })
  if (!response.ok) {
    console.warn(`  ${termCode}: HTTP ${response.status}`)
    return { termCode, rows: [] }
  }
  const json = await response.json().catch(() => [])
  const rows = normalizeClassListPayload(json)
  console.warn(`  ${termCode}: ${rows.length} rows`)
  return { termCode, rows }
}

async function main() {
  const { years, termCodes } = buildTermCodes()
  console.warn(`Fetching ${termCodes.length} terms (${startYear}–${endYear}${includeFa26 ? ', +FA26' : ', closed only'})…`)

  // Modest concurrency so we don't hammer the gateway
  const termRows = []
  const concurrency = 3
  for (let i = 0; i < termCodes.length; i += concurrency) {
    const chunk = termCodes.slice(i, i + concurrency)
    termRows.push(...(await Promise.all(chunk.map(fetchTerm))))
  }

  const offeredYearsByCode = new Map()
  const offeredTermsByCode = new Map()
  const lastTermByCode = new Map()

  for (const bucket of termRows) {
    const season = bucket.termCode.slice(0, 2)
    const yy = Number.parseInt(bucket.termCode.slice(2), 10)
    const year = Number.isFinite(yy) ? 2000 + yy : null
    if (!year) continue
    const order = seasonOrder[season] ?? 0

    for (const row of bucket.rows) {
      const code = String(row?.short_name || row?.shortName || '').trim().toUpperCase()
      if (!code) continue
      if (!offeredYearsByCode.has(code)) offeredYearsByCode.set(code, new Set())
      if (!offeredTermsByCode.has(code)) offeredTermsByCode.set(code, new Set())
      offeredYearsByCode.get(code).add(year)
      offeredTermsByCode.get(code).add(bucket.termCode)

      const prev = lastTermByCode.get(code)
      if (!prev || year > prev.year || (year === prev.year && order > prev.order)) {
        lastTermByCode.set(code, { year, order, term: bucket.termCode })
      }
    }
  }

  const courses = {}
  for (const [code, offeredYearsSet] of offeredYearsByCode.entries()) {
    const offeredYears = Array.from(offeredYearsSet).sort((a, b) => a - b)
    const termSet = offeredTermsByCode.get(code) ?? new Set()
    const yearCounts = Object.fromEntries(
      years.map((year) => {
        const yy = String(year % 100).padStart(2, '0')
        let count = 0
        for (const termCode of termSet) {
          if (termCode.endsWith(yy)) count++
        }
        return [String(year), count]
      }),
    )
    const yearsOffered = offeredYears.length
    const offerCountYears = Object.values(yearCounts).reduce((sum, n) => sum + n, 0)

    let pattern = 'irregular'
    if (yearsOffered >= yearsBack - 1) pattern = 'annual'
    else if (yearsOffered === 2 && offeredYears[1] - offeredYears[0] === 2) pattern = 'every_other_year'
    else if (offerCountYears <= 1) pattern = 'rare'

    const risk =
      pattern === 'annual' ? 'low' : pattern === 'every_other_year' ? 'medium' : 'high'

    courses[code] = {
      offerCountYears,
      yearsOffered,
      yearCounts,
      lastOfferedTerm: lastTermByCode.get(code)?.term ?? null,
      pattern,
      risk,
    }
  }

  const body = {
    generatedAt: new Date().toISOString(),
    yearsBack,
    startYear,
    endYear,
    frozenBeforeTerm: 'FA26',
    includedTerms: termCodes,
    includeFa26,
    courses,
  }

  const here = dirname(fileURLToPath(import.meta.url))
  const outPath = join(here, '../server/data/course-offering-patterns.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(body)}\n`, 'utf8')
  console.warn(`Wrote ${Object.keys(courses).length} courses → ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
