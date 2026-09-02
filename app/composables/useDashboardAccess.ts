import {
  canAccessDashboard,
  canAccessDashboardSection,
  type DashboardSection,
} from '@shared/dashboardAccess'
import { isConnectAdminUser } from '@shared/connectUserAccess'

/**
 * Dashboard access from Connect-user roles + groups (not Azure staff).
 * Admins see every section; groups such as chapel-podcast unlock specific ones.
 */
export function useDashboardAccess(options?: {
  meKey?: string
  connectUserKey?: string
}) {
  const { status } = useAuth()

  const { data: me, pending: mePending } = useFetch<any>('/api/users/me', {
    key: options?.meKey ?? 'dashboard-access-me',
  })

  const {
    data: connectUserData,
    pending: connectUserPending,
    execute: loadConnectUser,
  } = useFetch<any>('/api/connect-users/me', {
    key: options?.connectUserKey ?? 'dashboard-access-connect-user',
    immediate: false,
  })

  watch(
    [status, me],
    () => {
      if (status.value === 'authenticated' || me.value) loadConnectUser()
    },
    { immediate: true },
  )

  const accessUser = computed(() => {
    const doc = connectUserData.value?.doc
    return {
      roles: [
        ...(Array.isArray(doc?.roles) ? doc.roles : []),
        ...(Array.isArray(doc?.fields?.roles) ? doc.fields.roles : []),
        ...(Array.isArray(me.value?.roles) ? me.value.roles : []),
      ],
      groups: Array.isArray(doc?.groups) ? doc.groups : [],
    }
  })

  const accessPending = computed(() => {
    if (mePending.value) return true
    if (!me.value && status.value !== 'authenticated') return false
    return connectUserPending.value && !connectUserData.value
  })

  const isAdmin = computed(() => isConnectAdminUser(accessUser.value))
  const canOpenDashboard = computed(() => canAccessDashboard(accessUser.value))

  function canAccessSection(section: DashboardSection) {
    return canAccessDashboardSection(accessUser.value, section)
  }

  return {
    me,
    mePending: accessPending,
    connectUserData,
    isAdmin,
    canAccessDashboard: canOpenDashboard,
    canAccessSection,
  }
}
