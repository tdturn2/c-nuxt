<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-3xl font-bold tracking-tight text-[rgba(13,94,130,1)]">Faculty Publications</h1>
        <p class="mt-2 text-sm text-gray-600">Recent Connect publications marked as books.</p>

        <div class="mt-6 grid gap-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <div>
            <label for="latest-books-author" class="mb-1 block text-sm font-medium text-gray-700">Author</label>
            <select
              id="latest-books-author"
              v-model="authorFilter"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">All authors</option>
              <option
                v-for="author in authorOptions"
                :key="author.value"
                :value="author.value"
              >
                {{ author.label }}
              </option>
            </select>
          </div>
          <div>
            <label for="latest-books-search" class="mb-1 block text-sm font-medium text-gray-700">Search</label>
            <UInput
              id="latest-books-search"
              v-model="searchQuery"
              type="search"
              placeholder="Search by title or author..."
              icon="i-lucide-search"
              color="neutral"
              variant="outline"
            />
          </div>
        </div>

        <div v-if="pending" class="mt-6 text-gray-500">Loading publications...</div>
        <div v-else-if="error" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {{ error.message || 'Failed to load books.' }}
        </div>
        <div v-else-if="!allBooks.length" class="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No books found.
        </div>
        <div v-else-if="!filteredBooks.length" class="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No books match your filters.
        </div>

        <template v-else>
          <p class="mt-4 text-sm text-gray-500">
            Showing {{ filteredBooks.length }} of {{ allBooks.length }}
          </p>
          <div
            class="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 justify-items-center"
          >
            <template v-for="item in shelfItems" :key="shelfKey(item)">
            <h2
              v-if="item.kind === 'heading'"
              class="col-span-full justify-self-stretch text-left text-xl font-semibold tracking-tight text-[rgba(13,94,130,1)]"
            >
              {{ item.label }}
            </h2>
            <div v-else-if="item.kind === 'rule'" class="col-span-full justify-self-stretch py-4">
              <hr class="w-full border-gray-300">
            </div>
            <article
              v-else
              class="flex h-full w-full max-w-[11rem] flex-col justify-self-stretch"
            >
              <component
                :is="bookExternalHref(item.book) ? 'a' : 'div'"
                v-bind="bookExternalHref(item.book)
                  ? {
                      href: bookExternalHref(item.book)!,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    }
                  : {}"
                class="group block"
              >
                <div
                  class="aspect-[2/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-[#eceff3] p-3 shadow-sm transition-shadow group-hover:shadow-md"
                >
                  <img
                    v-if="item.book.image"
                    :src="item.book.image"
                    :alt="item.book.title || 'Book cover'"
                    class="mx-auto h-full w-full object-contain"
                  >
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center text-xs text-gray-500"
                  >
                    No cover
                  </div>
                </div>
                <h3 class="mt-3 line-clamp-3 h-[calc(0.875rem*1.375*3)] text-center text-sm font-semibold leading-snug text-gray-900 group-hover:text-[rgba(13,94,130,1)]">
                  {{ item.book.title || 'Untitled' }}
                </h3>
              </component>

              <NuxtLink
                v-if="item.book.author"
                :to="userProfilePath(item.book)"
                class="mt-3 flex h-8 min-w-0 items-center gap-2 rounded-md px-1 hover:bg-gray-100"
              >
                <div class="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-200 flex items-center justify-center">
                  <img
                    v-if="item.book.authorAvatar"
                    :src="item.book.authorAvatar"
                    :alt="item.book.author"
                    class="h-full w-full object-cover"
                  >
                  <span v-else class="text-xs font-semibold text-gray-600">
                    {{ item.book.author.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <span class="min-w-0 truncate text-sm text-gray-700 hover:text-[rgba(13,94,130,1)]">
                  {{ item.book.author }}
                </span>
              </NuxtLink>
              <div v-else class="mt-3 h-8" />

              <p class="mt-1 h-4 text-center text-xs text-gray-500">
                {{ item.book.releaseDate ? formatDate(item.book.releaseDate) : '' }}
              </p>
            </article>
            </template>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
type LatestBook = {
  id: string | number
  title?: string
  link?: string | null
  image?: string | null
  releaseDate?: string | null
  author?: string | null
  authorId?: number | null
  authorEmail?: string | null
  authorAvatar?: string | null
  homepageFeatured?: boolean
}

type ShelfItem =
  | { kind: 'heading'; id: string; label: string }
  | { kind: 'book'; book: LatestBook }
  | { kind: 'rule' }

useSeoMeta({
  title: 'Faculty Publications',
})

const { data, pending, error } = useFetch<{ books?: LatestBook[] }>('/api/books/latest', {
  key: 'latest-books',
  lazy: true,
})

const authorFilter = ref('')
const searchQuery = ref('')

const allBooks = computed(() => (Array.isArray(data.value?.books) ? data.value.books : []))

const authorOptions = computed(() => {
  const byKey = new Map<string, string>()
  for (const book of allBooks.value) {
    const label = (book.author || '').trim()
    if (!label) continue
    const key = book.authorId != null ? `id:${book.authorId}` : `name:${label.toLowerCase()}`
    if (!byKey.has(key)) byKey.set(key, label)
  }
  return [...byKey.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
})

const filteredBooks = computed(() => {
  const selected = authorFilter.value
  const q = searchQuery.value.trim().toLowerCase()
  return allBooks.value.filter((book) => {
    if (selected) {
      const key = book.authorId != null ? `id:${book.authorId}` : `name:${(book.author || '').trim().toLowerCase()}`
      if (key !== selected) return false
    }
    if (!q) return true
    const title = (book.title || '').toLowerCase()
    const author = (book.author || '').toLowerCase()
    return title.includes(q) || author.includes(q)
  })
})

const shelfItems = computed<ShelfItem[]>(() => {
  const featured = filteredBooks.value.filter((book) => book.homepageFeatured)
  const rest = filteredBooks.value.filter((book) => !book.homepageFeatured)
  const items: ShelfItem[] = []
  if (featured.length) {
    items.push({ kind: 'heading', id: 'latest', label: 'Latest Publications' })
    for (const book of featured) items.push({ kind: 'book', book })
  }
  if (featured.length && rest.length) items.push({ kind: 'rule' })
  if (rest.length) {
    items.push({ kind: 'heading', id: 'archive', label: 'Publication Archive' })
    for (const book of rest) items.push({ kind: 'book', book })
  }
  return items
})

function shelfKey(item: ShelfItem): string {
  if (item.kind === 'heading') return `heading:${item.id}`
  if (item.kind === 'rule') return 'rule'
  return String(item.book.id)
}

function bookExternalHref(book: LatestBook): string | null {
  const raw = typeof book.link === 'string' ? book.link.trim() : ''
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('//')) return `https:${raw}`
  // Treat plain domains / paths from publishers as external when they look absolute-ish
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(raw)) return `https://${raw}`
  return null
}

function userProfilePath(book: LatestBook): string {
  if (book.authorEmail?.includes('@')) {
    const username = book.authorEmail.split('@')[0]?.trim()
    if (username) return `/user/${encodeURIComponent(username)}`
  }
  if (book.authorId) return `/user/${book.authorId}`
  return '/'
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
