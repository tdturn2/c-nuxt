import { defineEventHandler, readBody, createError } from 'h3'
import { requireDashboardStaff, toProxyError } from '../../../utils/dashboardForms'

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t || null
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>

  const jobTitle = trimOrNull(body.jobTitle)
  const companyName = trimOrNull(body.companyName)
  const description = trimOrNull(body.description)
  if (!jobTitle || !companyName || !description) {
    throw createError({
      statusCode: 400,
      statusMessage: 'jobTitle, companyName, and description are required',
    })
  }

  const submitBody: Record<string, unknown> = {
    email: auth.email,
    jobTitle,
    companyName,
    description,
    remotePosition: Boolean(body.remotePosition),
  }

  const location = trimOrNull(body.location)
  if (location) submitBody.location = location
  if (typeof body.jobType === 'string' && body.jobType) submitBody.jobType = body.jobType
  if (typeof body.jobCategory === 'string' && body.jobCategory) submitBody.jobCategory = body.jobCategory
  const applicationEmailOrUrl = trimOrNull(body.applicationEmailOrUrl)
  if (applicationEmailOrUrl) submitBody.applicationEmailOrUrl = applicationEmailOrUrl
  const companyWebsite = trimOrNull(body.companyWebsite)
  if (companyWebsite) submitBody.companyWebsite = companyWebsite
  const companyTagline = trimOrNull(body.companyTagline)
  if (companyTagline) submitBody.companyTagline = companyTagline
  const companyVideoUrl = trimOrNull(body.companyVideoUrl)
  if (companyVideoUrl) submitBody.companyVideoUrl = companyVideoUrl
  const companyTwitterUsername = trimOrNull(body.companyTwitterUsername)
  if (companyTwitterUsername) submitBody.companyTwitterUsername = companyTwitterUsername

  // Upstream submit always creates as pending. SSO-style: email only, no Bearer.
  const created = await $fetch<any>(`${auth.payloadBaseUrl}/api/connect-jobs/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: submitBody,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create job')
  })

  const status = typeof body.status === 'string' ? body.status.trim() : ''
  if (!status || status === 'pending' || !created?.id) return created

  return await $fetch(`${auth.payloadBaseUrl}/api/connect-jobs/${encodeURIComponent(String(created.id))}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: { email: auth.email, status },
  }).catch((err: any) => {
    throw toProxyError(err, 'Job created but failed to set status')
  })
})
