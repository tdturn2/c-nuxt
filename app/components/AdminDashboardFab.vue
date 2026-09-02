<template>
  <NuxtLink
    v-if="showFab"
    to="/dashboard"
    aria-label="Open dashboard"
    title="Dashboard"
    class="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(13,94,130,1)] text-white shadow-lg transition-colors hover:bg-[rgba(11,82,114,1)]"
  >
    <UIcon name="i-lucide-layout-dashboard" class="h-6 w-6" />
  </NuxtLink>
</template>

<script setup lang="ts">
const route = useRoute()
const { status } = useAuth()

const { data: me } = useFetch<any>('/api/users/me', { key: 'admin-dashboard-fab-me' })
const { data: connectUserData, execute: loadConnectUser } = useFetch<any>('/api/connect-users/me', {
  key: 'admin-dashboard-fab-connect-user',
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

  const groups = Array.isArray(connectUserData.value?.doc?.groups) ? connectUserData.value.doc.groups : []
  return groups.some((group: any) => {
    const slug = String(group?.slug || '').trim().toLowerCase()
    const name = String(group?.name || '').trim().toLowerCase()
    const tag = `${slug} ${name}`.trim()
    return tag === 'admin' || tag.includes('admin ') || tag.includes(' admin') || tag.includes('connect-admin') || tag.includes('connect admin')
  })
})

const showFab = computed(() =>
  isConnectAdmin.value && !route.path.startsWith('/dashboard') && !me.value?.impersonation?.active,
)
</script>
