import { hasFacultyHubAccess, isFacultyHubPath } from '@shared/facultyHubAccess'

export function useFacultyHubAccess() {
  const route = useRoute()
  const { status } = useAuth()

  const { data: connectUserData, pending, execute } = useFetch<any>('/api/connect-users/me', {
    key: 'faculty-hub-access-connect-user',
    immediate: false,
  })

  watch(
    status,
    (authStatus) => {
      if (authStatus === 'authenticated') execute()
    },
    { immediate: true },
  )

  const isFacultyHubRoute = computed(() => isFacultyHubPath(route.path))

  const facultyHubAccessReady = computed(() => {
    if (status.value !== 'authenticated') return true
    return !pending.value || connectUserData.value != null
  })

  const canAccessFacultyHub = computed(() => {
    if (status.value !== 'authenticated') return false
    return hasFacultyHubAccess(connectUserData.value?.doc)
  })

  watch(
    [isFacultyHubRoute, status, facultyHubAccessReady],
    ([isFacultyRoute, authStatus, ready]) => {
      if (!isFacultyRoute || !ready || authStatus !== 'unauthenticated') return
      const callbackUrl = encodeURIComponent(route.fullPath)
      navigateTo(`/signin?callbackUrl=${callbackUrl}`)
    },
    { immediate: true },
  )

  return {
    isFacultyHubRoute,
    facultyHubAccessReady,
    canAccessFacultyHub,
    authStatus: status,
  }
}
