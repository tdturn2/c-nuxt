import { defineEventHandler } from 'h3'
import { requireDashboardStaff, toProxyError } from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)

  // SSO-style list: email unlocks all statuses. Do not forward Bearer.
  return await $fetch(`${auth.payloadBaseUrl}/api/connect-jobs/list`, {
    headers: { 'Content-Type': 'application/json' },
    query: {
      email: auth.email,
      limit: '100',
      sort: '-createdAt',
    },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch jobs')
  })
})
