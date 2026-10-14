// GET students who have started a degree map. Auth: SSO email (connect-api requireDegreeBuilder).
import { defineEventHandler } from 'h3'
import { degreeBuilderError, withDegreeBuilderAuth } from '../../../utils/degreeBuilderProxy'

export default defineEventHandler(async (event) => {
  const { email, connectApiUrl, headers } = await withDegreeBuilderAuth(event)

  try {
    return await $fetch(`${connectApiUrl}/api/student-degree-plans/students`, {
      headers,
      query: { email },
    })
  } catch (err: any) {
    degreeBuilderError(err, 'Failed to load students with degree maps')
  }
})
