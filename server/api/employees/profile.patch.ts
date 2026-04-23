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
      alumniOptIn?: boolean
      alumniDegrees?: Array<{
        id?: string
        degree?: string | null
        graduationYear?: number | string | null
        institution?: string | null
        honors?: string | null
      }> | null
      alumniContact?: {
        email?: string | null
        phone?: string | null
        facebook?: string | null
        x?: string | null
        instagram?: string | null
      } | null
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
    if (body.alumniOptIn !== undefined) updateData.alumniOptIn = Boolean(body.alumniOptIn)
    if (body.alumniDegrees !== undefined) {
      updateData.alumniDegrees = Array.isArray(body.alumniDegrees)
        ? body.alumniDegrees
            .map((entry) => ({
              degree: (entry.degree || '').trim(),
              graduationYear: entry.graduationYear,
              institution: entry.institution?.trim() || null,
              honors: entry.honors?.trim() || null,
            }))
            .filter((entry) => entry.degree.length > 0)
        : []
    }
    if (body.alumniContact !== undefined) {
      updateData.alumniContact = body.alumniContact
        ? {
            email: body.alumniContact.email?.trim() || null,
            phone: body.alumniContact.phone?.trim() || null,
            facebook: body.alumniContact.facebook?.trim() || null,
            x: body.alumniContact.x?.trim() || null,
            instagram: body.alumniContact.instagram?.trim() || null,
          }
        : null
    }

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
