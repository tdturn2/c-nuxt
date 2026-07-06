<template>
  <div class="h-full flex bg-gray-50 min-h-0">
    <LeftColumn />
    <RightColumn>
      <div class="mx-auto flex w-full max-w-[1200px]">
        <div class="min-w-0 flex-1">
          <Timeline api-url="/api/posts" />
        </div>
        <aside class="hidden w-72 flex-shrink-0 border-l border-gray-200/80 xl:block">
          <div class="flex flex-col items-center space-y-8 px-6 pt-[5.25rem]">
            <NuxtLink
              to="/chapel"
              class="w-full max-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div class="border-b border-gray-100 px-3 py-2">
                <h2 class="text-sm font-semibold text-gray-900">Chapel This Week</h2>
              </div>
              <div class="flex justify-center px-4 py-5">
                <img
                  src="/estes-icon.png"
                  alt="Estes Chapel"
                  class="w-full max-w-[96px] object-contain"
                >
              </div>
            </NuxtLink>
            <NuxtLink
              v-if="featuredBooks.length"
              to="/latest-books"
              class="w-full max-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div class="border-b border-gray-100 px-3 py-2">
                <h2 class="text-sm font-semibold text-gray-900">Featured Facutly Publications</h2>
              </div>
              <div class="relative h-48 overflow-hidden p-3">
                <div class="book-flip-viewport">
                  <NuxtLink
                    v-for="(book, idx) in featuredBooks"
                    :key="`featured-book-${idx}-${book.id}`"
                    to="/latest-books"
                    class="book-flip-item"
                    :style="{
                      animationDuration: `${Math.max(featuredBooks.length, 1) * 4}s`,
                      animationDelay: `${idx * 4}s`,
                      animationIterationCount: featuredBooks.length > 1 ? 'infinite' : '1',
                      opacity: featuredBooks.length === 1 && idx === 0 ? 1 : undefined
                    }"
                  >
                    <img :src="book.image" alt="Featured book cover" class="h-full w-full object-contain p-2">
                  </NuxtLink>
                </div>
              </div>
            </NuxtLink>
            <NuxtLink to="/media/wesworld" class="w-full max-w-[180px]">
              <img
                src="https://ats-edu.storage.googleapis.com/uploads/WesWorld-1400.png"
                alt="WesWorld"
                class="w-full rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
            </NuxtLink>
            <NuxtLink to="/first-fruits" class="w-full max-w-[180px]">
              <img
                :src="firstFruitsLogo"
                alt="First Fruits"
                class="w-full rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
            </NuxtLink>
          </div>
        </aside>
      </div>
    </RightColumn>
  </div>
</template>

<script setup lang="ts">
import firstFruitsLogo from '../../assets/first-fruits.svg'

useHead({
  title: 'Asbury Connect'
})

type FeaturedBook = {
  id: string | number
  image: string
  link?: string | null
}

const { data: featuredBooksData } = useFetch<{ books?: FeaturedBook[] }>('/api/books/featured', {
  key: 'connect-featured-books',
  lazy: true,
})
const featuredBooks = computed(() =>
  Array.isArray(featuredBooksData.value?.books) ? featuredBooksData.value.books : []
)
</script>

<style scoped>
.book-flip-viewport {
  position: relative;
  height: 100%;
  width: 100%;
}

.book-flip-item {
  position: absolute;
  left: 50%;
  top: 50%;
  display: block;
  overflow: hidden;
  border-radius: 0.5rem;
  border: 1px solid rgba(229, 231, 235, 1);
  background: rgba(243, 244, 246, 1);
  opacity: 0;
  animation-name: book-flip-y;
  animation-timing-function: linear;
  animation-fill-mode: both;
  aspect-ratio: 2 / 3;
  height: 100%;
  width: auto;
  max-height: 100%;
  transform: translate(-50%, -50%);
}

@keyframes book-flip-y {
  0% {
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  24% {
    opacity: 1;
  }
  40% {
    opacity: 0.8;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}
</style>
