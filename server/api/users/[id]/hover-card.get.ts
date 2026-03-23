// GET hover card data for a user: name, roles, title, degree, from (for post author cards)
import { defineEventHandler, createError, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID is required'
    })
  }

  try {
    const user = await $fetch(`${payloadBaseUrl}/api/connect-users/${id}`, {
      headers: { 'Content-Type': 'application/json' }
    }) as {
      id: number
      name?: string
      email?: string
      avatar?: { url?: string } | null
      avatarConnectUserMedia?: { url?: string } | null
      roles?: string[]
      employeeTitle?: string | null
    }

    let from: string | null = null
    let degree: string | null = null

    const surveyRes = await $fetch<{ answers?: Record<string, unknown> }>(
      `${payloadBaseUrl}/api/user-survey-responses/by-user/${id}`
    ).catch(() => null)

    if (surveyRes?.answers && typeof surveyRes.answers === 'object') {
      const a = surveyRes.answers
      if (a['from'] != null && String(a['from']).trim()) from = String(a['from']).trim()
      if (a['current-degree'] != null && String(a['current-degree']).trim()) degree = String(a['current-degree']).trim()
    }

    let avatarUrl: string | null = null
    const avatar = user.avatarConnectUserMedia || user.avatar || null
    if (avatar?.url) {
      const url = avatar.url
      avatarUrl = url.startsWith('http') ? url : `${payloadBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`
    }

    return {
      name: user.name ?? '',
      email: user.email ?? '',
      roles: Array.isArray(user.roles) ? user.roles : [],
      employeeTitle: user.employeeTitle ?? null,
      from,
      degree,
      avatarUrl
    }
  } catch (err: any) {
    if (err.statusCode === 404) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }
    console.error('Hover card API Error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load hover card'
    })
  }
})
