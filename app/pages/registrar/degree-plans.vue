<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav
          v-if="breadcrumbs.length"
          aria-label="Breadcrumb"
          class="mb-4"
        >
          <ol class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-600">
            <li
              v-for="(crumb, index) in breadcrumbs"
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

        <h1 class="text-3xl font-bold tracking-tight text-[rgba(13,94,130,1)]">
          Degree Plans
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-gray-600">
          Official degree-plan PDFs by academic year. Open a year to browse certificates and degree programs.
        </p>

        <div v-if="!catalog.length" class="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No degree-plan PDFs are available yet.
        </div>

        <section
          v-else
          class="connect-accordion-block not-prose mt-6 space-y-2"
          aria-label="Degree plan years"
        >
          <details
            v-for="(yearBlock, index) in catalog"
            :key="yearBlock.year"
            class="group rounded-lg border border-gray-200 bg-white shadow-sm open:shadow-md [&_summary::-webkit-details-marker]:hidden"
            :open="index === 0"
          >
            <summary
              class="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,94,130,0.35)] focus-visible:ring-offset-1"
            >
              {{ yearBlock.year }} Degree Plans
            </summary>

            <div class="connect-accordion-body space-y-5 border-t border-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-700">
              <p
                v-if="yearBlock.year === 2021"
                class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                2021 PDF coverage is incomplete — only plans that were available as PDF are listed.
              </p>

              <section
                v-for="section in yearBlock.sections"
                :key="`${yearBlock.year}-${section.id}`"
              >
                <h2 class="text-sm font-bold text-gray-900">
                  {{ section.title }}
                </h2>
                <ul class="mt-2 list-disc space-y-1.5 pl-5">
                  <li
                    v-for="link in section.links"
                    :key="link.filename"
                  >
                    <NuxtLink
                      :to="pdfViewerTo(link)"
                      class="text-[rgba(13,94,130,1)] underline decoration-[rgba(13,94,130,0.35)] underline-offset-2 hover:text-[rgba(10,69,92,1)]"
                    >
                      {{ link.title }}
                    </NuxtLink>
                  </li>
                </ul>
              </section>
            </div>
          </details>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  DEGREE_PLANS_CATALOG,
  type DegreePlanLink,
} from '@shared/degreePlansCatalog'
import {
  buildConnectPageBreadcrumbs,
  findConnectPageByPath,
  useConnectPagesTreeData,
} from '~/composables/useConnectPagesTree'

useSeoMeta({
  title: 'Degree Plans',
  description: 'Official Asbury Theological Seminary degree-plan PDFs by academic year.',
})

const route = useRoute()
const catalog = DEGREE_PLANS_CATALOG

const { data: pagesTree } = useConnectPagesTreeData()

const breadcrumbs = computed(() => {
  const docs = Array.isArray(pagesTree.value?.docs) ? pagesTree.value.docs : []
  const page = findConnectPageByPath(docs, '/registrar/degree-plans')
  if (!page) {
    return [
      { label: 'Registrar', to: '/registrar' },
      { label: 'Degree Plans' },
    ]
  }
  return buildConnectPageBreadcrumbs(docs, page)
})

function pdfViewerTo(link: DegreePlanLink) {
  const params = new URLSearchParams({
    src: link.href,
    title: link.title,
    from: route.fullPath,
  })
  return `/pdf?${params.toString()}`
}
</script>
