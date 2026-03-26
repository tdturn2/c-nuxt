<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const { asideWidthPx, collapsed, toggleCollapsed, startResize } = useSidebar()
const menuSearchQuery = ref('')

/** Recursively filter menu items by label (and nested children labels) */
function filterMenuByLabel(item: NavigationMenuItem, query: string): NavigationMenuItem | null {
  const q = query.trim().toLowerCase()
  if (!q) return item
  const labelMatch = (item.label ?? '').toLowerCase().includes(q)
  const children = item.children
  if (children?.length) {
    const filteredChildren = children
      .map((c) => filterMenuByLabel(c, query))
      .filter((c): c is NavigationMenuItem => c != null)
    if (labelMatch) return { ...item, children: filteredChildren.length ? filteredChildren : children }
    if (filteredChildren.length) return { ...item, children: filteredChildren }
    return null
  }
  return labelMatch ? item : null
}

const isPodcastsActive = computed(() => /^\/media\/(wesworld|elementary|chapel)$/.test(route.path))
const isDirectoriesActive = computed(() => /^\/(student|faculty|employee)-directory$/.test(route.path))

const mainNavItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/',
  }, {
    label: 'Class Search',
    icon: 'i-lucide-search',
    to: '/class-search'
  },
  {
    label: 'Degree Map',
    icon: 'i-lucide-map',
    to: '/user/degree-map'
  },
  {
    label: 'Media',
    icon: 'i-lucide-podcast',
    defaultOpen: isPodcastsActive.value,
    children: [{
      label: 'WesWorld',
      to: '/media/wesworld'
    }, {
      label: 'It\'s Elementary',
      to: '/media/elementary'
    }, {
      label: 'Chapel',
      to: '/media/chapel'
    }
  ]},
  {
    label: 'Directories',
    icon: 'i-lucide-users',
    defaultOpen: isDirectoriesActive.value,
    children: [{
      label: 'Student Directory',
      to: '/student-directory'
    }, {
      label: 'Faculty Directory',
      to: '/faculty-directory'
    }, {
      label: 'Employee Directory',
      to: '/employee-directory'
    }
  ]
  },
  {
    label: 'Jobs Board',
    icon: 'i-heroicons-briefcase',
    to: '/jobs'
  },
  {
    label: 'Marketplace',
    icon: 'i-heroicons-shopping-bag',
    to: '/marketplace'
  }
  // { label: 'Faculty Resources', icon: 'i-lucide-message-circle', to: '/faculty' },
  // { label: 'Staff Resources', icon: 'i-lucide-info', to: '/staff' },


])

const filteredMainNavItems = computed(() =>
  mainNavItems.value
    .map((item) => filterMenuByLabel(item, menuSearchQuery.value))
    .filter((item): item is NavigationMenuItem => item != null)
    .map((item) => {
      const q = menuSearchQuery.value.trim()
      if (!q) return item
      // If search is active, expand any group that still has children after filtering.
      if (item.children?.length) return { ...item, defaultOpen: true }
      return item
    })
)

const footerNavItems: NavigationMenuItem[] = [
  
]
</script>

<template>
  <aside
    class="sidebar-aside sticky top-[3.75rem] self-start flex-shrink-0 h-[calc(100vh-3.75rem)] flex items-stretch border-r border-gray-200 bg-white transition-[width] duration-200 ease-out"
    :style="{ width: `${asideWidthPx}px` }"
  >
    <!-- Collapsed: show only expand button -->
    <div
      v-if="collapsed"
      class="flex flex-col items-center py-4 w-full min-w-0"
    >
      <button
        type="button"
        aria-label="Expand sidebar"
        class="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        @click="toggleCollapsed"
      >
        <UIcon name="i-heroicons-chevron-right" class="w-5 h-5" />
      </button>
    </div>

    <!-- Expanded: full sidebar content -->
    <template v-else>
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden w-full">
        <div class="flex items-center justify-between gap-1 px-2 pt-2 pb-1">
          <UInput
            v-model="menuSearchQuery"
            type="search"
            placeholder="Search menu..."
            icon="i-lucide-search"
            color="neutral"
            variant="outline"
            size="sm"
            class="shrink-0 flex-1 min-w-0"
            autocomplete="off"
          />
          <button
            type="button"
            aria-label="Collapse sidebar"
            class="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 shrink-0"
            @click="toggleCollapsed"
          >
            <UIcon name="i-heroicons-chevron-left" class="w-5 h-5" />
          </button>
        </div>
        <div class="flex flex-col flex-1 min-h-0 overflow-hidden gap-4 px-2 my-2">
          <UNavigationMenu
            :key="`left-nav-${route.path}`"
            :items="filteredMainNavItems"
            orientation="vertical"
            class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          />
        </div>
        <div v-if="footerNavItems.length" class="w-full border-t border-gray-200 bg-gray-50/80 pt-3 pb-2 px-2">
          <UNavigationMenu
            :items="footerNavItems"
            orientation="vertical"
          />
        </div>
      </div>

      <!-- Resize handle -->
      <div
        role="separator"
        aria-label="Resize sidebar"
        class="resize-handle relative w-1 shrink-0 cursor-col-resize hover:bg-[rgba(13,94,130,0.2)] active:bg-[rgba(13,94,130,0.3)] transition-colors group"
        @mousedown="startResize"
      >
        <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-gray-300 group-hover:bg-[rgba(13,94,130,0.5)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </template>
  </aside>
</template>

