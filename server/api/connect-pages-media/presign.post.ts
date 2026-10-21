import { createError, defineEventHandler, readBody } from 'h3'
import { requireDashboardStaff, getDashboardPayloadHeaders, toProxyError } from '../../utils/dashboardForms'

function upstreamMessage(err: any): string | null {
  const data = err?.data ?? err?.response?._data
  if (typeof data?.error === 'string' && data.error.trim()) return data.error.trim()
  if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim()
  return null
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event, { pageAssets: true })
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>

  try {
    return await $fetch(`${auth.payloadBaseUrl}/api/connect-pages-media/presign`, {
      method: 'POST',
      headers: getDashboardPayloadHeaders(event, auth),
      body: {
        ...body,
        email: auth.email,
      },
    })
  } catch (err: any) {
    const message = upstreamMessage(err)
    if (message) {
      throw createError({
        statusCode: err?.statusCode || err?.status || 500,
        statusMessage: message,
        data: err?.data,
      })
    }
    throw toProxyError(err, 'Failed to prepare page asset upload')
  }
})
