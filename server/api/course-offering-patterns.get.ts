import { setHeader } from 'h3'
import snapshot from '../data/course-offering-patterns.json' with { type: 'json' }

/**
 * Serve precomputed offering patterns (historical ClassList terms are fixed).
 * Regenerated offline via: npm run generate:course-offering-patterns
 * No live ClassList fan-out on request — avoids Vercel cold-start storms.
 */
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400')
  return snapshot
})
