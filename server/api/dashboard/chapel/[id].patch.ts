import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
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

function toPayloadId(value: string): string | number {
  const n = Number(value)
  return Number.isFinite(n) && String(n) === value ? n : value
}

function asNullableNumericRelationship(value: unknown): number | null {
  const rel = asNullableRelationship(value)
  if (rel == null) return null
  if (typeof rel === 'number') return Number.isFinite(rel) ? rel : null
  if (typeof rel === 'string' && /^\d+$/.test(rel.trim())) return Number(rel.trim())
  return null
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>

  const isFutureEpisode = body.isFutureEpisode === true || String(body.isFutureEpisode || '').toLowerCase() === 'true'
  const episode = (body.episode || {}) as Record<string, any>
  const speakerInput = (body.speaker || {}) as Record<string, any>
  const speakerMode = asTrimmedString(speakerInput.mode) || 'existing'
  const speakerIdRaw = asTrimmedString(speakerInput.speakerId)
  const speakerName = asTrimmedString(speakerInput.name)

  let speakerId: string | number | undefined
  if (speakerMode === 'existing' && speakerIdRaw) {
    const parsedSpeakerId = asNullableNumericRelationship(speakerIdRaw)
    if (parsedSpeakerId == null) {
      throw createError({ statusCode: 400, statusMessage: 'Speaker ID must be numeric' })
    }
    speakerId = parsedSpeakerId
  } else if (speakerMode === 'new' && speakerName) {
    const createdSpeaker: any = await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/chapel-speakers`, {
      event,
      auth,
      method: 'POST',
      body: {
        name: speakerName,
        speakerDescription: asNullableTrimmedString(speakerInput.speakerDescription),
        photo: speakerInput.photo || null,
        active: speakerInput.active !== false,
      },
    }).catch((err: any) => {
      throw toProxyError(err, 'Failed to create chapel speaker')
    })
    speakerId = createdSpeaker?.id
  }

  const mp3Id = asNullableNumericRelationship(episode.mp3)
  if (episode.mp3 != null && episode.mp3 !== '' && mp3Id == null) {
    throw createError({ statusCode: 400, statusMessage: 'MP3 ID must be numeric' })
  }

  const patchBody: Record<string, any> = {
    date: asTrimmedString(episode.date) || undefined,
    title: episode.title !== undefined ? (asTrimmedString(episode.title) || null) : undefined,
    description:
      episode.description !== undefined ? (asTrimmedString(episode.description) || null) : undefined,
    campus: asTrimmedString(episode.campus) || undefined,
    mp3: mp3Id,
    vimeo: asNullableTrimmedString(episode.vimeo),
    vimeo_id: asNullableTrimmedString(episode.vimeo_id),
    vimeo_full: asNullableTrimmedString(episode.vimeo_full),
    vimeo_full_id: asNullableTrimmedString(episode.vimeo_full_id),
    youtube: asNullableTrimmedString(episode.youtube),
    active: isFutureEpisode ? false : episode.active !== false,
    is_podcast: isFutureEpisode ? false : episode.is_podcast !== false,
  }
  if (speakerId != null) patchBody.speaker = speakerId

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/chapel-podcasts/${encodeURIComponent(String(id))}`, {
    event,
    auth,
    method: 'PATCH',
    body: patchBody,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to update chapel episode')
  })
})
