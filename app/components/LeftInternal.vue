<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
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
  }, 

{
  label: 'Academic Affairs',
  icon: 'i-lucide-graduation-cap',
  children: [
    { label: 'Advanced Research Programs', to: '/academic-affairs/advanced-research-programs' },
    { label: 'Center for Church Multiplication', to: '/academic-affairs/church-multiplication' },
    { label: 'Doctor of Ministry Program', to: '/academic-affairs/doctor-of-ministry' },
    { label: 'E. Stanley Jones School of Mission and Ministry', to: '/academic-affairs/esj-school-mission-ministry' },
    { label: 'Faculty Resources', to: '/academic-affairs/faculty-resources' },
    { label: 'Global Partnerships', to: '/academic-affairs/global-partnerships' },
    { label: 'Institutional Effectiveness and Assessment', to: '/academic-affairs/institutional-effectiveness' },
    { label: 'Institutional Review Board', to: '/academic-affairs/institutional-review-board' },
    { label: 'Library, Information, & Technology Services', to: '/academic-affairs/library-it' },
    { label: 'Office of the Provost', to: '/academic-affairs/provost' },
    { label: 'Mentored Ministry', to: '/academic-affairs/mentored-ministry' },
    { label: 'School of Biblical Interpretation', to: '/academic-affairs/biblical-interpretation' },
    { label: 'School of Counseling', to: '/academic-affairs/counseling' },
    { label: 'School of Theology and Formation', to: '/academic-affairs/theology-formation' }
  ]
},

{
  label: 'Advancement',
  icon: 'i-lucide-handshake',
  children: [
    { label: 'Alumni and Church Relations', to: '/advancement/alumni-church-relations' },
    { label: 'Communications', to: '/advancement/communications' },
    { label: 'Major Events', to: '/advancement/major-events' }
  ]
},

{
  label: 'Student Life and Formation',
  icon: 'i-lucide-users',
  children: [
    { label: 'Asbury Seminary Chapel', to: '/student-life/chapel' },
    {
      label: 'Student Life and Community Formation',
      children: [
        { label: 'Creation Care', to: '/student-life/creation-care' },
        { label: 'Health and Fitness', to: '/student-life/health-fitness' },
        { label: 'Residential Life and Housing', to: '/student-life/residential-life' }
      ]
    },
    {
      label: 'Global Student Life and Formation',
      children: [
        { label: 'Career and Calling Center', to: '/student-life/career-calling' }
      ]
    }
  ]
},

{
  label: 'Enrollment Management',
  icon: 'i-lucide-clipboard-list',
  children: [
    { label: 'Admissions', to: '/enrollment/admissions' },
    { label: 'Financial Aid', to: '/enrollment/financial-aid' },
    {
      label: 'Registrar',
      children: [
        { label: 'International Services', to: '/registrar/international-services' },
        { label: 'Academic Advising', to: '/registrar/academic-advising' }
      ]
    }
  ]
},

{
  label: 'Finance and Administration',
  icon: 'i-lucide-building',
  children: [
    { label: 'Business Office', to: '/finance/business-office' },
    { label: 'Facilities & Security', to: '/finance/facilities-security' },
    {
      label: 'Guest and Auxiliary Services',
      children: [
        { label: 'Asbury Inn', to: '/auxiliary/asbury-inn' },
        { label: 'Campus Store', to: '/auxiliary/campus-store' },
        { label: 'Dining Services', to: '/auxiliary/dining' },
        { label: 'Seminary Post Office', to: '/auxiliary/post-office' },
        { label: 'Switchboard', to: '/auxiliary/switchboard' },
        { label: 'Events at Asbury Seminary', to: '/auxiliary/events' }
      ]
    },
    { label: 'Employee Services', to: '/finance/employee-services' }
  ]
}



])

const filteredMainNavItems = computed(() =>
  mainNavItems.value
    .map((item) => filterMenuByLabel(item, menuSearchQuery.value))
    .filter((item): item is NavigationMenuItem => item != null)
)

const footerNavItems: NavigationMenuItem[] = [
  
]
</script>

<template>
  <UDashboardSidebar
    collapsible
    resizable
    :ui="{ footer: 'border-t border-default shrink-0', root: 'w-full min-w-0 h-full flex flex-col min-h-0 my-8' }"
    class="!w-full !h-full"
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
          :class="collapsed ? '!px-2' : ''"
          autocomplete="off"
        />

        <UNavigationMenu
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