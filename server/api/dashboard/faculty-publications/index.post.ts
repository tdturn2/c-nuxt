import { createError, defineEventHandler, readBody } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
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

function asNullableNumericRelationship(value: unknown): number | null {
  const rel = asNullableRelationship(value)
  if (rel == null) return null
  if (typeof rel === 'number') return Number.isFinite(rel) ? rel : null
  if (typeof rel === 'string' && /^\d+$/.test(rel.trim())) return Number(rel.trim())
  return null
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>

  const ownerId = asNullableNumericRelationship(body.owner)
  const type = asTrimmedString(body.type)
  const title = asTrimmedString(body.title)

  if (ownerId == null) {
    throw createError({ statusCode: 400, statusMessage: 'Faculty owner is required' })
  }
  if (!type) throw createError({ statusCode: 400, statusMessage: 'Publication type is required' })
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Publication title is required' })

  const imageId = body.image != null && body.image !== ''
    ? asNullableNumericRelationship(body.image)
    : null
  if (body.image != null && body.image !== '' && imageId == null) {
    throw createError({ statusCode: 400, statusMessage: 'Image ID must be numeric' })
  }

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-user-publications`, {
    event,
    auth,
    method: 'POST',
    body: {
      owner: ownerId,
      type,
      title,
      image: imageId,
      description: body.description ?? null,
      link: asNullableTrimmedString(body.link),
      releaseDate: asNullableTrimmedString(body.releaseDate),
    },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create faculty publication')
  })
})
