type AlumniRecord = {
  id: number
  full_name: string
  full_name_with_m?: string
  last_name?: string
  first_name?: string
  middle_name?: string
  degree_1?: string
  degree_1_date?: string
  degree_1_year?: number | string
  degree_2?: string
  degree_2_date?: string
  degree_2_year?: number | string
  degree_3?: string
  degree_3_date?: string
  degree_3_year?: number | string
  degree_4?: string
  degree_4_date?: string
  degree_4_year?: number | string
}

type IndexedAlumniRecord = AlumniRecord & {
  _search: string
}

let indexedAlumni: IndexedAlumniRecord[] | null = null

function normalizeText(value: unknown): string {
  if (value == null) return ''
  return String(value).toLowerCase()
}

async function getIndexedAlumni(): Promise<IndexedAlumniRecord[]> {
  if (indexedAlumni) return indexedAlumni

  const mod = await import('../../data/alumni-data.js')
  const rows = (mod.default || []) as AlumniRecord[]

  indexedAlumni = rows.map((row) => {
    const searchable = [
      row.full_name,
      row.full_name_with_m,
      row.first_name,
      row.last_name,
      row.middle_name,
      row.degree_1,
      row.degree_2,
      row.degree_3,
      row.degree_4,
      row.degree_1_year,
      row.degree_2_year,
      row.degree_3_year,
      row.degree_4_year,
    ]
      .filter(Boolean)
      .map(normalizeText)
      .join(' ')

    return {
      ...row,
      _search: searchable,
    }
  })

  return indexedAlumni
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
  const page = Math.max(1, parseInt(typeof query.page === 'string' ? query.page : '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(typeof query.limit === 'string' ? query.limit : '25', 10) || 25))
  const year = typeof query.year === 'string' && query.year.trim() ? parseInt(query.year, 10) : null

  const rows = await getIndexedAlumni()

  const tokens = q.split(/\s+/).filter(Boolean)
  const filtered = rows.filter((row) => {
    if (year) {
      const years = [row.degree_1_year, row.degree_2_year, row.degree_3_year, row.degree_4_year]
        .map((v) => parseInt(String(v || ''), 10))
        .filter((v) => Number.isFinite(v))
      if (!years.includes(year)) return false
    }

    if (!tokens.length) return true
    return tokens.every((token) => row._search.includes(token))
  })

  const start = (page - 1) * limit
  const docs = filtered.slice(start, start + limit).map(({ _search, ...row }) => row)

  return {
    docs,
    totalDocs: filtered.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    hasPrevPage: page > 1,
    hasNextPage: start + limit < filtered.length,
  }
})
