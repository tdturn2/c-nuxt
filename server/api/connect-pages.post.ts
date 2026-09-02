import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../utils/payloadAuth'
import { isConnectAdminUser } from '@shared/connectUserAccess'
import {
  assertCanEditConnectPagePath,
  connectApiOriginFromConfig,
  loadConnectUserForPageEdit,
  resolveCreateConnectPagePath,
} from '../utils/connectPageEditAccess'

function toProxyError(err: any, fallbackMessage: string) {
  const statusCode =
    err?.statusCode ??
    err?.response?.status ??
    err?.response?.statusCode ??
    err?.status ??
    500

  const data = err?.data ?? err?.response?._data ?? err?.response?.data
  const statusMessage =
    data?.message ||
    err?.statusMessage ||
    err?.message ||
    fallbackMessage

  return createError({ statusCode, statusMessage, data })
}

export default defineEventHandler(async (event) => {
  const { token, email: sessionEmail } = await authenticateWithPayloadCMS(event)
  if (!sessionEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const origin = connectApiOriginFromConfig(config)
  const connectUser = await loadConnectUserForPageEdit(origin, sessionEmail)

  const body = (await readBody(event).catch(() => ({}))) as any
  if (body?.email && body.email !== sessionEmail) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden - email mismatch' })
  }

  const rawTitle = typeof body?.title === 'string' ? body.title.trim() : ''
  const rawSlug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  if (!rawTitle) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  if (!rawSlug) throw createError({ statusCode: 400, statusMessage: 'Slug is required' })

  if (!isConnectAdminUser(connectUser)) {
    if (!connectUser) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const pagePath = await resolveCreateConnectPagePath(origin, {
      slug: rawSlug,
      parent: body.parent,
    })
    assertCanEditConnectPagePath(connectUser, pagePath)
  }

  const payloadBody =
    typeof body === 'object' && body != null
      ? { ...body, title: rawTitle, slug: rawSlug, email: sessionEmail }
      : { title: rawTitle, slug: rawSlug, email: sessionEmail }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await $fetch(`${origin}/api/connect-pages/create`, {
      method: 'POST',
      headers,
      body: payloadBody,
    })
  } catch (err: any) {
    console.error('connect-pages create error:', err)
    throw toProxyError(err, 'Failed to create page')
  }
})
