// DELETE degree. Auth: SSO email (connect-api requireDegreeBuilder).
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { degreeBuilderError, withDegreeBuilderAuth } from '../../utils/degreeBuilderProxy'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Degree ID is required' })

  const { email, connectApiUrl, headers } = await withDegreeBuilderAuth(event)

  try {
    return await $fetch(`${connectApiUrl}/api/degrees/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
      body: { email },
      query: { email },
    })
  } catch (err: any) {
    degreeBuilderError(err, 'Failed to delete degree')
  }
})
