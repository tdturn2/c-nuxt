import { createError, defineEventHandler, readBody } from 'h3'
import { resolveConnectApiUrl } from '../../utils/connectApi'
import { assertOffboardKey } from '../../utils/offboardAuth'

export default defineEventHandler(async (event) => {
  const key = assertOffboardKey(event, String(useRuntimeConfig().offboardKey || ''))
  const connectApiUrl = resolveConnectApiUrl()
  if (!connectApiUrl) {
    throw createError({ statusCode: 503, statusMessage: 'Connect API is not configured' })
  }

  const body = await readBody(event).catch(() => ({}))
  try {
    return await $fetch(`${connectApiUrl}/api/offboard/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body,
    })
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 500,
      statusMessage: err?.statusMessage || err?.data?.error || 'Failed to offboard students',
      data: err?.data,
    })
  }
})
