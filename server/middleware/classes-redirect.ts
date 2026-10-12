import { defineEventHandler, sendRedirect } from 'h3'

/** One redirect for /classes and /classes/. Route rules for both paths emit the same Vercel function. */
export default defineEventHandler((event) => {
  const path = event.path.split('?')[0] || ''
  if (path !== '/classes' && path !== '/classes/') return
  return sendRedirect(event, '/class-search', 301)
})
