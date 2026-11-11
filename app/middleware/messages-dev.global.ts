import { canAccessMessagesDev, isMessagesPath } from '@shared/messagesDevAccess'
import type { ConnectUserAccessLike } from '@shared/connectUserAccess'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!isMessagesPath(to.path)) return

  const { data, status, getSession } = useAuth()
  if (status.value === 'loading') await getSession()

  const session = data.value as { user?: { email?: string | null }; groups?: unknown } | null
  const access = {
    email: session?.user?.email,
    directoryGroups: session?.groups,
  }
  if (canAccessMessagesDev(access)) return

  try {
    const requestFetch = useRequestFetch()
    const me = await requestFetch<ConnectUserAccessLike>('/api/users/me')
    if (canAccessMessagesDev({ ...access, connectUser: me })) return
  } catch {
    // Signed-out users and failed profile loads are sent home.
  }

  return navigateTo('/')
})
