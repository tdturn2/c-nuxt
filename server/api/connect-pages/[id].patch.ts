import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'
import { isConnectAdminUser } from '@shared/connectUserAccess'
import {
  assertCanEditConnectPagePath,
  connectApiOriginFromConfig,
  loadConnectUserForPageEdit,
  resolveConnectPagePathById,
} from '../../utils/connectPageEditAccess'

export default defineEventHandler(async (event) => {
  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const origin = connectApiOriginFromConfig(config)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }

  const connectUser = await loadConnectUserForPageEdit(origin, email)
  if (!isConnectAdminUser(connectUser)) {
    if (!connectUser) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const { path } = await resolveConnectPagePathById(origin, id)
    assertCanEditConnectPagePath(connectUser, path)
  }

  const body = await readBody(event).catch(() => ({}))
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await $fetch(`${origin}/api/connect-pages/${id}`, {
      method: 'PATCH',
      headers,
      body: { ...(typeof body === 'object' && body ? body : {}), email },
    })
  } catch (err: any) {
    console.error('connect-pages update error:', err)
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to update page',
      data: err?.data,
    })
  }
})
