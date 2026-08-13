<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="isTreeLoading" class="py-12 text-center text-gray-500">
          Loading...
        </div>
        <div v-else-if="error" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {{ errorMessage }}
        </div>
        <div v-else-if="isFacultyHubRoute && !facultyHubAccessReady" class="py-12 text-center text-gray-500">
          Checking access...
        </div>
        <div v-else-if="isStaffHubRoute && !staffHubAccessReady" class="py-12 text-center text-gray-500">
          Checking access...
        </div>
        <div
          v-else-if="isFacultyHubRoute && !canAccessFacultyHub && authStatus === 'authenticated'"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm"
        >
          You do not have access to faculty resources. Access requires the faculty role or membership in the faculty-access or admin group.
        </div>
        <div
          v-else-if="isStaffHubRoute && !canAccessStaffHub && authStatus === 'authenticated'"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm"
        >
          You do not have access to staff resources. Access requires the staff role or membership in the admin group.
        </div>
        <div v-else-if="!page" class="py-12 text-center text-gray-500">
          Page not found.
        </div>
        <article v-else>
          <nav
            v-if="pageBreadcrumbs.length"
            aria-label="Breadcrumb"
            class="not-prose mb-4"
          >
            <ol class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-600">
              <li
                v-for="(crumb, index) in pageBreadcrumbs"
                :key="`${crumb.label}-${index}`"
                class="inline-flex min-w-0 max-w-full items-center gap-1.5"
              >
                <span v-if="index > 0" aria-hidden="true" class="shrink-0 text-gray-400">›</span>
                <NuxtLink
                  v-if="crumb.to"
                  :to="crumb.to"
                  class="truncate font-medium text-[rgba(13,94,130,1)] transition-colors hover:text-[rgba(10,69,92,1)] hover:underline"
                >
                  {{ crumb.label }}
                </NuxtLink>
                <span
                  v-else
                  class="truncate font-medium text-gray-900"
                  aria-current="page"
                >
                  {{ crumb.label }}
                </span>
              </li>
            </ol>
          </nav>

          <div
            :class="hasSectionNav
              ? 'not-prose mb-8 overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm'
              : ''"
          >
            <div
              v-if="hasSectionNav"
              class="bg-asbury-blue/15 px-3 pt-3 sm:px-4"
            >
              <ConnectPageSectionNav
                v-if="primaryTabPages.length > 1"
                :heading="sectionNavHeading"
                :pages="primaryTabPages"
                :is-active="isTabActive"
              />
              <ConnectPageSectionNav
                v-if="secondaryTabPages.length > 1"
                :heading="nestedChildPagesHeading"
                :pages="secondaryTabPages"
                :is-active="isTabActive"
                variant="secondary"
                :class="primaryTabPages.length > 1 ? 'mt-2 border-t border-asbury-blue/15 pt-2' : ''"
              />
            </div>

            <div :class="hasSectionNav ? 'px-4 py-6 sm:px-6 sm:py-8' : ''">
              <h1
                v-if="hasSectionNav"
                class="sr-only"
              >
                {{ effectivePage?.title || page?.title }}
              </h1>
              <h1
                v-else
                class="text-3xl font-bold text-gray-900 mb-6"
              >
                {{ effectivePage?.title || page?.title }}
              </h1>

          <section v-if="contacts.length" class="not-prose max-w-3xl mb-10">
            <h2 class="text-xl font-semibold text-gray-900">
              {{ contactsHeading }}
            </h2>
            <ul
              role="list"
              class="mt-4 overflow-hidden rounded-xl border border-gray-200/80 divide-y divide-gray-100"
              :class="hasSectionNav ? 'bg-gray-50/50' : 'bg-white shadow-sm'"
            >
              <li
                v-for="c in contacts"
                :key="c.id"
                class="flex items-center gap-3 sm:gap-4 px-4 py-3.5 sm:px-5 sm:py-4 min-w-0 transition-colors hover:bg-gray-50/90"
              >
                <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ring-1 ring-gray-200/60 shrink-0">
                  <img
                    v-if="c.avatar?.url"
                    :src="c.avatar.url"
                    :alt="c.name || 'Contact avatar'"
                    class="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-500 tabular-nums"
                    aria-hidden="true"
                  >
                    {{ initialsForContact(c.name) }}
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-gray-900 leading-snug">
                    {{ c.name || '—' }}
                  </div>
                  <p v-if="c.employeeTitle" class="mt-0.5 text-sm text-gray-600 leading-snug">
                    {{ c.employeeTitle }}
                  </p>
                </div>
                <div
                  v-if="c.email || c.phone"
                  class="flex shrink-0 items-center justify-end gap-3"
                >
                  <UTooltip
                    v-if="c.email"
                    :text="c.email"
                    :delay-duration="0"
                  >
                    <a
                      :href="`mailto:${c.email}`"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[rgba(13,94,130,1)] hover:bg-[rgba(13,94,130,0.08)]"
                      :aria-label="`Email ${c.name || 'contact'}`"
                    >
                      <UIcon name="i-lucide-mail" class="h-4 w-4" />
                    </a>
                  </UTooltip>
                  <UTooltip
                    v-if="c.phone"
                    :text="c.phone"
                    :delay-duration="0"
                  >
                    <span
                      class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[rgba(13,94,130,1)]"
                      :aria-label="`Phone ${c.phone}`"
                      tabindex="0"
                    >
                      <UIcon name="i-lucide-phone" class="h-4 w-4" />
                    </span>
                  </UTooltip>
                </div>
              </li>
            </ul>
          </section>

          <div
            v-if="renderedContentSegments.length"
            class="connect-page-body prose prose-gray max-w-none prose-headings:font-semibold prose-a:text-[rgba(13,94,130,1)] prose-p:mb-4 prose-h1:mb-6 prose-h2:mt-8 prose-h2:mb-3 prose-ul:ml-6 prose-ul:list-disc prose-ul:my-2 prose-ol:ml-6 prose-ol:list-decimal prose-ol:my-2 prose-li:my-0 prose-li:leading-snug"
            @click="onContentClick"
          >
            <template
              v-for="(segment, idx) in renderedContentSegments"
              :key="`content-segment-${idx}-${segment.kind}`"
            >
              <div v-if="segment.kind === 'html'" v-html="segment.value" />
              <ConnectInlineForm v-else :slug="segment.value" />
            </template>
          </div>
          <div v-else-if="effectivePage?.content" class="prose prose-gray max-w-none text-gray-600">
            <p>Content format is not supported for display.</p>
          </div>

          <p
            v-if="!hasSectionNav && !renderedContentSegments.length && !contacts.length && !isTreeLoading"
            class="text-sm text-gray-500"
          >
            Browse sub-pages in this section using the menu on the left.
          </p>

            </div>
          </div>

        </article>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  buildConnectPageBreadcrumbs,
  buildPagePathMap,
  connectPageHasUsableDetail,
  findConnectPageByPath,
  getConnectPageSiblings,
  getDirectChildConnectPages,
  useConnectPagesTreeData,
} from '~/composables/useConnectPagesTree'
import ConnectInlineForm from '~/components/forms/ConnectInlineForm.vue'
import {
  CONNECT_PAGES_MEDIA_RELATION,
  normalizePayloadMediaUrl,
  resolveConnectPagesMediaFromLexicalValue,
} from '~/utils/connectPagesDocImage'
import {
  normalizeVimeoCollectionIframeUrl,
  normalizeVimeoVideoId,
} from '~/utils/vimeoEmbed'
import {
  collectConnectMagicPlainText,
  connectMagicBlockJsonParses,
  connectMagicMergeSeparator,
  parseConnectMagicJsonArray,
} from '~/utils/connectMagicBlocks'
import {
  CONNECT_ACCORDION_BODY_LEXICAL_TYPE,
  CONNECT_ACCORDION_ITEM_LEXICAL_TYPE,
  CONNECT_ACCORDION_LEXICAL_TYPE,
  CONNECT_ACCORDION_TITLE_LEXICAL_TYPE,
} from '~/utils/tiptap/connectAccordionExtension'
import {
  buildConnectVideosCollectionHtml,
  buildConnectVimeoCollectionListHtml,
  parseConnectVideoRows,
  parseConnectVimeoCollectionPayload,
} from '~/utils/connectVideosCollectionHtml'

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const {
  isFacultyHubRoute,
  isStaffHubRoute,
  facultyHubAccessReady,
  staffHubAccessReady,
  canAccessFacultyHub,
  canAccessStaffHub,
  authStatus,
} = useAudienceHubAccess()

function normalizeConnectPageMediaUrl(url: string): string {
  const base =
    (runtimeConfig.connectApi || runtimeConfig.public.connectApi || '').trim() ||
    (import.meta.dev ? 'http://localhost:3003' : '')
  return normalizePayloadMediaUrl(url, base)
}
const { playVideo, playVimeoCollection } = useVideoPlayer()

type ConnectUser = {
  id: number | string
  name?: string | null
  employeeTitle?: string | null
  email?: string | null
  phone?: string | null
  avatar?: { url: string } | null
}

type ResolvedContactRef = {
  id: string
  seeded?: Partial<ConnectUser> | null
}

function resolveContactAvatarUrl(raw: any): string | null {
  if (!raw || typeof raw !== 'object') return null
  const avatarCandidates = [
    raw.avatar,
    raw.avatarConnectUserMedia,
    raw.avatar?.file,
    raw.avatarConnectUserMedia?.file,
  ]
  for (const candidate of avatarCandidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const direct = typeof candidate.url === 'string' ? candidate.url.trim() : ''
    if (direct) {
      const proxied = toLocalAvatarProxy(direct)
      return proxied || direct
    }
    const nested = typeof (candidate as any).file?.url === 'string'
      ? String((candidate as any).file.url).trim()
      : ''
    if (nested) {
      const proxied = toLocalAvatarProxy(nested)
      return proxied || nested
    }
  }
  return null
}

function toLocalAvatarProxy(urlRaw: string): string | null {
  const input = String(urlRaw || '').trim()
  if (!input) return null
  const hit = input.match(/\/api\/connect-user-media\/file\/([^/?#]+)/i)
  if (hit?.[1]) return `/api/connect-user-media/file/${hit[1]}`
  const hitLegacy = input.match(/\/api\/media\/file\/([^/?#]+)/i)
  if (hitLegacy?.[1]) return `/api/connect-user-media/file/${hitLegacy[1]}`
  return null
}

type ConnectPageDoc = {
  id: number | string
  title?: string
  content?: unknown
  slug?: string
  parent?: unknown
  parentId?: string | null
  order?: number | null
  contactsHeading?: string | null
  contacts?: Array<string | number | ConnectUser> | null
}

const { data: fetchData, pending, error, status } = useConnectPagesTreeData()

const isTreeLoading = computed(() => (pending.value || status.value === 'idle') && !fetchData.value?.docs?.length)
const errorMessage = computed(() => {
  const e = error.value as any
  return e?.data?.message ?? e?.statusMessage ?? e?.message ?? 'Failed to load page.'
})

const page = computed(() => {
  const docs = Array.isArray(fetchData.value?.docs) ? fetchData.value.docs : []
  return findConnectPageByPath(docs, route.path)
})

const currentPageId = computed(() => {
  const id = (page.value as any)?.id
  if (id == null) return ''
  return String(id).trim()
})

const hasPageDetailInTree = computed(() => connectPageHasUsableDetail(page.value))

const { data: pageDetail } = useAsyncData<any>(
  () => `connect-page-detail-${currentPageId.value}`,
  async () => {
    if (!currentPageId.value) return null
    if (hasPageDetailInTree.value) return page.value
    return await $fetch(`/api/connect-pages/${encodeURIComponent(currentPageId.value)}`, {
      query: { depth: 2 },
    })
  },
  { watch: [currentPageId, hasPageDetailInTree], lazy: true },
)

const effectivePage = computed(() => {
  const detail = pageDetail.value
  if (detail && typeof detail === 'object') return detail
  return page.value
})

const childPages = computed(() => {
  const docs = Array.isArray(fetchData.value?.docs) ? fetchData.value.docs : []
  const current = page.value
  if (!current) return [] as Array<{ id: string; title: string; path: string }>
  return getDirectChildConnectPages(docs, current.id)
})

const pageBreadcrumbs = computed(() => {
  const docs = Array.isArray(fetchData.value?.docs) ? fetchData.value.docs : []
  return buildConnectPageBreadcrumbs(docs, route.path)
})

const isChildConnectPage = computed(() => Boolean(page.value?.parentId))

type ConnectPageTabItem = { id: string; title: string; path: string }

function toConnectPageTabItem(
  doc: { id?: string | number; title?: string | null; slug?: string | null },
  path: string,
): ConnectPageTabItem {
  return {
    id: String(doc.id),
    title: (doc.title || doc.slug || 'Untitled').toString().trim(),
    path,
  }
}

const primaryTabPages = computed(() => {
  const docs = Array.isArray(fetchData.value?.docs) ? fetchData.value.docs : []
  const current = page.value
  if (!current) return [] as ConnectPageTabItem[]

  const { pathById } = buildPagePathMap(docs)
  const currentPath = pathById.get(String(current.id)) || route.path.replace(/\/$/, '') || '/'

  if (current.parentId) {
    const parent = docs.find((p: { id?: string | number }) => String(p.id) === String(current.parentId))
    const parentPath = parent ? pathById.get(String(parent.id)) : null
    const siblings = getConnectPageSiblings(docs, current.id)
    const tabs: ConnectPageTabItem[] = []
    if (parent && parentPath) {
      tabs.push(toConnectPageTabItem(parent, parentPath))
    }
    tabs.push(...siblings)
    return tabs.length > 1 ? tabs : []
  }

  const children = getDirectChildConnectPages(docs, current.id)
  if (!children.length) return []

  return [
    toConnectPageTabItem(current, currentPath),
    ...children,
  ]
})

const secondaryTabPages = computed(() => {
  if (!isChildConnectPage.value) return [] as ConnectPageTabItem[]
  const children = childPages.value
  if (!children.length) return []

  const docs = Array.isArray(fetchData.value?.docs) ? fetchData.value.docs : []
  const current = page.value
  if (!current) return []

  const { pathById } = buildPagePathMap(docs)
  const currentPath = pathById.get(String(current.id)) || route.path.replace(/\/$/, '') || '/'

  const tabs = [
    toConnectPageTabItem(current, currentPath),
    ...children,
  ]
  return tabs.length > 1 ? tabs : []
})

const hasSectionNav = computed(() => primaryTabPages.value.length > 1 || secondaryTabPages.value.length > 1)

const parentPageTitle = computed(() => {
  const docs = Array.isArray(fetchData.value?.docs) ? fetchData.value.docs : []
  const parentId = page.value?.parentId
  if (!parentId) return ''
  const parent = docs.find((p: any) => String(p.id) === String(parentId))
  return (parent?.title || parent?.slug || '').toString().trim()
})

const sectionNavHeading = computed(() => {
  if (isChildConnectPage.value) {
    const title = parentPageTitle.value
    return title ? `Pages in ${title}` : 'Pages in this section'
  }
  const title = (effectivePage.value?.title || page.value?.title || '').toString().trim()
  return title ? `Pages in ${title}` : 'Pages in this section'
})

const nestedChildPagesHeading = computed(() => {
  const title = (effectivePage.value?.title || page.value?.title || '').toString().trim()
  return title ? `Pages in ${title}` : 'Pages in this section'
})

function isTabActive(path: string): boolean {
  const current = route.path.replace(/\/$/, '') || '/'
  const target = path.replace(/\/$/, '') || '/'
  return current === target
}

function normalizeContactRef(raw: unknown): ResolvedContactRef | null {
  if (raw == null) return null
  if (typeof raw === 'string' || typeof raw === 'number') {
    const id = String(raw).trim()
    return id ? { id } : null
  }
  if (typeof raw !== 'object') return null
  const obj: any = raw

  const readId = (value: unknown): string => {
    if (value == null) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
    if (typeof value === 'object') {
      const o: any = value
      if (o.id != null) return String(o.id).trim()
      if (o.value != null) return String(o.value).trim()
    }
    return ''
  }

  const directId = readId(obj.id)
  if (directId) {
    const avatarUrl = resolveContactAvatarUrl(obj)
    return {
      id: directId,
      seeded: {
        id: directId,
        name: typeof obj.name === 'string' ? obj.name : null,
        employeeTitle: typeof obj.employeeTitle === 'string' ? obj.employeeTitle : null,
        email: typeof obj.email === 'string' ? obj.email : null,
        phone: typeof obj.phone === 'string' ? obj.phone : null,
        avatar: avatarUrl ? { url: avatarUrl } : null,
      },
    }
  }

  const relationId = readId(obj.value)
  if (relationId) return { id: relationId }
  return null
}

const rawContactRefs = computed<ResolvedContactRef[]>(() => {
  const detailContacts = (pageDetail.value as any)?.contacts
  const raw = Array.isArray(detailContacts)
    ? detailContacts
    : (page.value as any)?.contacts
  if (!Array.isArray(raw)) return [] as ResolvedContactRef[]
  return raw
    .map((item) => normalizeContactRef(item))
    .filter((item): item is ResolvedContactRef => item != null)
})

const contactIdsToHydrate = computed(() => {
  const out = new Set<string>()
  for (const ref of rawContactRefs.value) {
    const seeded = ref.seeded
    const hasDisplayData = Boolean(
      seeded?.name || seeded?.email || seeded?.phone || seeded?.employeeTitle || seeded?.avatar?.url,
    )
    if (!hasDisplayData) out.add(ref.id)
  }
  return [...out]
})

const { data: hydratedContacts } = useAsyncData<Record<string, ConnectUser>>(
  () => `connect-page-contacts-${currentPageId.value}-${contactIdsToHydrate.value.join(',')}`,
  async () => {
    const ids = contactIdsToHydrate.value
    if (!ids.length) return {}
    const entries = await Promise.all(ids.map(async (id) => {
      try {
        const user = await $fetch<any>(`/api/users/${encodeURIComponent(id)}`)
        const avatarUrl = resolveContactAvatarUrl(user)
        const normalized: ConnectUser = {
          id,
          name: user?.name ?? null,
          employeeTitle: user?.employeeTitle ?? null,
          email: user?.email ?? null,
          phone: user?.phone ?? null,
          avatar: avatarUrl ? { url: avatarUrl } : null,
        }
        return [id, normalized] as const
      } catch {
        return [id, { id }] as const
      }
    }))
    return Object.fromEntries(entries)
  },
  { watch: [currentPageId, contactIdsToHydrate], lazy: true },
)

const contacts = computed<ConnectUser[]>(() => {
  const hydratedById = hydratedContacts.value || {}
  return rawContactRefs.value.map((ref) => {
    const seeded = ref.seeded || {}
    const hydrated = hydratedById[ref.id] || null
    const avatarUrl = hydrated?.avatar?.url || seeded.avatar?.url || null
    return {
      id: ref.id,
      name: hydrated?.name ?? seeded.name ?? null,
      employeeTitle: hydrated?.employeeTitle ?? seeded.employeeTitle ?? null,
      email: hydrated?.email ?? seeded.email ?? null,
      phone: hydrated?.phone ?? seeded.phone ?? null,
      avatar: avatarUrl ? { url: avatarUrl } : null,
    }
  })
})

const contactsHeading = computed(() => {
  const h = String(
    (pageDetail.value as any)?.contactsHeading ??
    (page.value as any)?.contactsHeading ??
    '',
  ).trim()
  return h || 'Contacts'
})

function initialsForContact(name: string | null | undefined) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function lexicalToHtml(node: any): string {
  if (!node || typeof node !== 'object') return ''

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').trim()
  const pdfTitleFromHref = (href: string) => {
    try {
      const u = new URL(href)
      const last = decodeURIComponent((u.pathname.split('/').pop() || '').trim())
      return last.replace(/\.pdf$/i, '') || 'PDF Document'
    } catch {
      return 'PDF Document'
    }
  }
  const isPdfUrl = (href: string) => {
    if (/\.pdf(?:$|[?#])/i.test(href)) return true
    try {
      const base = import.meta.client ? window.location.origin : 'http://localhost'
      const url = new URL(href, base)
      const src = url.searchParams.get('src') || ''
      return /\.pdf(?:$|[?#])/i.test(decodeURIComponent(src))
    } catch {
      return false
    }
  }
  const toViewerHref = (href: string, linkText?: string) => {
    if (!isPdfUrl(href)) return href
    try {
      const base = import.meta.client ? window.location.origin : 'http://localhost'
      const url = new URL(href, base)
      if (url.pathname === '/pdf' && url.searchParams.get('src')) return href
    } catch {}
    const candidate = (linkText || '').trim()
    const title = candidate || pdfTitleFromHref(href)
    return `/pdf?src=${encodeURIComponent(href)}&title=${encodeURIComponent(title)}&from=${encodeURIComponent(route.fullPath)}`
  }

  const pdfAttr = (href: string) => (isPdfUrl(href) ? ' data-pdf-link="true"' : '')
  const isInternalConnectHref = (href: string) => {
    if (href.startsWith('/')) return true
    try {
      const base = import.meta.client ? window.location.origin : 'http://localhost'
      const url = new URL(href, base)
      if (url.origin === 'https://connect.asburyseminary.edu') return true
      if (import.meta.client && url.origin === window.location.origin) return true
      return false
    } catch {
      return false
    }
  }
  const externalAttr = (href: string) => (
    !isInternalConnectHref(href) && /^https?:\/\//i.test(href)
      ? ' data-external-link="true"'
      : ''
  )

  const isExternalHttpHref = (href: string) =>
    !isInternalConnectHref(href) && /^https?:\/\//i.test(href)

  /** Keeps underline on link text only; ::after external arrow is not underlined. */
  const wrapExternalAnchorInner = (href: string, innerHtml: string) =>
    isExternalHttpHref(href) ? `<span class="connect-external-link-text">${innerHtml}</span>` : innerHtml

  const urlRegex = /\bhttps?:\/\/[^\s<>"')\]}]+/gi
  const linkifyEscapedText = (escapedText: string) =>
    escapedText.replace(urlRegex, (matchedUrl) => {
      const href = toViewerHref(matchedUrl, pdfTitleFromHref(matchedUrl))
      const target = isPdfUrl(matchedUrl) ? '' : ' target="_blank" rel="noopener noreferrer"'
      const inner = wrapExternalAnchorInner(matchedUrl, escapeHtml(matchedUrl))
      return `<a href="${escapeHtml(href)}"${target}${pdfAttr(matchedUrl)}${externalAttr(matchedUrl)}>${inner}</a>`
    })

  /** Lexical TextNode: IS_CODE = 1 << 4 = 16 */
  const IS_LEXICAL_CODE = 16

  /**
   * Inline code starting with `@connect-videos` + JSON array:
   * `[{ "title": "…", "vimeoId": "123" }]` (also accepts `vimeo_id`)
   */
  const buildConnectVideoCollectionHtml = (raw: string): string | null => {
    const t = raw.trim()
    if (!t.startsWith('@connect-videos')) return null
    const jsonStr = t.replace(/^@connect-videos\s*/i, '').trim()
    if (!jsonStr) {
      return '<div class="connect-video-collection not-prose my-2 text-xs text-amber-800">@connect-videos: empty JSON</div>'
    }
    const parsed = parseConnectMagicJsonArray(t)
    if (!parsed) {
      return '<div class="connect-video-collection connect-video-collection--error not-prose my-2 text-xs text-red-600">@connect-videos: invalid JSON</div>'
    }
    const rows = parseConnectVideoRows(parsed)
    if (!rows.length) {
      return '<div class="connect-video-collection connect-video-collection--empty not-prose my-2 text-xs text-gray-500">@connect-videos: no valid items</div>'
    }
    return buildConnectVideosCollectionHtml(rows)
  }

  /**
   * Paragraph / code starting with `@connect-faq` + JSON array:
   * `[{ "question": "…", "answer": "…", "id": "optional-anchor" }]`
   * Optional `id` becomes a fragment target (`#id`) on the `<details>` element.
   */
  const buildConnectFaqHtml = (raw: string): string | null => {
    const t = raw.trim()
    if (!t.startsWith('@connect-faq')) return null
    const jsonStr = t.replace(/^@connect-faq\s*/i, '').trim()
    if (!jsonStr) {
      return '<div class="connect-faq-block not-prose my-2 text-xs text-amber-800">@connect-faq: empty JSON</div>'
    }
    const parsed = parseConnectMagicJsonArray(t)
    if (!parsed) {
      return '<div class="connect-faq-block not-prose my-2 text-xs text-red-600">@connect-faq: invalid JSON</div>'
    }
    const items: { question: string; answer: string; id: string }[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      const question = String(o.question ?? '').trim()
      const answer = String(o.answer ?? '').trim()
      if (!question || !answer) continue
      let id = typeof o.id === 'string' ? o.id.trim() : ''
      id = id.replace(/[^a-zA-Z0-9_-]/g, '')
      items.push({ question, answer, id })
    }
    if (!items.length) {
      return '<div class="connect-faq-block not-prose my-2 text-xs text-gray-500">@connect-faq: no valid items</div>'
    }
    const answerToInnerHtml = (answer: string) => {
      const paras = answer.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
      if (paras.length <= 1) {
        return escapeHtml(answer).replace(/\n/g, '<br>\n')
      }
      return paras
        .map(
          (p) =>
            `<p class="mb-2 last:mb-0">${escapeHtml(p).replace(/\n/g, '<br>\n')}</p>`,
        )
        .join('')
    }
    const blocks = items
      .map((item) => {
        const idAttr = item.id ? ` id="${escapeHtml(item.id)}"` : ''
        return `<details${idAttr} class="group rounded-lg border border-gray-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden open:shadow-md"><summary class="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,94,130,0.35)] focus-visible:ring-offset-1">${escapeHtml(item.question)}</summary><div class="border-t border-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-700">${answerToInnerHtml(item.answer)}</div></details>`
      })
      .join('')
    return `<section class="connect-faq-block not-prose my-6 space-y-2" aria-label="Frequently asked questions">${blocks}</section>`
  }

  const buildConnectVimeoVideoBlockHtml = (raw: string): string | null => {
    const t = raw.trim()
    if (!t.toLowerCase().startsWith('@connect-vimeo-video')) return null
    const payload = t.replace(/^@connect-vimeo-video\s*/i, '').trim()
    if (!payload) {
      return '<div class="connect-vimeo-video-block not-prose my-2 text-xs text-amber-800">@connect-vimeo-video: missing payload</div>'
    }

    let parsedTitle = ''
    let parsedVideo = ''
    if (payload.startsWith('{')) {
      try {
        const parsed = JSON.parse(payload) as Record<string, unknown>
        parsedTitle = String(parsed.title ?? '').trim()
        parsedVideo = String(parsed.vimeoId ?? parsed.vimeo_id ?? parsed.videoId ?? '').trim()
      } catch {
        return '<div class="connect-vimeo-video-block not-prose my-2 text-xs text-red-600">@connect-vimeo-video: invalid JSON</div>'
      }
    } else {
      parsedVideo = payload
    }

    const vimeoId = normalizeVimeoVideoId(parsedVideo)
    if (!vimeoId) {
      return '<div class="connect-vimeo-video-block not-prose my-2 text-xs text-red-600">@connect-vimeo-video: invalid vimeoId/url</div>'
    }

    const title = parsedTitle || `Video ${vimeoId}`
    return `<p class="mb-4"><a href="#" data-connect-play-vimeo="${escapeHtml(vimeoId)}" data-connect-video-title="${escapeHtml(title)}" data-video-link="true">${escapeHtml(title)}</a></p>`
  }

  const buildConnectVimeoCollectionBlockHtml = (raw: string): string | null => {
    const t = raw.trim()
    if (!t.toLowerCase().startsWith('@connect-vimeo-collection')) return null
    const payload = t.replace(/^@connect-vimeo-collection\s*/i, '').trim()
    const { rows, errorHtml } = parseConnectVimeoCollectionPayload(payload)
    if (errorHtml) return errorHtml
    return buildConnectVimeoCollectionListHtml(rows)
  }

  const buildConnectMagicBlockHtml = (raw: string): string | null =>
    buildConnectVimeoVideoBlockHtml(raw) ??
    buildConnectVimeoCollectionBlockHtml(raw) ??
    buildConnectVideoCollectionHtml(raw) ??
    buildConnectFaqHtml(raw) ??
    buildConnectFormEmbedHtml(raw)

  /**
   * `@connect-form {"slug":"my-form"}`
   * or `@connect-form my-form`
   */
  const buildConnectFormEmbedHtml = (raw: string): string | null => {
    const t = raw.trim()
    if (!t.toLowerCase().startsWith('@connect-form')) return null
    const payload = t.replace(/^@connect-form\s*/i, '').trim()
    if (!payload) {
      return '<div class="connect-form-embed not-prose my-2 text-xs text-amber-800">@connect-form: missing slug</div>'
    }
    let slug = ''
    if (payload.startsWith('{')) {
      try {
        const parsed = JSON.parse(payload) as any
        slug = String(parsed?.slug || '').trim()
      } catch {
        return '<div class="connect-form-embed not-prose my-2 text-xs text-red-600">@connect-form: invalid JSON</div>'
      }
    } else {
      slug = payload.trim()
    }
    if (!slug) {
      return '<div class="connect-form-embed not-prose my-2 text-xs text-amber-800">@connect-form: missing slug</div>'
    }
    const safe = encodeURIComponent(slug)
    return `<div class="connect-form-embed hidden" data-connect-form-embed="${safe}"></div>`
  }

  /** Walk Lexical tree: list items are often `listitem → paragraph → text`. */
  const collectPlainText = (nodes: any): string => {
    if (nodes == null) return ''
    if (Array.isArray(nodes)) {
      let out = ''
      for (const n of nodes) out += collectPlainText(n)
      return out
    }
    if (typeof nodes !== 'object') return ''
    if (nodes.type === 'text') return typeof nodes.text === 'string' ? nodes.text : ''
    if (nodes.type === 'linebreak' || nodes.type === 'lineBreak') return '\n'
    if (Array.isArray(nodes.children)) return collectPlainText(nodes.children)
    return ''
  }

  const getLexicalNodeMagicPlain = (n: any): string | null => {
    if (!n || typeof n !== 'object') return null
    if (n.type === 'paragraph') return collectConnectMagicPlainText(n.children || []).trim()
    if (n.type === 'code') {
      return (
        typeof n.code === 'string'
          ? n.code
          : collectConnectMagicPlainText(Array.isArray(n.children) ? n.children : [])
      ).trim()
    }
    return null
  }

  const connectMagicJsonParses = (raw: string): boolean => {
    const t = raw.trim()
    if (t.toLowerCase().startsWith('@connect-vimeo-video')) {
      const payload = t.replace(/^@connect-vimeo-video\s*/i, '').trim()
      if (!payload) return false
      if (!payload.startsWith('{')) return normalizeVimeoVideoId(payload) != null
      try {
        const parsed = JSON.parse(payload) as any
        const id = parsed?.vimeoId ?? parsed?.vimeo_id ?? parsed?.videoId ?? ''
        return normalizeVimeoVideoId(id) != null
      } catch {
        return false
      }
    }
    if (t.toLowerCase().startsWith('@connect-vimeo-collection')) {
      const payload = t.replace(/^@connect-vimeo-collection\s*/i, '').trim()
      if (!payload) return false
      if (!payload.startsWith('{') && !payload.startsWith('[')) {
        return normalizeVimeoCollectionIframeUrl(payload) != null
      }
      try {
        const parsed = JSON.parse(payload) as any
        if (Array.isArray(parsed)) {
          return parsed.some((row) => {
            if (!row || typeof row !== 'object') return false
            const url = (row as any).url ?? (row as any).vimeoUrl ?? ''
            return normalizeVimeoCollectionIframeUrl(url) != null
          })
        }
        const url = parsed?.url ?? parsed?.vimeoUrl ?? ''
        return normalizeVimeoCollectionIframeUrl(url) != null
      } catch {
        return false
      }
    }
    if (t.toLowerCase().startsWith('@connect-videos')) {
      return connectMagicBlockJsonParses(t)
    }
    if (t.toLowerCase().startsWith('@connect-faq')) {
      return connectMagicBlockJsonParses(t)
    }
    if (t.toLowerCase().startsWith('@connect-form')) {
      const payload = t.replace(/^@connect-form\s*/i, '').trim()
      if (!payload) return false
      if (!payload.startsWith('{')) return true
      try {
        const parsed = JSON.parse(payload) as any
        const slug = String(parsed?.slug || '').trim()
        return Boolean(slug)
      } catch {
        return false
      }
    }
    return false
  }

  const tryCoalesceRootMagic = (children: any[], start: number): { html: string; next: number } | null => {
    const firstPlain = getLexicalNodeMagicPlain(children[start])
    if (firstPlain === null) return null
    const low = firstPlain.toLowerCase()
    if (
      !low.startsWith('@connect-faq') &&
      !low.startsWith('@connect-videos') &&
      !low.startsWith('@connect-vimeo-video') &&
      !low.startsWith('@connect-vimeo-collection') &&
      !low.startsWith('@connect-form')
    ) return null
    let merged = firstPlain
    let j = start
    const max = Math.min(children.length, start + 80)
    while (j < max) {
      if (connectMagicJsonParses(merged)) {
        const html = buildConnectMagicBlockHtml(merged)
        if (html !== null) return { html, next: j + 1 }
      }
      const nextPlain = getLexicalNodeMagicPlain(children[j + 1])
      if (nextPlain === null) break
      j++
      merged += connectMagicMergeSeparator(merged) + nextPlain
    }
    return null
  }

  if (node.type === 'root' && Array.isArray(node.children)) {
    const ch = node.children
    const parts: string[] = []
    let i = 0
    while (i < ch.length) {
      const co = tryCoalesceRootMagic(ch, i)
      if (co) {
        parts.push(co.html)
        i = co.next
      } else {
        parts.push(lexicalToHtml(ch[i]))
        i++
      }
    }
    return parts.join('')
  }
  if (node.type === 'paragraph') {
    const ch = node.children || []
    const plain = collectConnectMagicPlainText(ch)
    const magic = buildConnectMagicBlockHtml(plain)
    if (magic !== null) return magic
    const inner = ch.map(lexicalToHtml).join('')
    return inner ? `<p class="mb-4 leading-relaxed">${inner}</p>` : ''
  }
  if (node.type === 'heading') {
    const tag = node.tag || 'h2'
    const inner = (node.children || []).map(lexicalToHtml).join('')
    return inner ? `<${tag} class="mt-8 mb-3 font-semibold">${inner}</${tag}>` : ''
  }
  if (node.type === 'quote') {
    const inner = (node.children || []).map(lexicalToHtml).join('')
    return inner ? `<blockquote>${inner}</blockquote>` : ''
  }
  if (node.type === 'list') {
    const tag = node.listType === 'number' ? 'ol' : 'ul'
    const inner = (node.children || []).map(lexicalToHtml).join('')
    if (!inner) return ''
    if (tag === 'ol') return `<ol class="list-decimal ml-6 my-2">${inner}</ol>`
    return `<ul class="list-disc ml-6 my-2">${inner}</ul>`
  }
  if (node.type === 'listitem') {
    const ch = node.children || []
    const plain = collectPlainText(ch)
    const magic = buildConnectMagicBlockHtml(plain)
    if (magic !== null) return `<li class="list-item my-0 py-0.5">${magic}</li>`
    const inner = ch.map(lexicalToHtml).join('')
    return inner ? `<li class="list-item my-0 py-0.5">${inner}</li>` : ''
  }
  if (node.type === 'link') {
    const inner = (node.children || []).map(lexicalToHtml).join('')
    const href = typeof node?.fields?.url === 'string' ? node.fields.url : (typeof node.url === 'string' ? node.url : '')
    if (!inner || !href) return inner
    const viewerHref = toViewerHref(href, stripHtml(inner))
    const safeHref = escapeHtml(viewerHref)
    const target = isPdfUrl(href)
      ? ''
      : (node?.fields?.newTab || node.newTab) ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${safeHref}"${target}${pdfAttr(href)}${externalAttr(href)}>${wrapExternalAnchorInner(href, inner)}</a>`
  }
  if (node.type === 'inlineCode') {
    const raw =
      typeof node.text === 'string'
        ? node.text
        : collectPlainText(Array.isArray(node.children) ? node.children : [])
    const collection = buildConnectMagicBlockHtml(raw)
    if (collection !== null) return collection
    return `<code class="rounded bg-gray-100 px-1.5 py-0.5 text-[0.875em] font-mono text-gray-800">${escapeHtml(raw)}</code>`
  }
  if (node.type === 'code') {
    const raw =
      typeof (node as { code?: string }).code === 'string'
        ? (node as { code: string }).code
        : collectPlainText(Array.isArray(node.children) ? node.children : [])
    const codeMagic = buildConnectMagicBlockHtml(raw)
    if (codeMagic !== null) return codeMagic
    return `<pre class="not-prose my-3 overflow-x-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs"><code class="font-mono text-gray-800">${escapeHtml(raw)}</code></pre>`
  }
  if (node.type === 'text') {
    const raw = node.text || ''
    const format = Number(node.format) || 0
    const isCode = !!(format & IS_LEXICAL_CODE)
    const looksLikeMagic =
      raw.trim().startsWith('@connect-videos') ||
      raw.trim().startsWith('@connect-vimeo-video') ||
      raw.trim().startsWith('@connect-vimeo-collection') ||
      raw.trim().startsWith('@connect-faq') ||
      raw.trim().startsWith('@connect-form')
    if (isCode || looksLikeMagic) {
      const collection = buildConnectMagicBlockHtml(raw)
      if (collection !== null) return collection
      if (isCode) {
        return `<code class="rounded bg-gray-100 px-1.5 py-0.5 text-[0.875em] font-mono text-gray-800">${escapeHtml(raw)}</code>`
      }
    }
    let text = escapeHtml(raw)
    if (!text) return ''
    if (format & 1) text = `<strong>${text}</strong>`
    if (format & 2) text = `<em>${text}</em>`
    if (format & 8) text = `<u>${text}</u>`
    return linkifyEscapedText(text)
  }
  if (node.type === 'autolink') {
    const hrefRaw = node?.fields?.url || node?.url
    if (typeof hrefRaw !== 'string' || !hrefRaw) return ''
    const inner = (node.children || []).map(lexicalToHtml).join('')
    const titleFromText = stripHtml(inner) || pdfTitleFromHref(hrefRaw)
    const href = escapeHtml(toViewerHref(hrefRaw, titleFromText))
    const fallbackInner = inner || href
    const target = isPdfUrl(hrefRaw) ? '' : ' target="_blank" rel="noopener noreferrer"'
    return `<a href="${href}"${target}${pdfAttr(hrefRaw)}${externalAttr(hrefRaw)}>${wrapExternalAnchorInner(hrefRaw, fallbackInner)}</a>`
  }
  if (node.type === 'upload') {
    if (node.relationTo !== CONNECT_PAGES_MEDIA_RELATION) return ''
    const { url, alt } = resolveConnectPagesMediaFromLexicalValue(node.value)
    const src = normalizeConnectPageMediaUrl(url)
    if (!src) return ''
    const safeSrc = escapeHtml(src)
    const safeAlt = escapeHtml(alt || '')
    return `<figure class="connect-page-media-figure not-prose my-6"><img src="${safeSrc}" alt="${safeAlt}" class="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm" loading="lazy" decoding="async" /></figure>`
  }
  if (node.type === CONNECT_ACCORDION_LEXICAL_TYPE) {
    const items = (Array.isArray(node.children) ? node.children : [])
      .map((item: any) => {
        if (!item || item.type !== CONNECT_ACCORDION_ITEM_LEXICAL_TYPE) return ''
        const kids = Array.isArray(item.children) ? item.children : []
        const titleNode = kids.find((c: any) => c?.type === CONNECT_ACCORDION_TITLE_LEXICAL_TYPE)
        const bodyNode = kids.find((c: any) => c?.type === CONNECT_ACCORDION_BODY_LEXICAL_TYPE)
        const titleHtml = titleNode
          ? (titleNode.children || []).map(lexicalToHtml).join('')
          : escapeHtml(String(item.title || item.question || 'Details'))
        const bodyHtml = bodyNode
          ? (bodyNode.children || []).map(lexicalToHtml).join('')
          : kids
              .filter(
                (c: any) =>
                  c?.type !== CONNECT_ACCORDION_TITLE_LEXICAL_TYPE &&
                  c?.type !== CONNECT_ACCORDION_BODY_LEXICAL_TYPE,
              )
              .map(lexicalToHtml)
              .join('')
        const itemId = String(item.itemId || item.id || '').replace(/[^a-zA-Z0-9_-]/g, '')
        const idAttr = itemId ? ` id="${escapeHtml(itemId)}"` : ''
        return `<details${idAttr} class="group rounded-lg border border-gray-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden open:shadow-md"><summary class="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,94,130,0.35)] focus-visible:ring-offset-1">${titleHtml || 'Details'}</summary><div class="connect-accordion-body border-t border-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-700 prose prose-sm prose-gray max-w-none">${bodyHtml}</div></details>`
      })
      .filter(Boolean)
      .join('')
    if (!items) return ''
    return `<section class="connect-accordion-block not-prose my-6 space-y-2" aria-label="Accordion">${items}</section>`
  }
  if (
    node.type === CONNECT_ACCORDION_ITEM_LEXICAL_TYPE ||
    node.type === CONNECT_ACCORDION_TITLE_LEXICAL_TYPE ||
    node.type === CONNECT_ACCORDION_BODY_LEXICAL_TYPE
  ) {
    // Only rendered as children of accordion; flat-map defensively if orphaned.
    return (node.children || []).map(lexicalToHtml).join('')
  }
  if (Array.isArray(node.children)) return node.children.map(lexicalToHtml).join('')
  return ''
}

const contentHtml = computed(() => {
  const c = effectivePage.value?.content as any
  if (!c) return ''
  if (typeof c === 'string') return c
  if (c && typeof c === 'object' && 'html' in c && typeof (c as { html: string }).html === 'string') {
    return (c as { html: string }).html
  }
  if (c && typeof c === 'object' && c.root && typeof c.root === 'object') return lexicalToHtml(c.root)
  return ''
})

const renderedContentSegments = computed<Array<{ kind: 'html' | 'form'; value: string }>>(() => {
  const html = String(contentHtml.value || '')
  if (!html.trim()) return []
  const out: Array<{ kind: 'html' | 'form'; value: string }> = []
  const seenFormSlugs = new Set<string>()
  const markerRe = /<div[^>]*data-connect-form-embed="([^"]+)"[^>]*><\/div>/gi
  let last = 0
  let m: RegExpExecArray | null = null
  while ((m = markerRe.exec(html)) !== null) {
    const before = html.slice(last, m.index)
    if (before.trim()) out.push({ kind: 'html', value: before })
    const rawSlug = String(m[1] || '')
    const slug = decodeURIComponent(rawSlug).trim()
    if (slug && !seenFormSlugs.has(slug)) {
      out.push({ kind: 'form', value: slug })
      seenFormSlugs.add(slug)
    }
    last = m.index + m[0].length
  }
  const tail = html.slice(last)
  if (tail.trim()) out.push({ kind: 'html', value: tail })
  return out
})

function onContentClick(event: MouseEvent) {
  if (!import.meta.client) return
  if (event.defaultPrevented) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const target = event.target as HTMLElement | null
  const playEl = target?.closest('[data-connect-play-vimeo]') as HTMLElement | null
  if (playEl) {
    event.preventDefault()
    const id = playEl.getAttribute('data-connect-play-vimeo')?.trim()
    const title = playEl.getAttribute('data-connect-video-title')?.trim() || 'Video'
    if (id) playVideo({ vimeoId: id, title })
    return
  }

  const collectionEl = target?.closest('[data-connect-play-vimeo-collection]') as HTMLElement | null
  if (collectionEl) {
    event.preventDefault()
    const iframeUrl = collectionEl.getAttribute('data-connect-play-vimeo-collection')?.trim()
    const title = collectionEl.getAttribute('data-connect-video-title')?.trim() || 'Vimeo Collection'
    if (iframeUrl) playVimeoCollection({ iframeUrl, title })
    return
  }

  const link = target?.closest('a') as HTMLAnchorElement | null
  if (!link) return
  const hrefAttr = (link.getAttribute('href') || '').trim()
  if (!hrefAttr) return

  const text = (link.textContent || '').trim()
  const looksLikePdf = /\.pdf(?:$|[?#])/i.test(hrefAttr)

  // Handle absolute PDF links from raw HTML content by routing them through SPA viewer.
  if (looksLikePdf && /^https?:\/\//i.test(hrefAttr)) {
    event.preventDefault()
    const title = text || 'PDF Document'
    const to = `/pdf?src=${encodeURIComponent(hrefAttr)}&title=${encodeURIComponent(title)}&from=${encodeURIComponent(route.fullPath)}`
    navigateTo(to)
    return
  }

  const href = hrefAttr
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href)
      if (url.origin === window.location.origin) {
        event.preventDefault()
        navigateTo(`${url.pathname}${url.search}${url.hash}`)
      }
    } catch {}
    return
  }

  if (!href.startsWith('/')) return

  event.preventDefault()
  navigateTo(href)
}

useHead({
  title: () => {
    const title = effectivePage.value?.title || page.value?.title
    return title ? `${title} | Asbury Connect` : 'Asbury Connect'
  },
})
</script>

<style>
/* Prose often wins over utilities for `a { text-decoration }` — force subtle underlines here. */
article .connect-page-body.prose a {
  text-decoration: underline;
  text-decoration-color: rgba(13, 94, 130, 0.38);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}
article .connect-page-body.prose a:hover {
  text-decoration-color: rgba(13, 94, 130, 0.75);
}

article .connect-page-body.prose a[data-external-link="true"] {
  text-decoration: none;
}
article .connect-page-body.prose a[data-external-link="true"] .connect-external-link-text {
  text-decoration: underline;
  text-decoration-color: rgba(13, 94, 130, 0.38);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}
article .connect-page-body.prose a[data-external-link="true"]:hover .connect-external-link-text {
  text-decoration-color: rgba(13, 94, 130, 0.75);
}

article .connect-page-body.prose ul,
article .connect-page-body.prose ol {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

article .connect-page-body.prose li {
  margin-top: 0.1rem;
  margin-bottom: 0.1rem;
}

/* Lexical wraps list text in <p class="mb-4"> — that dominates vertical rhythm inside <li>. */
article .connect-page-body.prose li > p {
  margin-top: 0 !important;
  margin-bottom: 0.25rem !important;
}

article .connect-page-body.prose li > p:last-child {
  margin-bottom: 0 !important;
}

.prose a[data-pdf-link="true"]::after {
  content: '';
  display: inline-block;
  width: 0.95em;
  height: 0.95em;
  margin-left: 0.25em;
  vertical-align: -0.12em;
  background-color: #dc2626; /* red-600 */
  -webkit-mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'black'%20stroke-width%3D'2'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M14%202H6a2%202%200%200%200-2%202v16a2%202%200%200%200%202%202h12a2%202%200%200%200%202-2V8z'/%3E%3Cpath%20d%3D'M14%202v6h6'/%3E%3Cpath%20d%3D'M16%2013H8'/%3E%3Cpath%20d%3D'M16%2017H8'/%3E%3Cpath%20d%3D'M10%209H8'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'black'%20stroke-width%3D'2'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M14%202H6a2%202%200%200%200-2%202v16a2%202%200%200%200%202%202h12a2%202%200%200%200%202-2V8z'/%3E%3Cpath%20d%3D'M14%202v6h6'/%3E%3Cpath%20d%3D'M16%2013H8'/%3E%3Cpath%20d%3D'M16%2017H8'/%3E%3Cpath%20d%3D'M10%209H8'/%3E%3C/svg%3E") center / contain no-repeat;
}

.prose a[data-external-link="true"]::after {
  content: ' \2197';
  font-size: 0.85em;
  margin-left: 0.2em;
  color: #6b7280; /* gray-500 */
  vertical-align: 0.08em;
}

.prose [data-video-link="true"],
.prose [data-video-link="true"]:hover,
.prose [data-video-link="true"]:focus-visible {
  text-decoration: none;
}

.prose [data-video-link="true"]::after {
  content: '\25B6';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8em;
  height: 1.25em;
  margin-left: 0.44em;
  border: 1px solid #6b7280; /* gray-500 */
  border-radius: 0.32em;
  padding-left: 0.12em;
  padding-right: 0.04em;
  font-size: 0.62em;
  line-height: 1;
  color: #4b5563; /* gray-600 */
  vertical-align: middle;
  position: relative;
  top: -0.06em;
}

/* @connect-videos compact list */
article .connect-page-body.prose .connect-video-collection a,
article .connect-page-body.prose .connect-video-collection button {
  text-decoration: none;
}

article .connect-video-collection__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(229, 231, 235, 1);
  border-radius: 0.625rem;
  background: #fff;
  overflow: hidden;
}

article .connect-video-collection__item + .connect-video-collection__item {
  border-top: 1px solid rgba(243, 244, 246, 1);
}

article .connect-video-collection__row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

article .connect-video-collection__row:hover {
  background: rgba(13, 94, 130, 0.05);
}

article .connect-video-collection__row:focus-visible {
  outline: 2px solid rgba(13, 94, 130, 0.35);
  outline-offset: -2px;
}

article .connect-video-collection__play {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 9999px;
  color: rgba(13, 94, 130, 1);
  background: rgba(13, 94, 130, 0.1);
}

article .connect-video-collection__play svg {
  width: 0.625rem;
  height: 0.625rem;
  margin-left: 0.05rem;
}

article .connect-video-collection__row:hover .connect-video-collection__play {
  color: #fff;
  background: rgba(13, 94, 130, 1);
}

article .connect-video-collection__title {
  min-width: 0;
  font-size: 0.875rem;
  line-height: 1.35;
  font-weight: 500;
  color: #1f2937;
}

article .connect-video-collection__row:hover .connect-video-collection__title {
  color: rgba(13, 94, 130, 1);
}
</style>
