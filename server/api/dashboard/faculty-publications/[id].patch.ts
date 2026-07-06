import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
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
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Publication id is required' })

  const auth = await requireDashboardAdmin(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>

  const updateData: Record<string, unknown> = {}
  if (body.type !== undefined) {
    const type = asTrimmedString(body.type)
    if (!type) throw createError({ statusCode: 400, statusMessage: 'Publication type is required' })
    updateData.type = type
  }
  if (body.title !== undefined) {
    const title = asTrimmedString(body.title)
    if (!title) throw createError({ statusCode: 400, statusMessage: 'Publication title is required' })
    updateData.title = title
  }
  if (body.owner !== undefined) {
    const ownerId = asNullableNumericRelationship(body.owner)
    if (ownerId == null) throw createError({ statusCode: 400, statusMessage: 'Faculty owner is required' })
    updateData.owner = ownerId
  }
  if (body.image !== undefined) {
    updateData.image = body.image === null || body.image === ''
      ? null
      : asNullableNumericRelationship(body.image)
  }
  if (body.description !== undefined) updateData.description = body.description
  if (body.link !== undefined) updateData.link = asNullableTrimmedString(body.link)
  if (body.releaseDate !== undefined) updateData.releaseDate = asNullableTrimmedString(body.releaseDate)

  if (!Object.keys(updateData).length) {
    throw createError({ statusCode: 400, statusMessage: 'No fields to update' })
  }

  return await dashboardPayloadFetch(
    `${auth.payloadBaseUrl}/api/connect-user-publications/${encodeURIComponent(String(id))}`,
    {
      event,
      auth,
      method: 'PATCH',
      body: updateData,
    },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to update faculty publication')
  })
})
