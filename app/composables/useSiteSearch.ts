import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { useDebounceFn } from '@vueuse/core'
import { extractLexicalPlainText } from '@shared/lexicalPlainText'
import { canAccessAudienceHubPath } from '@shared/audienceHubAccess'
import { isFacultyHubPath } from '@shared/facultyHubAccess'
import { isStaffHubPath } from '@shared/staffHubAccess'
import { SITE_SEARCH_RESOURCE_LINKS } from '@shared/siteSearchNav'
import {
  CONNECT_PAGE_CATEGORIES,
  buildPagePathMap,
  fetchAllConnectPages,
  type ConnectPageNode,
} from '~/composables/useConnectPagesTree'

type SearchUser = {
  id: number | string
  name: string
  email: string | null
  roles?: string[]
}

function userProfilePath(user: SearchUser): string {
  const email = (user.email ?? '').toString()
  if (email.includes('@')) {
    const username = email.split('@')[0]?.trim()
    if (username) return `/user/${encodeURIComponent(username)}`
  }
  return `/user/${encodeURIComponent(String(user.id))}`
}

function formatUserRoles(roles: string[] | undefined): string {
  if (!Array.isArray(roles) || !roles.length) return 'Connect user'
  const labels = roles
    .map((role) => String(role).trim().toLowerCase())
    .filter(Boolean)
    .map((role) => role.charAt(0).toUpperCase() + role.slice(1))
  return labels.join(', ')
}

function resourceItems(canAccessFacultyHub: boolean, canAccessStaffHub: boolean): CommandPaletteItem[] {
  const out: CommandPaletteItem[] = []
  for (const link of SITE_SEARCH_RESOURCE_LINKS) {
    if (!canAccessFacultyHub && isFacultyHubPath(link.to)) continue
    if (!canAccessStaffHub && isStaffHubPath(link.to)) continue
    out.push({
      id: `res:${link.to}`,
      label: link.label,
      to: link.to,
      icon: link.icon,
      suffix: link.description,
    })
    for (const child of link.children ?? []) {
      if (!canAccessFacultyHub && isFacultyHubPath(child.to)) continue
      if (!canAccessStaffHub && isStaffHubPath(child.to)) continue
      out.push({
        id: `res:${child.to}`,
        label: child.label,
        to: child.to,
        icon: child.icon,
        prefix: `${link.label} >`,
        suffix: child.description,
      })
    }
  }
  return out
}

export function useSiteSearch(searchTerm: Ref<string>) {
  const loading = ref(false)
  const loaded = ref(false)
  const { canAccessFacultyHub, canAccessStaffHub, connectUserDoc } = useAudienceHubAccess()

  const people = ref<SearchUser[]>([])
  const peopleLoading = ref(false)

  const pageGroups = ref<CommandPaletteGroup<CommandPaletteItem>[]>([])

  async function loadIndex() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      const res = await fetchAllConnectPages({ depth: 2, limit: 250, sort: 'order,title' })
      const pages = (Array.isArray(res?.docs) ? res.docs : []) as ConnectPageNode[]
      const { pathById } = buildPagePathMap(pages)

      const byCategory = new Map<string, CommandPaletteItem[]>()
      for (const p of pages) {
        const to = pathById.get(String(p.id))
        if (!to) continue
        const label = (p.title || p.slug || '').toString().trim()
        if (!label) continue
        const category = (p.navCategory || 'other').toString()
        const list = byCategory.get(category) ?? []
        list.push({
          id: `page:${p.id}`,
          label,
          to,
          icon: 'i-lucide-file-text',
          suffix: extractLexicalPlainText(p.content),
        })
        byCategory.set(category, list)
      }

      const groups: CommandPaletteGroup<CommandPaletteItem>[] = []
      for (const c of CONNECT_PAGE_CATEGORIES) {
        const items = byCategory.get(c.value) ?? []
        if (!items.length) continue
        groups.push({ id: `dept:${c.value}`, label: c.label, items })
      }
      const other = byCategory.get('other') ?? []
      if (other.length) groups.push({ id: 'dept:other', label: 'Other pages', items: other })

      pageGroups.value = groups
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const runPeopleSearch = useDebounceFn(async (q: string) => {
    const term = q.trim()
    if (term.length < 2) {
      people.value = []
      return
    }
    peopleLoading.value = true
    try {
      const res = await $fetch<{ docs: SearchUser[] }>('/api/users/search', { query: { q: term } })
      people.value = Array.isArray(res?.docs) ? res.docs : []
    } catch {
      people.value = []
    } finally {
      peopleLoading.value = false
    }
  }, 200)

  watch(searchTerm, (q) => {
    runPeopleSearch(q)
  })

  const peopleGroup = computed<CommandPaletteGroup<CommandPaletteItem>>(() => {
    if (peopleLoading.value) {
      return {
        id: 'people',
        label: 'People',
        items: [{ id: 'people-loading', label: 'Searching people…', icon: 'i-heroicons-arrow-path', disabled: true }],
        ignoreFilter: true,
      }
    }
    if (!searchTerm.value.trim() || searchTerm.value.trim().length < 2) {
      return {
        id: 'people',
        label: 'People',
        items: [{ id: 'people-hint', label: 'Type at least 2 characters to search people', disabled: true }],
        ignoreFilter: true,
      }
    }
    if (!people.value.length) {
      return {
        id: 'people',
        label: 'People',
        items: [{ id: 'people-empty', label: 'No people found', disabled: true }],
        ignoreFilter: true,
      }
    }
    return {
      id: 'people',
      label: 'People',
      items: people.value.map((user) => ({
        id: `person:${user.id}`,
        label: user.name,
        suffix: user.email ?? undefined,
        description: formatUserRoles(user.roles),
        icon: 'i-lucide-user',
        to: userProfilePath(user),
      })),
      ignoreFilter: true,
    }
  })

  const links = computed(() => [
    { label: 'Departments and Offices', icon: 'i-heroicons-building-office-2', to: '/internal' },
    { label: 'Student Directory', icon: 'i-lucide-users', to: '/student-directory' },
    { label: 'Faculty Directory', icon: 'i-lucide-users', to: '/faculty-directory' },
    { label: 'Employee Directory', icon: 'i-lucide-users', to: '/employee-directory' },
  ])

  const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => {
    const resourcesGroup: CommandPaletteGroup<CommandPaletteItem> = {
      id: 'resources',
      label: 'Resources',
      items: resourceItems(canAccessFacultyHub.value, canAccessStaffHub.value),
    }
    const loadingGroup: CommandPaletteGroup<CommandPaletteItem> | null = loading.value
      ? { id: 'loading', label: 'Pages', items: [{ id: 'loading', label: 'Loading pages…', disabled: true }], ignoreFilter: true }
      : null
    const filteredPageGroups = pageGroups.value
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const to = typeof item.to === 'string' ? item.to : ''
          return canAccessAudienceHubPath(to, connectUserDoc.value)
        }),
      }))
      .filter((group) => group.items.length > 0)
    return [peopleGroup.value, resourcesGroup, ...(loadingGroup ? [loadingGroup] : []), ...filteredPageGroups]
  })

  return {
    links,
    groups,
    loading,
    loaded,
    loadIndex,
  }
}
