import { defineEventHandler, readBody } from 'h3'
import {
  getDashboardPayloadHeaders,
  normalizeDashboardFormSchema,
  normalizeFormMetadata,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const { payloadBaseUrl } = auth
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>

  const metadata = normalizeFormMetadata(body)
  const schema = normalizeDashboardFormSchema(body.schema)

  const payloadBody: Record<string, any> = {
    ...metadata,
    schema,
  }

  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  return await $fetch(`${payloadBaseUrl}/api/connect-forms`, {
    method: 'POST',
    headers,
    body: payloadBody,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create form')
  })
})
