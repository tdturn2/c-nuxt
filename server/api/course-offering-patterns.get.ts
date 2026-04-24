function normalizeClassListPayload(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    if (Array.isArray(obj.data)) return obj.data as any[]
    if (Array.isArray(obj.items)) return obj.items as any[]
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

export default defineCachedEventHandler(
  async () => {
    const API_BASE = 'https://my.asburyseminary.edu/ClassListDataGateway/ClassList/Where/Term'
    const nowYear = new Date().getFullYear()
    const yearsBack = 4
    const startYear = nowYear - yearsBack + 1
    const years = Array.from({ length: yearsBack }, (_, idx) => startYear + idx)
    const seasonOrder: Record<string, number> = { SP: 1, JA: 2, SU: 3, FA: 4 }

    const termCodes: string[] = []
    for (const year of years) {
      const yy = String(year % 100).padStart(2, '0')
      const seasons = year <= 2025 ? ['SP', 'JA', 'SU', 'FA'] : ['SP', 'SU', 'FA']
      for (const season of seasons) termCodes.push(`${season}${yy}`)
    }

    const termRows = await Promise.all(
      termCodes.map(async (termCode) => {
        try {
          const response = await fetch(`${API_BASE}/${termCode}`, {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'AsburyConnect-OfferingPatterns/1.0',
            },
          })
          if (!response.ok) return { termCode, rows: [] as any[] }
          const json = await response.json().catch(() => [])
          return { termCode, rows: normalizeClassListPayload(json) }
        } catch {
          return { termCode, rows: [] as any[] }
        }
      }),
    )

    const offeredYearsByCode = new Map<string, Set<number>>()
    const offeredTermsByCode = new Map<string, Set<string>>()
    const lastTermByCode = new Map<string, { year: number; order: number; term: string }>()

    for (const bucket of termRows) {
      const season = bucket.termCode.slice(0, 2)
      const yy = Number.parseInt(bucket.termCode.slice(2), 10)
      const year = Number.isFinite(yy) ? 2000 + yy : null
      if (!year) continue
      const order = seasonOrder[season] ?? 0

      for (const row of bucket.rows) {
        const code = String(row?.short_name || row?.shortName || '').trim().toUpperCase()
        if (!code) continue
        if (!offeredYearsByCode.has(code)) offeredYearsByCode.set(code, new Set<number>())
        if (!offeredTermsByCode.has(code)) offeredTermsByCode.set(code, new Set<string>())
        offeredYearsByCode.get(code)!.add(year)
        offeredTermsByCode.get(code)!.add(bucket.termCode)

        const prev = lastTermByCode.get(code)
        if (!prev || year > prev.year || (year === prev.year && order > prev.order)) {
          lastTermByCode.set(code, { year, order, term: bucket.termCode })
        }
      }
    }

    const courses: Record<string, {
      offerCountYears: number
      yearsOffered: number
      yearCounts: Record<string, number>
      lastOfferedTerm: string | null
      pattern: 'annual' | 'every_other_year' | 'rare' | 'irregular'
      risk: 'low' | 'medium' | 'high'
    }> = {}

    for (const [code, offeredYearsSet] of offeredYearsByCode.entries()) {
      const offeredYears = Array.from(offeredYearsSet).sort((a, b) => a - b)
      const termSet = offeredTermsByCode.get(code) ?? new Set<string>()
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

      let pattern: 'annual' | 'every_other_year' | 'rare' | 'irregular' = 'irregular'
      if (yearsOffered >= yearsBack - 1) pattern = 'annual'
      else if (yearsOffered === 2 && offeredYears[1] - offeredYears[0] === 2) pattern = 'every_other_year'
      else if (offerCountYears <= 1) pattern = 'rare'

      const risk: 'low' | 'medium' | 'high' =
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

    return {
      generatedAt: new Date().toISOString(),
      yearsBack,
      startYear,
      endYear: nowYear,
      courses,
    }
  },
  {
    // Aggregate historical data; longer TTL cuts cold starts on serverless (e.g. Vercel).
    maxAge: 60 * 60,
    name: 'course-offering-patterns',
    getKey: () => 'years-4-v2',
  },
)
