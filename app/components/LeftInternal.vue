<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { buildConnectPageCategoryNavItems, fetchAllConnectPages } from '~/composables/useConnectPagesTree'

const route = useRoute()
const menuSearchQuery = ref('')

const isMenuItemActive = (item: NavigationMenuItem): boolean => {
  const to = item.to
  if (typeof to === 'string' && to.length > 0) {
    return route.path === to || route.path.startsWith(`${to}/`)
  }
  return item.children?.some((c) => isMenuItemActive(c)) ?? false
}

const applyDefaultOpenForActiveRoute = (item: NavigationMenuItem): NavigationMenuItem => {
  if (!item.children?.length) return item
  const isOpen = item.children.some((c) => isMenuItemActive(c))
  return {
    ...item,
    defaultOpen: isOpen,
    children: item.children.map((c) => applyDefaultOpenForActiveRoute(c)),
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

const { data: pagesData } = await useAsyncData<any>('left-internal-pages', () => fetchAllConnectPages({
  limit: 100,
  depth: 2,
  sort: 'order,title',
}))

const mainNavItems = computed<NavigationMenuItem[]>(() => {
  const docs = Array.isArray(pagesData.value?.docs) ? pagesData.value.docs : []
  return buildConnectPageCategoryNavItems(docs)
})

const filteredMainNavItems = computed(() =>
  mainNavItems.value
    .map((item) => filterMenuByLabel(item, menuSearchQuery.value))
    .filter((item): item is NavigationMenuItem => item != null)
    .map((item) => applyDefaultOpenForActiveRoute(item))
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
  <UDashboardSidebar
    collapsible
    resizable
    :ui="{ footer: 'border-t border-default shrink-0', root: 'w-full min-w-0 h-full flex flex-col min-h-0 my-8' }"
    class="w-full! h-full!"
  >
    

    <template #default="{ collapsed }">
      <div class="flex flex-col flex-1 min-h-0 overflow-hidden gap-4">
        <UInput
          v-model="menuSearchQuery"
          type="search"
          :placeholder="collapsed ? '' : 'Search menu...'"
          icon="i-lucide-search"
          color="neutral"
          variant="outline"
          size="sm"
          class="shrink-0"
          :class="collapsed ? 'px-2!' : ''"
          autocomplete="off"
        />

        <UNavigationMenu
          :key="`left-internal-nav-${route.path}`"
          :collapsed="collapsed"
          :items="filteredMainNavItems"
          orientation="vertical"
          class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        />
      </div>
    </template>

    <template #footer="{ collapsed }">
      <div v-if="!collapsed" class="w-full border-t border-gray-200 bg-gray-50/80 pt-3 pb-2 px-2">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="footerNavItems"
          orientation="vertical"
        />
      </div>
      <div v-if="collapsed" class="border-t border-gray-200 pt-2 pb-2" />
    </template>
  </UDashboardSidebar>
</template>