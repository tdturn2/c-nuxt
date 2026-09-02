<template>
  <section v-if="featuredBooks.length" class="w-full max-w-[180px]">
    <UCarousel
      v-slot="{ item }"
      loop
      :autoplay="{ delay: 5000 }"
      :items="featuredBooks"
      :ui="{
        item: 'basis-full ps-0',
        container: 'ms-0',
      }"
      class="mx-auto w-[140px]"
    >
      <NuxtLink
        :to="item.link || '/latest-books'"
        :target="isExternalLink(item.link) ? '_blank' : undefined"
        :rel="isExternalLink(item.link) ? 'noopener noreferrer' : undefined"
        class="block"
      >
        <div
          class="aspect-[2/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 bg-cover bg-center shadow-sm"
          :style="{ backgroundImage: `url(${JSON.stringify(item.image)})` }"
          role="img"
          :aria-label="item.title || 'Featured faculty publication'"
        />
      </NuxtLink>
    </UCarousel>
  </section>
</template>

<script setup lang="ts">
interface FeaturedBook {
  id: string | number
  image: string
  title?: string
  link?: string | null
}

const { data } = useFetch<{ books?: FeaturedBook[] }>('/api/books/featured', {
  key: 'connect-featured-books',
  lazy: true,
})

const featuredBooks = computed<FeaturedBook[]>(() =>
  Array.isArray(data.value?.books) ? data.value.books : [],
)

function isExternalLink(link?: string | null) {
  return typeof link === 'string' && /^https?:\/\//i.test(link)
}
</script>
