// GET one student's degree maps for an advisor. Auth: SSO email (connect-api requireDegreeBuilder).
import { createError, defineEventHandler, getRouterParam } from 'h3'
import { degreeBuilderError, withDegreeBuilderAuth } from '../../../utils/degreeBuilderProxy'

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId')
  if (!userId || !/^\d+$/.test(userId)) {
    throw createError({ statusCode: 400, statusMessage: 'Student id is required' })
  }

  const { email, connectApiUrl, headers } = await withDegreeBuilderAuth(event)

  try {
    return await $fetch(`${connectApiUrl}/api/student-degree-plans/advisor/${encodeURIComponent(userId)}`, {
      headers,
      query: { email },
    })
  } catch (err: any) {
    degreeBuilderError(err, 'Failed to load student degree map')
  }
})
