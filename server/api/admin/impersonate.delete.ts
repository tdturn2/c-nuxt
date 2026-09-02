import { createError, defineEventHandler, getCookie } from 'h3'
import { authenticateWithConnectApi } from '../../utils/payloadAuth'
import { clearViewAsCookie } from '../../utils/impersonation'
import { VIEW_AS_COOKIE_NAME, verifyViewAsCookie } from '../../utils/viewAsCookie'

export default defineEventHandler(async (event) => {
  const { email } = await authenticateWithConnectApi(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const raw = getCookie(event, VIEW_AS_COOKIE_NAME)
  if (raw) {
    const secret = String(useRuntimeConfig().authSecret || '').trim()
    const payload = secret ? verifyViewAsCookie(raw, secret) : null
    const session = email.trim().toLowerCase()
    if (payload && payload.actorEmail !== session) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
    console.info('[impersonation] stop', {
      actor: session,
      role: payload?.role ?? null,
    })
  }

  clearViewAsCookie(event)
  return { ok: true, impersonation: { active: false } }
})
