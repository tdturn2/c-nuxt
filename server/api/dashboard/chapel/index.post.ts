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

function toPayloadId(value: string): string | number {
  const n = Number(value)
  return Number.isFinite(n) && String(n) === value ? n : value
}

function asNullableRelationship(value: unknown): string | number | null {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const v = value.trim()
    if (!v) return null
    return /^\d+$/.test(v) ? Number(v) : v
  }
  if (typeof value === 'object' && (value as any).id != null) {
    return asNullableRelationship((value as any).id)
  }
  return null
}

function asNullableNumericRelationship(value: unknown): number | null {
  const rel = asNullableRelationship(value)
  if (rel == null) return null
  if (typeof rel === 'number') return Number.isFinite(rel) ? rel : null
  if (typeof rel === 'string' && /^\d+$/.test(rel.trim())) return Number(rel.trim())
  return null
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  const isFutureEpisode = body.isFutureEpisode === true || String(body.isFutureEpisode || '').toLowerCase() === 'true'
  const episode = (body.episode || {}) as Record<string, any>
  const speakerInput = (body.speaker || {}) as Record<string, any>

  const episodeDate = asTrimmedString(episode.date)
  if (!episodeDate) {
    throw createError({ statusCode: 400, statusMessage: 'Episode date is required' })
  }

  const speakerMode = asTrimmedString(speakerInput.mode) || 'existing'
  const speakerIdRaw = asTrimmedString(speakerInput.speakerId)
  const speakerName = asTrimmedString(speakerInput.name)

  let speakerId: string | number
  let speakerLabel = ''

  if (speakerMode === 'existing') {
    if (!speakerIdRaw) throw createError({ statusCode: 400, statusMessage: 'Existing speaker is required' })
    const parsedSpeakerId = asNullableNumericRelationship(speakerIdRaw)
    if (parsedSpeakerId == null) {
      throw createError({ statusCode: 400, statusMessage: 'Speaker ID must be numeric' })
    }
    speakerId = parsedSpeakerId
    speakerLabel = speakerName
  } else {
    if (!speakerName) throw createError({ statusCode: 400, statusMessage: 'Speaker name is required' })
    const createdSpeaker: any = await $fetch(`${auth.payloadBaseUrl}/api/chapel-speakers`, {
      method: 'POST',
      headers,
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
    speakerLabel = asTrimmedString(createdSpeaker?.name) || speakerName
  }

  const title = asTrimmedString(episode.title)
  const campus = asTrimmedString(episode.campus) || 'KY'
  const mp3Id = asNullableNumericRelationship(episode.mp3)
  if (episode.mp3 != null && episode.mp3 !== '' && mp3Id == null) {
    throw createError({ statusCode: 400, statusMessage: 'MP3 ID must be numeric' })
  }

  const createdEpisode = await $fetch(`${auth.payloadBaseUrl}/api/chapel-podcasts`, {
    method: 'POST',
    headers,
    body: {
      _status: isFutureEpisode ? 'draft' : 'published',
      date: episodeDate,
      title: title || null,
      speaker: speakerId,
      campus,
      mp3: mp3Id,
      vimeo: asNullableTrimmedString(episode.vimeo),
      vimeo_id: asNullableTrimmedString(episode.vimeo_id),
      vimeo_full: asNullableTrimmedString(episode.vimeo_full),
      vimeo_full_id: asNullableTrimmedString(episode.vimeo_full_id),
      youtube: asNullableTrimmedString(episode.youtube),
      active: isFutureEpisode ? false : episode.active !== false,
      is_podcast: isFutureEpisode ? false : episode.is_podcast !== false,
    },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create chapel episode')
  })

  return {
    ok: true,
    episode: createdEpisode,
    speaker: {
      id: speakerId,
      name: speakerLabel || null,
    },
  }
})
