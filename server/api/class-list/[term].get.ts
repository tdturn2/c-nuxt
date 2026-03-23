// Proxy class list from Asbury Seminary by term.
// URL template: https://my.asburyseminary.edu/ClassListDataGateway/ClassList/Where/Term/{term}
// Example: .../Term/SP26
// Cached 1 hour per term; stale-while-revalidate so slow upstream doesn't block responses.
import { getRouterParam, createError } from 'h3'

const BASE_URL = 'https://my.asburyseminary.edu/ClassListDataGateway/ClassList/Where/Term'

const CACHE_MAX_AGE = 60 * 60 // 1 hour

export default defineCachedEventHandler(
  async (event) => {
    const term = getRouterParam(event, 'term')
    if (!term || !/^[A-Z0-9]+$/i.test(term)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid term' })
    }
    try {
      const data = await $fetch<any>(`${BASE_URL}/${term}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AsburyConnect/1.0)',
        },
      })
      if (Array.isArray(data)) return data
      if (data && typeof data === 'object' && Array.isArray((data as any).data)) return (data as any).data
      if (data && typeof data === 'object' && Array.isArray((data as any).items)) return (data as any).items
      // Response may be raw JSON string if Content-Type wasn't application/json
      if (typeof data === 'string' && data.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(data) as any[]
          return Array.isArray(parsed) ? parsed : []
        } catch {
          // fall through to return []
        }
      }
      return []
    } catch (err: any) {
      console.error('Class list API error:', err)
      throw createError({
        statusCode: err.statusCode || 502,
        statusMessage: err.statusMessage || 'Failed to load class list'
      })
    }
  },
  {
    maxAge: CACHE_MAX_AGE,
    name: 'class-list',
    getKey: (event) => {
      const term = getRouterParam(event, 'term')
      return `term-${term ?? 'unknown'}`
    },
  }
)
