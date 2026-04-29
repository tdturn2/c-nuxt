import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
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

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  const isFutureEpisode = body.isFutureEpisode === true || String(body.isFutureEpisode || '').toLowerCase() === 'true'
  const episode = (body.episode || {}) as Record<string, any>
  const speakerInput = (body.speaker || {}) as Record<string, any>
  const speakerMode = asTrimmedString(speakerInput.mode) || 'existing'
  const speakerIdRaw = asTrimmedString(speakerInput.speakerId)
  const speakerName = asTrimmedString(speakerInput.name)

  let speakerId: string | number | undefined
  if (speakerMode === 'existing' && speakerIdRaw) {
    speakerId = toPayloadId(speakerIdRaw)
  } else if (speakerMode === 'new' && speakerName) {
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
  }

  const patchBody: Record<string, any> = {
    date: asTrimmedString(episode.date) || undefined,
    title: episode.title !== undefined ? (asTrimmedString(episode.title) || null) : undefined,
    campus: asTrimmedString(episode.campus) || undefined,
    mp3: asNullableRelationship(episode.mp3),
    vimeo: asNullableTrimmedString(episode.vimeo),
    vimeo_id: asNullableTrimmedString(episode.vimeo_id),
    vimeo_full: asNullableTrimmedString(episode.vimeo_full),
    vimeo_full_id: asNullableTrimmedString(episode.vimeo_full_id),
    youtube: asNullableTrimmedString(episode.youtube),
    active: isFutureEpisode ? false : episode.active !== false,
    is_podcast: isFutureEpisode ? false : episode.is_podcast !== false,
    _status: isFutureEpisode ? 'draft' : 'published',
  }
  if (speakerId != null) patchBody.speaker = speakerId

  return await $fetch(`${auth.payloadBaseUrl}/api/chapel-podcasts/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers,
    body: patchBody,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to update chapel episode')
  })
})
