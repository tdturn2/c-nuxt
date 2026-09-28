// PATCH degree. Auth: SSO email (connect-api requireDegreeBuilder).
import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { degreeBuilderError, withDegreeBuilderAuth } from '../../utils/degreeBuilderProxy'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Degree ID is required' })

  const { email, connectApiUrl, headers } = await withDegreeBuilderAuth(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>

  try {
    return await $fetch(`${connectApiUrl}/api/degrees/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers,
      body: { ...body, email },
    })
  } catch (err: any) {
    degreeBuilderError(err, 'Failed to update degree')
  }
})
