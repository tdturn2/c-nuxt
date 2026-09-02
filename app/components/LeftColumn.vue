<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import {
  buildDepartmentsSidebarNavItems,
  isConnectDepartmentsPath,
  useConnectPagesTreeData,
} from '~/composables/useConnectPagesTree'

const route = useRoute()
const isHome = computed(() => route.path === '/')
const { asideWidthPx, collapsed, toggleCollapsed, startResize } = useSidebar()
const menuSearchQuery = ref('')

const { data: internalPagesData } = useConnectPagesTreeData()

const internalDepartmentsItems = computed<NavigationMenuItem[]>(() => {
  const docs = Array.isArray(internalPagesData.value?.docs) ? internalPagesData.value.docs : []
  return buildDepartmentsSidebarNavItems(docs, route.path)
})

const isDepartmentsSectionActive = computed(() => {
  const docs = Array.isArray(internalPagesData.value?.docs) ? internalPagesData.value.docs : []
  return isConnectDepartmentsPath(docs, route.path)
})

const isMenuItemActive = (item: NavigationMenuItem): boolean => {
  const to = item.to
  if (typeof to === 'string' && to.length > 0) {
    if (route.path === to || route.path.startsWith(`${to}/`)) return true
  }
  // Category groups link to a landing page that isn't a path prefix of their children,
  // so a link match alone can't decide whether the branch holds the current route.
  return item.children?.some((c) => isMenuItemActive(c)) ?? false
}

const applyDefaultOpenForActiveRoute = (item: NavigationMenuItem): NavigationMenuItem => {
  if (!item.children?.length) return item
  const isOpen = item.defaultOpen === true || isMenuItemActive(item)
  return {
    ...item,
    defaultOpen: isOpen,
    children: item.children.map((c) => applyDefaultOpenForActiveRoute(c)),
  }
}

const expandAllGroups = (item: NavigationMenuItem): NavigationMenuItem => {
  if (!item.children?.length) return item
  return {
    ...item,
    defaultOpen: true,
    children: item.children.map((c) => expandAllGroups(c)),
  }
}

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
const isDirectoriesActive = computed(() => /^\/((student|faculty|employee|alumni)-directory|alumni-wall)$/.test(route.path))
const isStudentsActive = computed(() => {
  const path = route.path
  return (
    path === '/students' ||
    path.startsWith('/students/') ||
    /^\/(student-dashboard|class-search|user\/degree-map)$/.test(path)
  )
})

const mainNavItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/',
  },
  {
    label: 'Departments and Offices',
    icon: 'i-heroicons-building-office-2',
    to: '/internal',
    defaultOpen: isDepartmentsSectionActive.value,
    children: internalDepartmentsItems.value,
  },
  {
    label: 'Chapel',
    icon: 'i-heroicons-building-library',
    to: '/chapel',
    children: [
      {
        label: 'Daily Eucharist',
        to: '/chapel/daily-eucharist',
      },
      {
        label: 'Chapel Media Archive',
        to: '/media/chapel',
      },
    ],
  },
  {
    label: 'Calendar',
    icon: 'i-heroicons-calendar-days',
    to: '/calendar',
  },
  {
    label: 'Students',
    icon: 'i-lucide-graduation-cap',
    to: '/students',
    defaultOpen: isStudentsActive.value,
    children: [{
      label: 'My Dashboard',
      to: '/student-dashboard'
    }, {
      label: 'Class Search',
      to: '/class-search'
    }, {
      label: 'Degree Map',
      to: '/user/degree-map'
    }]
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
    }, {
      label: 'Alumni Directory',
      to: '/alumni-directory'
    }, {
      label: 'Alumni Wall',
      to: '/alumni-wall'
    }
  ]
  },
  {
    label: 'Jobs Board',
    icon: 'i-heroicons-briefcase',
    to: '/jobs'
  },
  // {
  //   label: 'Marketplace',
  //   icon: 'i-heroicons-shopping-bag',
  //   to: '/marketplace'
  // },
])

const filteredMainNavItems = computed(() =>
  mainNavItems.value
    .map((item) => applyDefaultOpenForActiveRoute(item))
    .map((item) => filterMenuByLabel(item, menuSearchQuery.value))
    .filter((item): item is NavigationMenuItem => item != null)
    .map((item) => {
      const q = menuSearchQuery.value.trim()
      if (!q) return item
      // If search is active, expand any group that still has children after filtering.
      return expandAllGroups(item)
    })
)

const isAudienceHubActive = (slug: string) => {
  const base = `/${slug}`
  return route.path === base || route.path.startsWith(`${base}/`)
}

const {
  canAccessFacultyHub,
  canAccessStaffHub,
  facultyHubAccessReady,
  staffHubAccessReady,
} = useAudienceHubAccess()

const resourceNavItems = computed<NavigationMenuItem[]>(() => {
  const items: NavigationMenuItem[] = []
  if (facultyHubAccessReady.value && canAccessFacultyHub.value) {
    items.push({
      label: 'Faculty',
      icon: 'i-heroicons-academic-cap',
      to: '/faculty',
      active: isAudienceHubActive('faculty'),
    })
  }
  if (staffHubAccessReady.value && canAccessStaffHub.value) {
    items.push({
      label: 'Staff',
      icon: 'i-heroicons-briefcase',
      to: '/staff',
      active: isAudienceHubActive('staff'),
    })
  }
  items.push({
    label: 'Students',
    icon: 'i-lucide-graduation-cap',
    to: '/students',
    active: isAudienceHubActive('students'),
  })
  return items
})

const filteredResourceNavItems = computed(() => {
  const q = menuSearchQuery.value.trim().toLowerCase()
  if (!q) return resourceNavItems.value
  return resourceNavItems.value.filter((item) => (item.label ?? '').toLowerCase().includes(q))
})

const showResourcesSection = computed(() => filteredResourceNavItems.value.length > 0)

const navScrollEl = ref<HTMLElement | null>(null)
const campusHoursOpen = ref(false)

const scrollActiveLinkIntoView = () => {
  const container = navScrollEl.value
  if (!container) return
  const active = container.querySelector<HTMLElement>('[aria-current="page"]')
  if (!active) return
  const containerRect = container.getBoundingClientRect()
  const activeRect = active.getBoundingClientRect()
  if (activeRect.top >= containerRect.top && activeRect.bottom <= containerRect.bottom) return
  container.scrollTop += activeRect.top - containerRect.top - container.clientHeight / 3
}

// The menu remounts and its accordions animate open on navigation, so retry until the
// active link has settled into its final position.
const revealActiveLink = () => {
  if (!import.meta.client) return
  nextTick(() => {
    scrollActiveLinkIntoView()
    setTimeout(scrollActiveLinkIntoView, 250)
  })
}

watch([() => route.path, () => internalPagesData.value?.docs], revealActiveLink, { immediate: true })
</script>

<template>
  <aside
    class="sidebar-aside sticky top-[3.75rem] self-start flex-shrink-0 flex items-stretch border-r border-gray-200 bg-white transition-[width] duration-200 ease-out"
    :class="isHome ? 'h-full' : 'h-[calc(100vh-3.75rem)]'"
    :style="{ width: `${asideWidthPx}px` }"
  >
    <!-- Collapsed: expand control pinned to top of rail -->
    <div
      v-if="collapsed"
      class="flex w-full min-w-0 flex-col items-center px-2 pt-2 gap-1"
    >
      <button
        type="button"
        aria-label="Expand sidebar"
        class="sidebar-toggle-btn"
        @click="toggleCollapsed"
      >
        <UIcon name="i-lucide-chevrons-right" class="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Campus hours"
        title="Campus hours"
        class="sidebar-toggle-btn"
        @click="campusHoursOpen = true"
      >
        <UIcon name="i-lucide-clock" class="h-4 w-4" />
      </button>
    </div>

    <!-- Expanded: full sidebar content -->
    <template v-else>
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden w-full">
        <div class="flex items-center gap-1.5 px-2 pt-2 pb-1">
          <UInput
            v-model="menuSearchQuery"
            type="search"
            placeholder="Search menu..."
            icon="i-lucide-search"
            color="neutral"
            variant="outline"
            size="sm"
            class="min-h-8 shrink-0 flex-1 min-w-0"
            autocomplete="off"
          />
          <button
            type="button"
            aria-label="Collapse sidebar"
            class="sidebar-toggle-btn"
            @click="toggleCollapsed"
          >
            <UIcon name="i-lucide-chevrons-left" class="h-4 w-4" />
          </button>
        </div>
        <div
          ref="navScrollEl"
          class="connect-left-nav-scroll flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden gap-4 px-2 my-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        >
          <UNavigationMenu
            :key="`left-nav-${route.path}-${menuSearchQuery.trim()}`"
            :items="filteredMainNavItems"
            :ui="{
              link: 'connect-left-nav__link data-[active=true]:text-gray-700 data-[active=true]:bg-gold/10 aria-[current=page]:text-gray-700',
              linkLeadingIcon: 'group-data-[active=true]:text-gold group-aria-[current=page]:text-gold',
              childList: 'connect-left-nav__child-list',
              childItem: 'connect-left-nav__child-item',
            }"
            orientation="vertical"
            class="connect-left-nav shrink-0"
          />
          <div
            v-if="showResourcesSection"
            class="connect-left-nav-resources shrink-0 rounded-lg border border-gray-200 bg-gray-50/80 px-1 py-2"
          >
            <p class="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Resources
            </p>
            <UNavigationMenu
              :items="filteredResourceNavItems"
              :ui="{
                link: 'font-medium data-[active=true]:text-gray-900 data-[active=true]:bg-gold/15 aria-[current=page]:text-gray-900',
                linkLeadingIcon: 'group-data-[active=true]:text-gold group-aria-[current=page]:text-gold',
              }"
              orientation="vertical"
            />
          </div>
        </div>
        <div class="shrink-0 border-t border-gray-200 px-2 py-2">
          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-semibold text-white hover:bg-[rgba(10,69,92,1)]"
            @click="campusHoursOpen = true"
          >
            <UIcon name="i-lucide-clock" class="h-4 w-4" />
            Campus Hours
          </button>
        </div>
        <!-- Chapel plug hidden for now
        <div
          v-if="isHome"
          class="shrink-0 border-t border-gray-200 px-2 py-2"
        >
          <ChapelHomeCard compact />
        </div>
        -->
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
    <CampusHoursModal v-model:open="campusHoursOpen" />
  </aside>
</template>

<style scoped>
.sidebar-toggle-btn {
  display: flex;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  color: var(--color-gold);
  transition: background-color 150ms, color 150ms;
}

.sidebar-toggle-btn:hover {
  background-color: color-mix(in srgb, var(--color-gold) 12%, transparent);
}

.sidebar-toggle-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-gold) 35%, transparent);
}

.connect-left-nav :deep(.connect-left-nav__link) {
  min-width: 0;
}

.connect-left-nav :deep(.connect-left-nav__link span:last-child),
.connect-left-nav :deep(.connect-left-nav__link) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Tighter nesting under Departments and Offices */
.connect-left-nav :deep(.connect-left-nav__child-list) {
  margin-top: 0.125rem;
  padding-left: 0.625rem;
}

.connect-left-nav :deep(.connect-left-nav__child-list .connect-left-nav__child-list) {
  padding-left: 0.5rem;
}

.connect-left-nav :deep(.connect-left-nav__child-list .connect-left-nav__child-list .connect-left-nav__child-list) {
  padding-left: 0.375rem;
}

.connect-left-nav :deep(.connect-left-nav__child-item) {
  margin-top: 0.0625rem;
}
</style>

