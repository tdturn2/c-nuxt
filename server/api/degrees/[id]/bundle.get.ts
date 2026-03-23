// GET degree bundle (degree + specializations + sections with items). Auth: SSO session, pass email to Payload.
// Access enforced by Payload: admin, or Connect user with staff/faculty/registrar.
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { authenticateWithPayloadCMS } from '../../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Degree ID is required',
    })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    const response = await $fetch<any>(`${payloadBaseUrl}/api/degrees/${id}/bundle`, {
      query: { email },
    })
    return response
  } catch (err: any) {
    console.error('Degrees bundle API error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load degree bundle',
      data: err.data,
    })
  }
})
