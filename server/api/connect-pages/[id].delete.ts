import { defineEventHandler, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'
import { isConnectAdminUser } from '@shared/connectUserAccess'
import {
  assertCanEditConnectPagePath,
  connectApiOriginFromConfig,
  loadConnectUserForPageEdit,
  resolveConnectPagePathById,
} from '../../utils/connectPageEditAccess'

export default defineEventHandler(async (event) => {
  const { token, email: sessionEmail } = await authenticateWithPayloadCMS(event)
  if (!sessionEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const origin = connectApiOriginFromConfig(config)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }

  const connectUser = await loadConnectUserForPageEdit(origin, sessionEmail)
  if (!isConnectAdminUser(connectUser)) {
    if (!connectUser) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    const { path } = await resolveConnectPagePathById(origin, id)
    assertCanEditConnectPagePath(connectUser, path)
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await $fetch(`${origin}/api/connect-pages/delete/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
      body: { email: sessionEmail },
    })
  } catch (err: any) {
    console.error('connect-pages delete error:', err)
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to delete page',
      data: err?.data,
    })
  }
})
