// POST create specialization. Auth: SSO email (connect-api requireDegreeBuilder).
import { defineEventHandler, readBody } from 'h3'
import { degreeBuilderError, withDegreeBuilderAuth } from '../../utils/degreeBuilderProxy'

export default defineEventHandler(async (event) => {
  const { email, connectApiUrl, headers } = await withDegreeBuilderAuth(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>

  try {
    return await $fetch(`${connectApiUrl}/api/specializations/create`, {
      method: 'POST',
      headers,
      body: { ...body, email },
    })
  } catch (err: any) {
    degreeBuilderError(err, 'Failed to create specialization')
  }
})
