<template>
  <aside class="sticky top-15 self-start shrink-0 h-[calc(100vh-3.75rem)] overflow-hidden w-80 min-w-80 border-r border-gray-200 bg-white">
    <div class="h-full overflow-y-auto px-3 py-4">
      <div class="mb-4 px-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Dashboard</p>
        <h2 class="text-sm font-semibold text-gray-900">Updatable Sections</h2>
      </div>

      <nav class="space-y-1">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
          :class="isActive(item.to) ? 'bg-[rgba(13,94,130,0.1)] text-[rgba(13,94,130,1)] font-medium' : 'text-gray-700 hover:bg-gray-100'"
        >
          <UIcon :name="item.icon" class="h-4 w-4 shrink-0" />
          <span class="truncate">{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
const route = useRoute()

const items = [
  { label: 'Dashboard Home', to: '/dashboard', icon: 'i-lucide-layout-dashboard' },
  { label: 'Users & Groups', to: '/dashboard/users', icon: 'i-lucide-users-round' },
  { label: 'Docs / Pages', to: '/dashboard/docs', icon: 'i-lucide-file-text' },
  { label: 'Degree Builder', to: '/dashboard/degrees', icon: 'i-lucide-graduation-cap' },
  { label: 'Forms Builder', to: '/dashboard/forms', icon: 'i-lucide-square-pen' },
  { label: 'Home Slider', to: '/dashboard/home-slider', icon: 'i-lucide-images' },
  { label: 'Daily Eucharist', to: '/dashboard/daily-eucharist', icon: 'i-lucide-calendar-heart' },
  { label: 'Chapel', to: '/dashboard/chapel', icon: 'i-lucide-mic-vocal' },
  { label: 'Chapel Speakers', to: '/dashboard/chapel-speakers', icon: 'i-lucide-user-round-pen' },
  { label: 'Form Results', to: '/dashboard/form-results', icon: 'i-lucide-clipboard-list' },
]

function isActive(path: string) {
  if (path === '/dashboard') return route.path === '/dashboard'
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>
