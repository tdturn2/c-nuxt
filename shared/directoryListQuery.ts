export type DirectoryListState = {
  page: number
  q: string
  country: string
  region: string
  city: string
}

export function queryValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') return item
    }
  }
  return ''
}

export function parseDirectoryListQuery(query: Record<string, unknown>): DirectoryListState {
  const country = queryValue(query.country).trim().toUpperCase()
  const region = country === 'US' ? queryValue(query.region).trim().toUpperCase() : ''
  const city = country === 'US' && region ? queryValue(query.city).trim() : ''
  const pageRaw = Number.parseInt(queryValue(query.page).trim(), 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 1 ? Math.floor(pageRaw) : 1
  return {
    page,
    q: queryValue(query.q).trim(),
    country,
    region,
    city,
  }
}

/** Query record for `router.replace`. Page 1 and empty filters are omitted. */
export function directoryListSearchParams(state: DirectoryListState): Record<string, string> {
  const country = state.country.trim().toUpperCase()
  const region = country === 'US' ? state.region.trim().toUpperCase() : ''
  const city = country === 'US' && region ? state.city.trim() : ''
  const q = state.q.trim()
  const out: Record<string, string> = {}
  if (country) out.country = country
  if (region) out.region = region
  if (city) out.city = city
  if (q) out.q = q
  if (state.page > 1) out.page = String(Math.floor(state.page))
  return out
}

export function sameDirectoryListQuery(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if ((a[key] ?? '') !== (b[key] ?? '')) return false
  }
  return true
}

/** One scroll place per directory. Filters live in the URL, so the path is enough. */
export function directoryScrollStorageKey(path: string): string {
  return `connect-directory-scroll:${path}`
}
