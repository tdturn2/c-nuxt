import type { RolePreviewRole } from '@shared/impersonation'

function errorMessage(err: any, fallback: string) {
  return err?.statusMessage || err?.data?.statusMessage || err?.message || fallback
}

export function useImpersonation() {
  const pending = ref(false)

  const reloadAsPreview = (path = '/') => {
    if (!import.meta.client) return
    window.location.assign(path)
  }

  const startRolePreview = async (role: RolePreviewRole) => {
    if (pending.value) return
    pending.value = true
    try {
      await $fetch('/api/admin/impersonate', {
        method: 'POST',
        body: { role },
      })
      reloadAsPreview('/')
    } catch (err: any) {
      pending.value = false
      if (import.meta.client) window.alert(errorMessage(err, 'Could not start preview'))
    }
  }

  const stopRolePreview = async () => {
    if (pending.value) return
    pending.value = true
    try {
      await $fetch('/api/admin/impersonate', { method: 'DELETE' })
      reloadAsPreview('/')
    } catch (err: any) {
      pending.value = false
      if (import.meta.client) window.alert(errorMessage(err, 'Could not exit preview'))
    }
  }

  return {
    pending: readonly(pending),
    startRolePreview,
    stopRolePreview,
  }
}
