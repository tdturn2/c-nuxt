import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    // Authenticate with PayloadCMS using SSO email
    const { token, email } = await authenticateWithPayloadCMS(event)

    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to update employee profile'
      })
    }

    const body = await readBody(event) as { 
      bio?: string | null
      employeeTitle?: string | null
      section?: string | null
      startDate?: string | null
      phone?: string | null
      location?: string | null
      department?: string | null
      publications?: any[] | null
      facultyBio?: any | null
      facultyPhoto?: number | null
      facultyPhotoSmall?: number | null
      expertise?: Array<{ id: string; item: string }> | null
      education?: Array<{ id: string; item: string }> | null
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Prepare update data - match the pattern from working endpoints
    const updateData: any = {}

    // Only add fields that are explicitly set (including null values)
    if (body.bio !== undefined) updateData.bio = body.bio
    if (body.employeeTitle !== undefined) updateData.employeeTitle = body.employeeTitle
    if (body.section !== undefined) updateData.section = body.section
    if (body.startDate !== undefined) updateData.startDate = body.startDate
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.location !== undefined) updateData.location = body.location
    if (body.department !== undefined) updateData.department = body.department
    if (body.publications !== undefined) updateData.publications = body.publications
    if (body.facultyBio !== undefined) updateData.facultyBio = body.facultyBio
    if (body.facultyPhoto !== undefined) updateData.facultyPhoto = body.facultyPhoto
    if (body.facultyPhotoSmall !== undefined) updateData.facultyPhotoSmall = body.facultyPhotoSmall
    if (body.expertise !== undefined) updateData.expertise = body.expertise
    if (body.education !== undefined) updateData.education = body.education

    // Use /profile endpoint for SSO users - match the exact pattern from working endpoints
    const response = await $fetch(`${payloadBaseUrl}/api/connect-users/profile`, {
      method: 'PATCH',
      headers,
      body: {
        ...updateData,
        email // Always include email for SSO authentication (required for SSO)
      }
    })

    // Normalize avatar URL if present
    if (response?.avatar?.url && !response.avatar.url.startsWith('http')) {
      response.avatar.url = `${payloadBaseUrl}${response.avatar.url}`
    }

    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update employee profile in PayloadCMS',
      data: error.data
    })
  }
})
