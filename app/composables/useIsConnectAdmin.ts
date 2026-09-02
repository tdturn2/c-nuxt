import { normalizeConnectGroupSlugs } from '@shared/connectUserAccess'
import { canEditPageByGroups } from '@shared/pageEditorGroups'

/**
 * Detect Connect admins (role or admin-ish group), matching AdminDashboardFab.
 */
export function useIsConnectAdmin(options?: {
  meKey?: string
  connectUserKey?: string
}) {
  const { status } = useAuth()

  const { data: me } = useFetch<any>('/api/users/me', {
    key: options?.meKey ?? 'connect-is-admin-me',
  })

  const {
    data: connectUserData,
    execute: loadConnectUser,
  } = useFetch<any>('/api/connect-users/me', {
    key: options?.connectUserKey ?? 'connect-is-admin-connect-user',
    immediate: false,
  })

  watch(status, (authStatus) => {
    if (authStatus === 'authenticated') loadConnectUser()
  }, { immediate: true })

  const isConnectAdmin = computed(() => {
    const roles: string[] = [
      ...(Array.isArray(connectUserData.value?.doc?.roles) ? connectUserData.value.doc.roles : []),
      ...(Array.isArray(connectUserData.value?.doc?.fields?.roles) ? connectUserData.value.doc.fields.roles : []),
      ...(Array.isArray(me.value?.roles) ? me.value.roles : []),
    ]
      .map((role) => String(role || '').trim().toLowerCase())
      .filter(Boolean)

    if (roles.includes('admin')) return true

    const groups = Array.isArray(connectUserData.value?.doc?.groups)
      ? connectUserData.value.doc.groups
      : []
    return groups.some((group: any) => {
      const slug = String(group?.slug || '').trim().toLowerCase()
      const name = String(group?.name || '').trim().toLowerCase()
      const tag = `${slug} ${name}`.trim()
      return (
        tag === 'admin' ||
        tag.includes('admin ') ||
        tag.includes(' admin') ||
        tag.includes('connect-admin') ||
        tag.includes('connect admin')
      )
    })
  })

  const isStaff = computed(() => {
    const roles: string[] = [
      ...(Array.isArray(me.value?.roles) ? me.value.roles : []),
      ...(Array.isArray(connectUserData.value?.doc?.roles) ? connectUserData.value.doc.roles : []),
      ...(Array.isArray(connectUserData.value?.doc?.fields?.roles) ? connectUserData.value.doc.fields.roles : []),
    ]
      .map((role) => String(role || '').trim().toLowerCase())
      .filter(Boolean)
    return roles.includes('staff') || roles.includes('admin')
  })

  /** Connect admins can edit any page. Mapped groups (e.g. arp → /arp) edit their prefixes. */
  const canEditConnectPages = computed(() => isConnectAdmin.value)

  function canEditConnectPageAt(pagePath: string) {
    return canEditPageByGroups({
      isAdmin: isConnectAdmin.value,
      groupSlugs: normalizeConnectGroupSlugs(connectUserData.value?.doc),
      pagePath,
    })
  }

  return {
    me,
    connectUserData,
    isConnectAdmin,
    isStaff,
    canEditConnectPages,
    canEditConnectPageAt,
  }
}
