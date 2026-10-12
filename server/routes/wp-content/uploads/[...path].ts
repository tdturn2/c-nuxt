import { wpUploadsMediaPath } from '@shared/wpUploadsRedirect'
import { createError, defineEventHandler, getRouterParam, sendRedirect } from 'h3'

/** Old WordPress upload URLs. Guests follow this redirect to the public page-media file. */
export default defineEventHandler((event) => {
  const target = wpUploadsMediaPath(getRouterParam(event, 'path'))
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }
  return sendRedirect(event, target, 301)
})
