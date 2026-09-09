import { defineEventHandler, readBody } from 'h3'
import { requireDashboardStaff, getDashboardPayloadHeaders, toProxyError } from '../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event, { section: 'chapel' })
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>

  try {
    return await $fetch(`${auth.payloadBaseUrl}/api/chapel-podcast-media/presign`, {
      method: 'POST',
      headers: getDashboardPayloadHeaders(event, auth),
      body: {
        ...body,
        email: auth.email,
      },
    })
  } catch (err: any) {
    throw toProxyError(err, 'Failed to prepare chapel MP3 upload')
  }
})
