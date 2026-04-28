import { createError, defineEventHandler, readBody } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../utils/dashboardForms'

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toPayloadId(value: unknown): string | number | null {
  const raw = asTrimmedString(value)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && String(n) === raw ? n : raw
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  const date = asTrimmedString(body.date)
  const location = asTrimmedString(body.location)
  const connectUser = toPayloadId(body.connectUser)
  const eucharistSpeaker = asTrimmedString(body.eucharistSpeaker)
  if (!date || !location || (connectUser == null && !eucharistSpeaker)) {
    throw createError({ statusCode: 400, statusMessage: 'Date, location, and either a speaker user or manual speaker name are required.' })
  }

  const payload: Record<string, any> = {
    date,
    location,
    eucharistSpeaker: eucharistSpeaker || null,
    active: body.active !== false,
  }
  if (connectUser != null) payload.connectUser = connectUser
  const speakerPhoto = toPayloadId(body.speakerPhoto)
  if (speakerPhoto != null) payload.speakerPhoto = speakerPhoto

  return await $fetch(`${auth.payloadBaseUrl}/api/connect-daily-eucharist-entries`, {
    method: 'POST',
    headers,
    body: payload,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create Daily Eucharist entry')
  })
})
