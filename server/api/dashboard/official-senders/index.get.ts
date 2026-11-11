import { defineEventHandler } from 'h3'
import { toBrowserMediaUrl } from '@shared/mediaUrls'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const data = await dashboardPayloadFetch<{ docs?: Array<Record<string, unknown>> }>(
    `${auth.payloadBaseUrl}/api/connect-messages/official-senders`,
    { event, auth },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to load official accounts')
  })
  const docs = Array.isArray(data?.docs) ? data.docs : []
  return {
    docs: docs.map((doc) => ({
      ...doc,
      avatarUrl: toBrowserMediaUrl(doc.avatarUrl),
    })),
  }
})
