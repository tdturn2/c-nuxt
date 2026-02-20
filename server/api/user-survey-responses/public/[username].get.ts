// GET a user's survey responses for public profile (by username)
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const username = (event.context.params as { username: string })?.username
  if (!username) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username is required'
    })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    // Resolve username to user (email + id)
    const email = `${username}@asburyseminary.edu`
    const userResponse = await $fetch(`${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(email)}&limit=1`) as { docs: Array<{ id: number; email: string }> }
    const user = userResponse?.docs?.[0]
    if (!user) {
      return null
    }

    // Payload public endpoint: GET /api/user-survey-responses/by-user/:userId (no auth)
    const res = await $fetch<{ id: number; userId: number; answers: Record<string, unknown>; updatedAt: string }>(
      `${payloadBaseUrl}/api/user-survey-responses/by-user/${user.id}`
    ).catch(() => null)

    if (!res?.answers) return null
    return { answers: res.answers, updatedAt: res.updatedAt ?? '' }
  } catch (err: any) {
    if (err.statusCode === 404) return null
    console.error('Survey public API Error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load survey data',
      data: err.data
    })
  }
})
