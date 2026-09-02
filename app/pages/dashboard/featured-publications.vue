<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Featured Publications</h1>
          <p class="mt-1 text-sm text-gray-600">
            Choose which book publications appear in the homepage right column.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to the dashboard admin panel. Access is limited to staff.
        </div>
        <div
          v-else-if="!canManageAdmin"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          Featured publications management is limited to Connect admins.
        </div>

        <template v-else>
          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>
          <div v-if="success" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{{ success }}</div>

          <div class="mb-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
              :disabled="saving || loading"
              @click="saveFeatured"
            >
              {{ saving ? 'Saving...' : 'Save featured publications' }}
            </button>
            <NuxtLink
              to="/dashboard/faculty-publications"
              class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
            >
              Manage faculty publications
            </NuxtLink>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div class="border-b border-gray-100 px-4 py-3">
                <h2 class="text-base font-semibold text-gray-900">Homepage featured</h2>
                <p class="mt-1 text-xs text-gray-500">Order controls the sequence in the homepage right column.</p>
              </div>
              <div v-if="loading" class="px-4 py-6 text-sm text-gray-500">Loading featured publications...</div>
              <div v-else-if="!featuredRows.length" class="px-4 py-6 text-sm text-gray-500">
                No featured publications selected yet.
              </div>
              <ul v-else class="divide-y divide-gray-100">
                <li
                  v-for="(book, index) in featuredRows"
                  :key="String(book.id)"
                  class="flex items-center gap-3 px-4 py-3"
                >
                  <div class="h-16 w-12 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100">
                    <img
                      v-if="book.imageUrl"
                      :src="book.imageUrl"
                      :alt="book.title"
                      class="h-full w-full object-cover"
                    >
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900">{{ book.title }}</p>
                    <p v-if="book.ownerName" class="truncate text-xs text-gray-500">{{ book.ownerName }}</p>
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      class="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      :disabled="index === 0"
                      @click="moveFeatured(index, -1)"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      class="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      :disabled="index === featuredRows.length - 1"
                      @click="moveFeatured(index, 1)"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      class="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      @click="removeFeatured(book.id)"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              </ul>
            </section>

            <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div class="border-b border-gray-100 px-4 py-3">
                <h2 class="text-base font-semibold text-gray-900">Add publications</h2>
                <p class="mt-1 text-xs text-gray-500">Only book-type publications with cover images can be featured.</p>
              </div>
              <div class="border-b border-gray-100 px-4 py-3">
                <UInput
                  v-model="searchQuery"
                  type="search"
                  placeholder="Search by title..."
                  icon="i-lucide-search"
                  color="neutral"
                  variant="outline"
                  size="sm"
                />
              </div>
              <div v-if="loadingBooks" class="px-4 py-6 text-sm text-gray-500">Loading publications...</div>
              <ul v-else class="max-h-[32rem] divide-y divide-gray-100 overflow-y-auto">
                <li
                  v-for="book in availableBooks"
                  :key="String(book.id)"
                  class="flex items-center gap-3 px-4 py-3"
                >
                  <div class="h-16 w-12 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100">
                    <img
                      v-if="book.imageUrl"
                      :src="book.imageUrl"
                      :alt="book.title"
                      class="h-full w-full object-cover"
                    >
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900">{{ book.title }}</p>
                    <p v-if="book.ownerName" class="truncate text-xs text-gray-500">{{ book.ownerName }}</p>
                    <p v-if="!book.imageUrl" class="text-xs text-amber-700">Missing cover image</p>
                  </div>
                  <button
                    type="button"
                    class="shrink-0 rounded border border-gray-200 px-2 py-1 text-xs text-[rgba(13,94,130,1)] hover:bg-gray-50 disabled:opacity-40"
                    :disabled="!book.imageUrl || isFeatured(book.id)"
                    @click="addFeatured(book)"
                  >
                    {{ isFeatured(book.id) ? 'Added' : 'Add' }}
                  </button>
                </li>
                <li v-if="!availableBooks.length" class="px-4 py-6 text-sm text-gray-500">
                  No matching book publications found.
                </li>
              </ul>
            </section>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
type BookRow = {
  id: number
  title: string
  imageUrl: string | null
  ownerName: string | null
  releaseDate?: string | null
}

const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', {
  key: 'dashboard-featured-publications-me',
})

const { data: connectUserData, execute: loadConnectUser } = await useFetch<any>('/api/connect-users/me', {
  key: 'dashboard-featured-publications-connect-user',
  immediate: false,
})

const canManageDashboard = computed(() => {
  const roles: string[] = Array.isArray(me.value?.roles) ? me.value.roles : []
  return roles.some((r) => String(r).toLowerCase() === 'staff')
})

const canManageAdmin = computed(() => {
  const roles: string[] = [
    ...(Array.isArray(connectUserData.value?.doc?.roles) ? connectUserData.value.doc.roles : []),
    ...(Array.isArray(connectUserData.value?.doc?.fields?.roles) ? connectUserData.value.doc.fields.roles : []),
    ...(Array.isArray(me.value?.roles) ? me.value.roles : []),
  ]
    .map((role) => String(role || '').trim().toLowerCase())
    .filter(Boolean)

  if (roles.includes('admin')) return true

  const groups = Array.isArray(connectUserData.value?.doc?.groups) ? connectUserData.value.doc.groups : []
  return groups.some((group: any) => {
    const slug = String(group?.slug || '').trim().toLowerCase()
    const name = String(group?.name || '').trim().toLowerCase()
    const tag = `${slug} ${name}`.trim()
    return tag === 'admin' || tag.includes('admin ') || tag.includes(' admin') || tag.includes('connect-admin') || tag.includes('connect admin')
  })
})

watch(canManageDashboard, (allowed) => {
  if (allowed) loadConnectUser()
}, { immediate: true })

const loading = ref(false)
const loadingBooks = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const searchQuery = ref('')
const featuredRows = ref<BookRow[]>([])
const allBooks = ref<BookRow[]>([])

const featuredIds = computed(() => featuredRows.value.map((book) => book.id))

const availableBooks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return allBooks.value
  return allBooks.value.filter((book) =>
    book.title.toLowerCase().includes(q) ||
    (book.ownerName || '').toLowerCase().includes(q),
  )
})

function isFeatured(id: number) {
  return featuredIds.value.includes(id)
}

function moveFeatured(index: number, delta: number) {
  const next = index + delta
  if (next < 0 || next >= featuredRows.value.length) return
  const rows = [...featuredRows.value]
  const [item] = rows.splice(index, 1)
  rows.splice(next, 0, item)
  featuredRows.value = rows
}

function removeFeatured(id: number) {
  featuredRows.value = featuredRows.value.filter((book) => book.id !== id)
}

function addFeatured(book: BookRow) {
  if (!book.imageUrl || isFeatured(book.id)) return
  featuredRows.value = [...featuredRows.value, book]
}

async function loadFeatured() {
  if (!canManageAdmin.value) return
  loading.value = true
  error.value = null
  try {
    const res: any = await $fetch('/api/dashboard/featured-publications/settings')
    featuredRows.value = (Array.isArray(res?.featuredBooks) ? res.featuredBooks : [])
      .filter((book: any) => book?.id != null)
      .map((book: any) => ({
        id: Number(book.id),
        title: book.title || 'Untitled',
        imageUrl: book.imageUrl || null,
        ownerName: book.ownerName || null,
      }))
  } catch (e: any) {
    error.value = e?.message || 'Failed to load featured publications.'
  } finally {
    loading.value = false
  }
}

async function loadBooks() {
  if (!canManageAdmin.value) return
  loadingBooks.value = true
  try {
    const res: any = await $fetch('/api/dashboard/featured-publications/books')
    allBooks.value = (Array.isArray(res?.books) ? res.books : [])
      .filter((book: any) => book?.id != null)
      .map((book: any) => ({
        id: Number(book.id),
        title: book.title || 'Untitled',
        imageUrl: book.imageUrl || null,
        ownerName: book.ownerName || null,
        releaseDate: book.releaseDate || null,
      }))
  } catch (e: any) {
    error.value = e?.message || 'Failed to load book publications.'
  } finally {
    loadingBooks.value = false
  }
}

async function saveFeatured() {
  if (!canManageAdmin.value) return
  saving.value = true
  error.value = null
  success.value = null
  try {
    await $fetch('/api/dashboard/featured-publications/settings', {
      method: 'PATCH',
      body: { featuredBookIds: featuredIds.value },
    })
    success.value = 'Featured publications saved.'
    await loadFeatured()
    await clearNuxtData('connect-featured-books')
  } catch (e: any) {
    error.value = e?.message || 'Failed to save featured publications.'
  } finally {
    saving.value = false
  }
}

watch(canManageAdmin, (allowed) => {
  if (!allowed) return
  loadFeatured()
  loadBooks()
}, { immediate: true })
</script>
