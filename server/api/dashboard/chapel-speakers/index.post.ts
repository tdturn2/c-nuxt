import { defineEventHandler, readBody } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event, { section: 'chapel-speakers' })
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  const episodeDate = typeof body.date === 'string' ? body.date.trim() : ''
  const requestedSpeakerName = typeof body.name === 'string' ? body.name.trim() : ''
  const speakerIdRaw = body.speakerId
  const speakerId =
    typeof speakerIdRaw === 'number' || typeof speakerIdRaw === 'string'
      ? String(speakerIdRaw).trim()
      : ''
  const isFutureEpisode = body.isFutureEpisode === true || String(body.isFutureEpisode || '').toLowerCase() === 'true'
  delete body.date
  delete body.speakerId
  delete body.isFutureEpisode
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  function toPayloadId(value: string): string | number {
    const n = Number(value)
    return Number.isFinite(n) && String(n) === value ? n : value
  }

  let createdSpeaker: any = null
  if (speakerId) {
    createdSpeaker = { id: toPayloadId(speakerId), name: requestedSpeakerName || '' }
  } else {
    createdSpeaker = await $fetch(`${auth.payloadBaseUrl}/api/chapel-speakers`, {
      method: 'POST',
      headers,
      body,
    }).catch((err: any) => {
      throw toProxyError(err, 'Failed to create chapel speaker')
    })
  }

  if (episodeDate && createdSpeaker?.id) {
    const speakerName = (typeof createdSpeaker?.name === 'string' && createdSpeaker.name.trim()) || requestedSpeakerName
    const titleDate = new Date(episodeDate)
    const normalizedDate = Number.isNaN(titleDate.getTime())
      ? episodeDate
      : titleDate.toISOString().slice(0, 10)
    const title = speakerName
      ? `Chapel - ${speakerName} (${normalizedDate})`
      : `Chapel - ${normalizedDate}`

    await $fetch(`${auth.payloadBaseUrl}/api/chapel-podcasts`, {
      method: 'POST',
      headers,
      body: {
        date: episodeDate,
        title,
        speaker: createdSpeaker.id,
        active: !isFutureEpisode,
        is_podcast: !isFutureEpisode,
      },
    }).catch((err: any) => {
      throw toProxyError(err, 'Failed to create chapel episode')
    })
  }

  return createdSpeaker
})
