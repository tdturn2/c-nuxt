<template>
  <aside class="sticky top-15 self-start shrink-0 h-[calc(100vh-3.75rem)] overflow-hidden w-80 min-w-80 border-r border-gray-200 bg-white">
    <div class="h-full overflow-y-auto px-3 py-4">
      <div class="mb-4 px-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Dashboard</p>
        <h2 class="text-sm font-semibold text-gray-900">Updatable Sections</h2>
      </div>

      <nav class="space-y-1">
        <div v-for="item in items" :key="item.to">
          <NuxtLink
            v-if="canAccessSection(item.section)"
            :to="item.to"
            class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
            :class="isActive(item.to) ? 'bg-[rgba(13,94,130,0.1)] text-[rgba(13,94,130,1)] font-medium' : 'text-gray-700 hover:bg-gray-100'"
          >
            <UIcon :name="item.icon" class="h-4 w-4 shrink-0" />
            <span class="truncate">{{ item.label }}</span>
          </NuxtLink>
          <div v-if="item.children?.length" class="ml-5 mt-1 space-y-1 border-l border-gray-200 pl-2">
            <NuxtLink
              v-for="child in item.children"
              :key="child.to"
              :to="child.to"
              class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
              :class="isActive(child.to) ? 'bg-[rgba(13,94,130,0.1)] text-[rgba(13,94,130,1)] font-medium' : 'text-gray-700 hover:bg-gray-100'"
            >
              <UIcon :name="child.icon" class="h-4 w-4 shrink-0" />
              <span class="truncate">{{ child.label }}</span>
            </NuxtLink>
          </div>
        </div>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { DashboardSection } from '@shared/dashboardAccess'

const route = useRoute()
const { canAccessSection } = useDashboardAccess()

type NavItem = {
  label: string
  to: string
  icon: string
  section: DashboardSection
  children?: Array<{ label: string; to: string; icon: string; section: DashboardSection }>
}

const allItems: NavItem[] = [
  { label: 'Dashboard Home', to: '/dashboard', icon: 'i-lucide-layout-dashboard', section: 'home' },
  { label: 'Posts', to: '/dashboard/posts', icon: 'i-lucide-newspaper', section: 'posts' },
  { label: 'Users & Groups', to: '/dashboard/users', icon: 'i-lucide-users-round', section: 'users' },
  { label: 'Docs / Pages', to: '/dashboard/docs', icon: 'i-lucide-file-text', section: 'docs' },
  { label: 'Media', to: '/dashboard/media', icon: 'i-lucide-folder-open', section: 'media' },
  { label: 'Degree Builder', to: '/dashboard/degrees', icon: 'i-lucide-graduation-cap', section: 'degrees' },
  {
    label: 'Forms Builder',
    to: '/dashboard/forms',
    icon: 'i-lucide-square-pen',
    section: 'forms',
    children: [
      { label: 'Form Results', to: '/dashboard/form-results', icon: 'i-lucide-clipboard-list', section: 'form-results' },
    ],
  },
  { label: 'Home Slider', to: '/dashboard/home-slider', icon: 'i-lucide-images', section: 'home-slider' },
  { label: 'Daily Eucharist', to: '/dashboard/daily-eucharist', icon: 'i-lucide-calendar-heart', section: 'daily-eucharist' },
  { label: 'Campus Hours', to: '/dashboard/campus-hours', icon: 'i-lucide-clock', section: 'campus-hours' },
  { label: 'Chapel', to: '/dashboard/chapel', icon: 'i-lucide-mic-vocal', section: 'chapel' },
  { label: 'Chapel Calendar', to: '/dashboard/chapel-calendar', icon: 'i-lucide-calendar-range', section: 'chapel' },
  { label: 'Chapel Speakers', to: '/dashboard/chapel-speakers', icon: 'i-lucide-user-round-pen', section: 'chapel-speakers' },
  { label: 'Toast Manager', to: '/dashboard/toasts', icon: 'i-lucide-bell-ring', section: 'toasts' },
  { label: 'Jobs Manager', to: '/dashboard/jobs', icon: 'i-lucide-briefcase', section: 'jobs' },
  { label: 'Faculty Publications', to: '/dashboard/faculty-publications', icon: 'i-lucide-book-open', section: 'faculty-publications' },
  { label: 'Featured Publications', to: '/dashboard/featured-publications', icon: 'i-lucide-star', section: 'featured-publications' },
]

const items = computed(() =>
  allItems
    .map((item) => ({
      ...item,
      children: (item.children || []).filter((child) => canAccessSection(child.section)),
    }))
    .filter((item) => canAccessSection(item.section) || item.children.length),
)

function isActive(path: string) {
  if (path === '/dashboard') return route.path === '/dashboard'
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>
