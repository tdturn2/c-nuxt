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
      content: 'max-w-lg max-h-[85vh] flex flex-col',
      body: 'overflow-y-auto min-h-0 flex-1',
      header: 'shrink-0',
    }"
  >
    <template #header>
      <div class="flex w-full items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Faculty Profile</h2>
        <button
          type="button"
          class="rounded p-1 text-gray-400 hover:text-gray-600"
          @click="modalOpen = false"
        >
          <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
        </button>
      </div>
    </template>

    <template #body>
      <div v-if="profileLoading" class="flex items-center justify-center py-12">
        <span class="text-gray-500 text-sm">Loading profile…</span>
      </div>

      <div v-else-if="profileError" class="py-2 text-red-700 text-sm">{{ profileError }}</div>

      <div v-else-if="profile" class="space-y-6">
        <div class="flex flex-col items-center text-center">
          <div class="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-300">
            <img
              v-if="profile.avatar?.url"
              :src="profile.avatar.url"
              :alt="profile.name"
              class="h-full w-full object-cover"
            >
            <span v-else class="text-3xl font-semibold text-gray-600">
              {{ profile.name?.charAt(0)?.toUpperCase() }}
            </span>
          </div>
          <h3 class="text-xl font-bold text-gray-900">{{ profile.name }}</h3>
          <p v-if="profile.section" class="mt-0.5 text-sm text-gray-600">{{ sectionLabel(profile.section) }}</p>
          <p v-if="profile.employeeTitle" class="mt-0.5 text-sm text-gray-500">{{ profile.employeeTitle }}</p>
        </div>

        <div v-if="showTabs" class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md border px-3 py-1.5 text-sm transition-colors"
            :class="tab === 'overview'
              ? 'border-[rgba(13,94,130,1)] bg-[rgba(13,94,130,1)] text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
            @click="tab = 'overview'"
          >
            Overview
          </button>
          <button
            v-if="expertiseItems.length"
            type="button"
            class="rounded-md border px-3 py-1.5 text-sm transition-colors"
            :class="tab === 'expertise'
              ? 'border-[rgba(13,94,130,1)] bg-[rgba(13,94,130,1)] text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
            @click="tab = 'expertise'"
          >
            Expertise
          </button>
          <button
            v-if="educationItems.length"
            type="button"
            class="rounded-md border px-3 py-1.5 text-sm transition-colors"
            :class="tab === 'education'
              ? 'border-[rgba(13,94,130,1)] bg-[rgba(13,94,130,1)] text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
            @click="tab = 'education'"
          >
            Education
          </button>
        </div>

        <div v-if="!showTabs || tab === 'overview'" class="space-y-3">
          <div v-if="aboutParagraphs.length">
            <h4 class="mb-1 text-sm font-semibold text-gray-900">About</h4>
            <div class="space-y-2 text-sm text-gray-700">
              <p v-for="(paragraph, index) in aboutParagraphs" :key="index" class="whitespace-pre-wrap">
                {{ paragraph }}
              </p>
            </div>
          </div>
          <p v-else class="text-sm text-gray-500">No bio available.</p>
        </div>

        <div v-else-if="tab === 'expertise'">
          <ul class="list-disc space-y-2 pl-5 text-sm text-gray-700">
            <li v-for="item in expertiseItems" :key="item.id">{{ item.item }}</li>
          </ul>
        </div>

        <div v-else-if="tab === 'education'">
          <ul class="list-disc space-y-2 pl-5 text-sm text-gray-700">
            <li v-for="item in educationItems" :key="item.id">{{ item.item }}</li>
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
