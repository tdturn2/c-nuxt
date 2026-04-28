import { defineEventHandler, readBody, createError } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../utils/dashboardForms'

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asNullableTrimmedString(value: unknown): string | null {
  const v = asTrimmedString(value)
  return v ? v : null
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  const name = asTrimmedString(body.name)
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Speaker name is required' })

  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  return await $fetch(`${auth.payloadBaseUrl}/api/chapel-speakers`, {
    method: 'POST',
    headers,
    body: {
      name,
      speakerDescription: asNullableTrimmedString(body.speakerDescription),
      photo: body.photo || null,
      active: body.active !== false,
    },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create chapel speaker')
  })
})
