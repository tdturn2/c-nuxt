import { createError, defineEventHandler, getRouterParam } from 'h3'
import { resolveConnectApiUrl } from '../../../utils/connectApi'
import { proxyCachedMediaFile } from '../../../utils/cachedMediaFile'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')
  if (!filename) {
    throw createError({ statusCode: 400, statusMessage: 'Filename is required' })
  }

  const payloadBaseUrl = resolveConnectApiUrl()
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }

  return proxyCachedMediaFile(
    event,
    [`${payloadBaseUrl}/api/connect-pages-media/file/${encodeURIComponent(filename)}`],
    filename,
  )
})
