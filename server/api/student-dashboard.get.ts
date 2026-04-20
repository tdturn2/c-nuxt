import { createError, defineEventHandler } from 'h3'
import { getStudentDashboardData } from '../utils/instructure'
import { getSSOSession } from '../utils/ssoAuth'

export default defineEventHandler(async (event) => {
  const { email } = await getSSOSession(event)

  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    return await getStudentDashboardData(email)
  } catch (error: any) {
    // Preserve upstream status/statusMessage so client sees the real Canvas failure.
    if (error?.statusCode || error?.statusMessage) {
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: error.statusMessage || 'Failed to load student dashboard',
        data: error.data || null
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'Failed to load student dashboard'
    })
  }
})
