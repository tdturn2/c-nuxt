<template>
  <UPopover :delay-open="300" :delay-close="100" mode="hover">
    <span class="inline-flex items-center gap-1.5 cursor-default text-[rgba(13,94,130,1)]">
      <img
        v-if="faculty.avatarUrl"
        :src="faculty.avatarUrl"
        :alt="faculty.name"
        class="w-8 h-8 rounded-full object-cover"
        width="32"
        height="32"
      >
      {{ displayName }}
    </span>
    <template #content>
      <div class="flex items-center gap-3 p-3 w-64">
        <img
          v-if="faculty.avatarUrl"
          :src="faculty.avatarUrl"
          :alt="faculty.name"
          class="w-12 h-12 rounded-full object-cover shrink-0"
          width="48"
          height="48"
        >
        <div
          v-else
          class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-sm font-medium text-gray-500"
        >
          {{ initials }}
        </div>
        <div class="min-w-0">
          <button
            type="button"
            class="block font-medium text-sm text-gray-900 hover:text-[rgba(13,94,130,1)] hover:underline truncate text-left"
            @click="openProfile"
          >
            {{ faculty.name }}
          </button>
          <p v-if="faculty.employeeTitle" class="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {{ faculty.employeeTitle }}
          </p>
          <button
            type="button"
            class="inline-flex items-center gap-1 mt-1 text-xs text-[rgba(13,94,130,1)] hover:underline"
            @click="openProfile"
          >
            View profile
          </button>
        </div>
      </div>
    </template>
  </UPopover>

  <UModal
    v-model:open="modalOpen"
    :ui="{
      overlay: 'bg-black/50',
      content: 'max-w-2xl w-[calc(100vw-1.5rem)] max-h-[85vh] overflow-hidden ring-0 shadow-2xl divide-y-0',
      header: 'hidden p-0 min-h-0',
      body: 'p-0 sm:p-0 overflow-y-auto max-h-[85vh]',
    }"
  >
    <template #body="{ close }">
      <div class="bg-white">
        <div class="sticky top-0 z-10 flex items-start justify-between gap-3 bg-[rgba(13,94,130,1)] px-5 py-4 text-white sm:px-6">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Faculty profile</p>
            <h2 class="truncate text-lg font-bold leading-tight sm:text-xl">
              {{ profile?.name || faculty.name }}
            </h2>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white hover:bg-white/15"
            aria-label="Close"
            @click="close()"
          >
            <UIcon name="i-lucide-x" class="h-5 w-5" />
          </button>
        </div>

        <div v-if="profileLoading" class="px-6 py-14 text-center text-sm text-gray-500">Loading profile…</div>
        <div v-else-if="profileError" class="px-6 py-10 text-center text-sm text-red-700">{{ profileError }}</div>

        <div v-else-if="profile" class="px-5 pb-6 pt-5 sm:px-6">
          <div class="flex items-start gap-4 sm:gap-5">
            <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 ring-4 ring-[rgba(13,94,130,0.12)] sm:h-24 sm:w-24">
              <img
                v-if="profile.avatar?.url"
                :src="profile.avatar.url"
                :alt="profile.name"
                class="h-full w-full object-cover"
              >
              <span v-else class="text-3xl font-semibold text-gray-500">
                {{ profile.name?.charAt(0)?.toUpperCase() }}
              </span>
            </div>
            <div class="min-w-0 pt-1">
              <h3 class="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{{ profile.name }}</h3>
              <p v-if="profile.section" class="mt-1 text-sm font-medium text-[rgba(13,94,130,1)]">
                {{ sectionLabel(profile.section) }}
              </p>
              <p v-if="profile.employeeTitle" class="mt-1 text-sm leading-snug text-gray-600">
                {{ profile.employeeTitle }}
              </p>
            </div>
          </div>

          <div v-if="showTabs" class="mt-6 flex gap-5 border-b border-gray-200">
            <button
              type="button"
              class="-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors"
              :class="tab === 'overview'
                ? 'border-[rgba(13,94,130,1)] text-[rgba(13,94,130,1)]'
                : 'border-transparent text-gray-500 hover:text-gray-800'"
              @click="tab = 'overview'"
            >
              Overview
            </button>
            <button
              v-if="expertiseItems.length"
              type="button"
              class="-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors"
              :class="tab === 'expertise'
                ? 'border-[rgba(13,94,130,1)] text-[rgba(13,94,130,1)]'
                : 'border-transparent text-gray-500 hover:text-gray-800'"
              @click="tab = 'expertise'"
            >
              Expertise
            </button>
            <button
              v-if="educationItems.length"
              type="button"
              class="-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors"
              :class="tab === 'education'
                ? 'border-[rgba(13,94,130,1)] text-[rgba(13,94,130,1)]'
                : 'border-transparent text-gray-500 hover:text-gray-800'"
              @click="tab = 'education'"
            >
              Education
            </button>
          </div>

          <div v-if="!showTabs || tab === 'overview'" class="mt-5">
            <div v-if="aboutParagraphs.length" class="space-y-3 text-[15px] leading-relaxed text-gray-700">
              <p v-for="(paragraph, index) in aboutParagraphs" :key="index" class="whitespace-pre-wrap">
                {{ paragraph }}
              </p>
            </div>
            <p v-else class="text-sm text-gray-500">No bio available.</p>
          </div>

          <ul v-else-if="tab === 'expertise'" class="mt-5 space-y-2.5">
            <li
              v-for="item in expertiseItems"
              :key="item.id"
              class="rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800"
            >
              {{ item.item }}
            </li>
          </ul>

          <ul v-else-if="tab === 'education'" class="mt-5 space-y-2.5">
            <li
              v-for="item in educationItems"
              :key="item.id"
              class="rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800"
            >
              {{ item.item }}
            </li>
          </ul>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
function sectionLabel(slug: string | null): string {
  if (!slug) return ''
  if (slug === 'lits') return 'LITS'
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function lexicalParagraphs(value: unknown): string[] {
  if (value == null) return []
  if (typeof value === 'string') {
    return value
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean)
  }
  if (typeof value !== 'object' || !('root' in (value as object))) return []
  const root = (value as { root?: { children?: any[] } }).root
  const children = Array.isArray(root?.children) ? root.children : []
  const extractText = (nodes: any[]): string =>
    nodes
      .map((child) => {
        if (child?.type === 'text' && typeof child?.text === 'string') return child.text
        if (Array.isArray(child?.children)) return extractText(child.children)
        return ''
      })
      .join('')
      .trim()
  return children
    .map((node) => extractText(Array.isArray(node?.children) ? node.children : [node]))
    .map((text) => text.trim())
    .filter(Boolean)
}

const props = defineProps<{
  faculty: {
    id: number
    name: string
    username?: string | null
    employeeTitle: string | null
    avatarUrl: string | null
  }
  displayName: string
}>()

const initials = computed(() => {
  const parts = props.faculty.name.split(/\s+/)
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
})

const modalOpen = ref(false)
const tab = ref<'overview' | 'expertise' | 'education'>('overview')
const profileLoading = ref(false)
const profileError = ref<string | null>(null)
const profile = ref<{
  name: string
  bio: string | null
  facultyBio: unknown
  expertise: Array<{ id?: string; item?: string | null }>
  education: Array<{ id?: string; item?: string | null }>
  avatar: { url: string } | null
  employeeTitle: string | null
  section: string | null
} | null>(null)

let profileLoaded = false

const expertiseItems = computed(() => {
  const rows = Array.isArray(profile.value?.expertise) ? profile.value.expertise : []
  return rows
    .map((row, index) => ({
      id: String(row.id || `expertise-${index}`),
      item: String(row.item || '').trim(),
    }))
    .filter((row) => row.item.length > 0)
})

const educationItems = computed(() => {
  const rows = Array.isArray(profile.value?.education) ? profile.value.education : []
  return rows
    .map((row, index) => ({
      id: String(row.id || `education-${index}`),
      item: String(row.item || '').trim(),
    }))
    .filter((row) => row.item.length > 0)
})

const showTabs = computed(() => expertiseItems.value.length > 0 || educationItems.value.length > 0)

const aboutParagraphs = computed(() => {
  const fromFacultyBio = lexicalParagraphs(profile.value?.facultyBio)
  if (fromFacultyBio.length) return fromFacultyBio
  const plain = profile.value?.bio?.trim()
  return plain ? [plain] : []
})

async function openProfile() {
  modalOpen.value = true
  if (profileLoaded) return

  profileLoading.value = true
  profileError.value = null

  try {
    const data = await $fetch<any>(`/api/users/${props.faculty.id}`)
    profile.value = {
      name: data.name ?? props.faculty.name,
      bio: data.bio ?? null,
      facultyBio: data.facultyBio ?? null,
      expertise: Array.isArray(data.expertise) ? data.expertise : [],
      education: Array.isArray(data.education) ? data.education : [],
      avatar: data.avatar ?? null,
      employeeTitle: data.employeeTitle ?? props.faculty.employeeTitle,
      section: data.section ?? null,
    }
    profileLoaded = true
    tab.value = 'overview'
  } catch (err: any) {
    profileError.value = err?.data?.message || 'Failed to load profile'
  } finally {
    profileLoading.value = false
  }
}
</script>
