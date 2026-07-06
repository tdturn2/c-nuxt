<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-3xl font-bold tracking-tight text-[rgba(13,94,130,1)]">Latest Books</h1>
        <p class="mt-2 text-sm text-gray-600">Recent Connect publications marked as books.</p>

        <div v-if="pending" class="mt-6 text-gray-500">Loading latest books...</div>
        <div v-else-if="error" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {{ error.message || 'Failed to load books.' }}
        </div>
        <div v-else-if="!books.length" class="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No books found.
        </div>

        <div v-else class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <article
            v-for="book in books"
            :key="String(book.id)"
            class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <a
              :href="book.link || undefined"
              :target="book.link ? '_blank' : undefined"
              :rel="book.link ? 'noopener noreferrer' : undefined"
              class="block"
            >
              <div class="h-52 w-full overflow-hidden rounded-lg bg-gray-100">
                <img
                  v-if="book.image"
                  :src="book.image"
                  :alt="book.title || 'Book cover'"
                  class="h-full w-full object-cover"
                >
              </div>
              <h2 class="mt-3 line-clamp-2 text-base font-semibold text-gray-900">{{ book.title || 'Untitled' }}</h2>
            </a>
            <p v-if="book.author" class="mt-1 text-sm text-gray-700">{{ book.author }}</p>
            <p v-if="book.releaseDate" class="mt-1 text-xs text-gray-500">{{ formatDate(book.releaseDate) }}</p>
            <a
              v-if="book.link"
              :href="book.link"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-block text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
            >
              View book
            </a>
          </article>
        </div>
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
}

const { data, pending, error } = useFetch<{ books?: LatestBook[] }>('/api/books/latest', {
  key: 'latest-books',
  lazy: true,
})

const books = computed(() => (Array.isArray(data.value?.books) ? data.value.books : []))

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
