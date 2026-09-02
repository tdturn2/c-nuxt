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
const { me, canAccessDashboard } = useDashboardAccess()

const showFab = computed(() =>
  canAccessDashboard.value && !route.path.startsWith('/dashboard') && !me.value?.impersonation?.active,
)
</script>
