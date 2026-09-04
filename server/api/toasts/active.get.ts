import { createError, defineEventHandler } from 'h3'
import { resolveConnectApiUrl } from '../../utils/connectApi'

/** Public list of enabled toasts for the client scheduler. */
export default defineEventHandler(async () => {
  const base = resolveConnectApiUrl()
  if (!base) throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })

  try {
    return await $fetch(`${base}/api/connect-toasts/active`)
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 502,
      statusMessage: err?.statusMessage || err?.message || 'Failed to load active toasts',
      data: err?.data,
    })
  }
})
