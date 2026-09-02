import { defineEventHandler, readBody, createError } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../../utils/dashboardForms'
import { asNullableRelationship } from '../../../utils/payloadRelationship'

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asNullableTrimmedString(value: unknown): string | null {
  const v = asTrimmedString(value)
  return v ? v : null
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event, { section: 'chapel-speakers' })
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  const name = asTrimmedString(body.name)
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Speaker name is required' })

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/chapel-speakers`, {
    event,
    auth,
    method: 'POST',
    body: {
      name,
      speakerDescription: asNullableTrimmedString(body.speakerDescription),
      photo: body.photo || null,
      connectUser: asNullableRelationship(body.connectUser),
      active: body.active !== false,
    },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create chapel speaker')
  })
})
