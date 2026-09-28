// POST create degree. Auth: SSO email (connect-api requireDegreeBuilder).
import { defineEventHandler, readBody } from 'h3'
import { degreeBuilderError, withDegreeBuilderAuth } from '../../utils/degreeBuilderProxy'

export default defineEventHandler(async (event) => {
  const { email, connectApiUrl, headers } = await withDegreeBuilderAuth(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>

  try {
    return await $fetch(`${connectApiUrl}/api/degrees/create`, {
      method: 'POST',
      headers,
      body: { ...body, email },
    })
  } catch (err: any) {
    degreeBuilderError(err, 'Failed to create degree')
  }
})
