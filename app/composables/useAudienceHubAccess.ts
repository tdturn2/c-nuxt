import { hasFacultyHubAccess, isFacultyHubPath } from '@shared/facultyHubAccess'
import { hasStaffHubAccess, isStaffHubPath } from '@shared/staffHubAccess'

export function useAudienceHubAccess() {
  const route = useRoute()
  const { status } = useAuth()

  const { data: connectUserData, pending, execute } = useFetch<any>('/api/connect-users/me', {
    key: 'audience-hub-access-connect-user',
    immediate: false,
  })

  watch(
    status,
    (authStatus) => {
      if (authStatus === 'authenticated') execute()
    },
    { immediate: true },
  )

  const connectUserDoc = computed(() => connectUserData.value?.doc)

  const audienceHubAccessReady = computed(() => {
    if (status.value !== 'authenticated') return true
    return !pending.value || connectUserData.value != null
  })

  const isFacultyHubRoute = computed(() => isFacultyHubPath(route.path))
  const isStaffHubRoute = computed(() => isStaffHubPath(route.path))
  const isProtectedAudienceHubRoute = computed(() => isFacultyHubRoute.value || isStaffHubRoute.value)

  const canAccessFacultyHub = computed(() => {
    if (status.value !== 'authenticated') return false
    return hasFacultyHubAccess(connectUserDoc.value)
  })

  const canAccessStaffHub = computed(() => {
    if (status.value !== 'authenticated') return false
    return hasStaffHubAccess(connectUserDoc.value)
  })

  watch(
    [isProtectedAudienceHubRoute, status, audienceHubAccessReady],
    ([isProtectedRoute, authStatus, ready]) => {
      if (!isProtectedRoute || !ready || authStatus !== 'unauthenticated') return
      const callbackUrl = encodeURIComponent(route.fullPath)
      navigateTo(`/signin?callbackUrl=${callbackUrl}`)
    },
    { immediate: true },
  )

  return {
    authStatus: status,
    audienceHubAccessReady,
    connectUserDoc,
    isFacultyHubRoute,
    isStaffHubRoute,
    isProtectedAudienceHubRoute,
    canAccessFacultyHub,
    canAccessStaffHub,
    facultyHubAccessReady: audienceHubAccessReady,
    staffHubAccessReady: audienceHubAccessReady,
  }
}
