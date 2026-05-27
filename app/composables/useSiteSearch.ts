import type { ContentNavigationItem } from '@nuxt/content'
import type { ContentSearchFile, ContentSearchItem } from '@nuxt/ui'
import type { CommandPaletteGroup } from '@nuxt/ui'
import { useDebounceFn } from '@vueuse/core'
import { extractLexicalPlainText } from '@shared/lexicalPlainText'
import { SITE_SEARCH_RESOURCE_LINKS } from '@shared/siteSearchNav'
import {
  CONNECT_PAGE_CATEGORIES,
  buildPagePathMap,
  fetchAllConnectPages,
  getConnectPageBreadcrumbLabel,
  isAudienceHubRootPage,
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

function resourceFiles(): ContentSearchFile[] {
  const out: ContentSearchFile[] = []
  for (const link of SITE_SEARCH_RESOURCE_LINKS) {
    out.push({
      id: link.to,
      title: link.label,
      titles: ['Resources'],
      level: 1,
      content: link.description ?? link.label,
    })
    for (const child of link.children ?? []) {
      out.push({
        id: child.to,
        title: child.label,
        titles: ['Resources', link.label],
        level: 2,
        content: child.description ?? child.label,
      })
    }
  }
  return out
}

function buildDepartmentsNavigation(pages: ConnectPageNode[], pathById: Map<string, string>): ContentNavigationItem[] {
  const pagesByCategory = new Map<string, ConnectPageNode[]>()
  for (const page of pages) {
    if (isAudienceHubRootPage(page)) continue
    const category = (page.navCategory || '').toString().trim()
    if (!category) continue
    const list = pagesByCategory.get(category) ?? []
    list.push(page)
    pagesByCategory.set(category, list)
  }

  const children: ContentNavigationItem[] = CONNECT_PAGE_CATEGORIES.map((category) => {
    const categoryPages = pagesByCategory.get(category.value) ?? []
    return {
      title: category.label,
      path: `/internal#${category.value}`,
      icon: 'i-lucide-folder-open',
      children: categoryPages
        .map((page) => {
          const path = pathById.get(String(page.id))
          if (!path) return null
          const title = (page.title || page.slug || '').toString().trim()
          if (!title) return null
          return { title, path, icon: 'i-lucide-file-text' } satisfies ContentNavigationItem
        })
        .filter((item): item is ContentNavigationItem => item != null),
    }
  }).filter((group) => (group.children?.length ?? 0) > 0)

  if (!children.length) return []

  return [{
    title: 'Departments and Offices',
    path: '/internal',
    icon: 'i-heroicons-building-office-2',
    children,
  }]
}

function buildAudienceNavigation(pages: ConnectPageNode[], pathById: Map<string, string>): ContentNavigationItem[] {
  const hubs = [
    { slug: 'faculty', title: 'Faculty', icon: 'i-heroicons-academic-cap' },
    { slug: 'staff', title: 'Staff', icon: 'i-heroicons-briefcase' },
    { slug: 'students', title: 'Students', icon: 'i-lucide-graduation-cap' },
  ] as const

  return hubs.map((hub) => {
    const hubPages = pages.filter((page) => {
      const path = pathById.get(String(page.id)) ?? ''
      return path === `/${hub.slug}` || path.startsWith(`/${hub.slug}/`)
    })

    return {
      title: hub.title,
      path: `/${hub.slug}`,
      icon: hub.icon,
      children: hubPages
        .map((page) => {
          const path = pathById.get(String(page.id))
          if (!path || path === `/${hub.slug}`) return null
          const title = (page.title || page.slug || '').toString().trim()
          if (!title) return null
          return { title, path, icon: 'i-lucide-file-text' } satisfies ContentNavigationItem
        })
        .filter((item): item is ContentNavigationItem => item != null),
    }
  }).filter((group) => (group.children?.length ?? 0) > 0)
}

function buildResourcesNavigation(): ContentNavigationItem[] {
  return [{
    title: 'Resources',
    path: '/resources',
    icon: 'i-lucide-bookmark',
    children: SITE_SEARCH_RESOURCE_LINKS.map((link) => ({
      title: link.label,
      path: link.to,
      icon: link.icon,
      children: link.children?.map((child) => ({
        title: child.label,
        path: child.to,
        icon: child.icon,
      })),
    })),
  }]
}

function pageFiles(pages: ConnectPageNode[], pathById: Map<string, string>): ContentSearchFile[] {
  return pages
    .map((page) => {
      const path = pathById.get(String(page.id))
      if (!path) return null
      const title = (page.title || page.slug || '').toString().trim()
      if (!title) return null
      const breadcrumb = getConnectPageBreadcrumbLabel(pages, page.id)
      const titles = breadcrumb
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean)
      const content = [
        title,
        extractLexicalPlainText(page.content),
        breadcrumb,
      ].filter(Boolean).join(' ')

      return {
        id: path,
        title,
        titles,
        level: 1,
        content,
      } satisfies ContentSearchFile
    })
    .filter((file): file is ContentSearchFile => file != null)
}

export function useSiteSearch() {
  const files = ref<ContentSearchFile[]>(resourceFiles())
  const navigation = ref<ContentNavigationItem[]>(buildResourcesNavigation())
  const loading = ref(false)
  const loaded = ref(false)
  const searchTerm = ref('')

  const people = ref<SearchUser[]>([])
  const peopleLoading = ref(false)

  async function loadIndex() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      const res = await fetchAllConnectPages({ depth: 2, limit: 250, sort: 'order,title' })
      const pages = (Array.isArray(res?.docs) ? res.docs : []) as ConnectPageNode[]
      const { pathById } = buildPagePathMap(pages)

      files.value = [...resourceFiles(), ...pageFiles(pages, pathById)]
      navigation.value = [
        ...buildDepartmentsNavigation(pages, pathById),
        ...buildAudienceNavigation(pages, pathById),
        ...buildResourcesNavigation(),
      ]
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

  const peopleGroup = computed<CommandPaletteGroup<ContentSearchItem>>(() => {
    if (peopleLoading.value) {
      return {
        id: 'people',
        label: 'People',
        items: [{ id: 'people-loading', label: 'Searching people…', icon: 'i-heroicons-arrow-path', disabled: true }],
      }
    }
    if (!searchTerm.value.trim() || searchTerm.value.trim().length < 2) {
      return {
        id: 'people',
        label: 'People',
        items: [{ id: 'people-hint', label: 'Type at least 2 characters to search people', disabled: true }],
      }
    }
    if (!people.value.length) {
      return {
        id: 'people',
        label: 'People',
        items: [{ id: 'people-empty', label: 'No people found', disabled: true }],
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
    }
  })

  const links = computed(() => [
    { label: 'Departments and Offices', icon: 'i-heroicons-building-office-2', to: '/internal' },
    { label: 'Student Directory', icon: 'i-lucide-users', to: '/student-directory' },
    { label: 'Faculty Directory', icon: 'i-lucide-users', to: '/faculty-directory' },
    { label: 'Employee Directory', icon: 'i-lucide-users', to: '/employee-directory' },
  ])

  const extraGroups = computed(() => [peopleGroup.value])

  return {
    files,
    navigation,
    links,
    extraGroups,
    loading,
    loaded,
    loadIndex,
    searchTerm,
  }
}
