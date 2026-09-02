<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />

    <main class="min-w-0 flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Posts</h1>
            <p class="mt-1 text-sm text-gray-600">Create and manage posts shown on the homepage timeline.</p>
          </div>
          <button
            v-if="canManageDashboard"
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
            @click="createOpen = true"
          >
            New post
          </button>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          You do not have access to manage posts. Access is limited to staff.
        </div>

        <template v-else>
          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {{ error }}
          </div>
          <div v-if="success" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {{ success }}
          </div>

          <div class="mb-4">
            <UInput
              v-model="search"
              type="search"
              icon="i-lucide-search"
              placeholder="Search posts or authors..."
              class="max-w-md"
            />
          </div>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">Post</th>
                  <th class="px-4 py-3 text-left font-semibold">Author</th>
                  <th class="px-4 py-3 text-left font-semibold">Audience</th>
                  <th class="px-4 py-3 text-left font-semibold">Notifications</th>
                  <th class="px-4 py-3 text-left font-semibold">Created</th>
                  <th class="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="postsPending" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-5 text-gray-500">Loading posts...</td>
                </tr>
                <tr v-else-if="!filteredPosts.length" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-5 text-gray-500">No posts found.</td>
                </tr>
                <tr v-for="post in filteredPosts" :key="post.id" class="border-t border-gray-200">
                  <td class="max-w-xl px-4 py-3 text-gray-900">
                    <p v-if="isPinned(post)" class="mb-1 text-xs font-semibold uppercase tracking-wide text-[rgba(13,94,130,1)]">
                      Pinned
                    </p>
                    <p class="line-clamp-2 whitespace-pre-line">{{ postText(post) || '—' }}</p>
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-gray-700">{{ post.author?.name || post.author?.email || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ audienceLabel(post.audience) }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-gray-700">{{ notificationLabel(post) }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-gray-600">{{ formatDate(post.createdAt) }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      class="text-[rgba(13,94,130,1)] hover:underline disabled:opacity-50"
                      :disabled="pinningId === post.id"
                      @click="pinOrUnpinPost(post)"
                    >
                      {{ pinningId === post.id ? 'Saving...' : isPinned(post) ? 'Unpin' : 'Pin' }}
                    </button>
                    <button type="button" class="ml-3 text-[rgba(13,94,130,1)] hover:underline" @click="openEdit(post)">Edit</button>
                    <button type="button" class="ml-3 text-red-700 hover:underline" @click="deletePost(post)">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </main>

    <UModal
      v-model:open="createOpen"
      title="Create a post"
      description="Create a new post for the homepage timeline."
      :ui="{ content: 'max-w-3xl', body: 'p-6' }"
    >
      <template #body>
        <AddPost
          v-if="createOpen"
          allow-post-as
          rich-editor
          @post-created="handlePostCreated"
          @cancel="createOpen = false"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="editOpen"
      title="Edit post"
      description="Update this post's content, audience, and notification settings."
      :ui="{ content: 'max-w-3xl', body: 'p-6' }"
    >
      <template #body>
        <form class="space-y-4" @submit.prevent="savePost">
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700">Content</label>
            <DashboardRichTextEditor
              v-if="editOpen"
              :key="`edit-post-${editingId ?? 'none'}-${editEditorMountKey}`"
              v-model="editForm.contentTipTap"
              placeholder="Write a post…"
            />
          </div>
          <div>
            <DashboardPostAudienceSelect v-model="editForm.audiences" />
          </div>

          <div class="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-3">
            <label class="flex items-start gap-2">
              <input
                v-model="editForm.pinned"
                type="checkbox"
                class="mt-0.5 h-4 w-4 rounded border-gray-300 text-[rgba(13,94,130,1)] focus:ring-[rgba(13,94,130,1)]"
              >
              <span>
                <span class="block text-sm font-medium text-gray-700">Pin to top of timeline</span>
                <span class="block text-xs text-gray-500">
                  Pinned posts stay at the top of the homepage feed until you unpin them.
                </span>
              </span>
            </label>
            <label class="flex items-start gap-2">
              <input
                v-model="editForm.addToNotifications"
                type="checkbox"
                class="mt-0.5 h-4 w-4 rounded border-gray-300 text-[rgba(13,94,130,1)] focus:ring-[rgba(13,94,130,1)]"
              >
              <span>
                <span class="block text-sm font-medium text-gray-700">Show in notifications bar</span>
                <span class="block text-xs text-gray-500">
                  Surfaces this post under “Updates” in the notification bell. Automatically drops off {{ notificationTtlDays }} days after it was posted.
                </span>
              </span>
            </label>
          </div>

          <div class="flex justify-end gap-3">
            <button type="button" class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="editOpen = false">Cancel</button>
            <button type="submit" :disabled="saving || !canSaveEdit" class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {{ saving ? 'Saving...' : 'Save post' }}
            </button>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import {
  cloneTipTapDoc,
  INITIAL_TIPTAP_DOC,
  lexicalToTipTap,
  tipTapDocHasMeaningfulText,
  tipTapToLexical,
} from '~/utils/tiptap/lexicalTipTap'
import { postAudienceLabel, selectedAudiencesFromPost, serializePostAudience } from '~/utils/postAudience'

const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', {
  key: 'dashboard-posts-me',
})
const canManageDashboard = computed(() => {
  const roles = Array.isArray(me.value?.roles) ? me.value.roles : []
  return roles.some((role: unknown) => ['staff', 'admin'].includes(String(role).toLowerCase()))
})

const {
  data: postsData,
  pending: postsPending,
  refresh: refreshPosts,
} = await useFetch<any>('/api/posts', {
  key: 'dashboard-posts-list',
  immediate: canManageDashboard.value,
})

const posts = computed<any[]>(() => Array.isArray(postsData.value?.docs) ? postsData.value.docs : [])
const search = ref('')
const createOpen = ref(false)
const editOpen = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const editingId = ref<number | string | null>(null)
const pinningId = ref<number | string | null>(null)
const notificationTtlDays = NOTIFICATION_UPDATE_TTL_DAYS
const editEditorMountKey = ref(0)
const editForm = reactive({
  contentTipTap: cloneTipTapDoc(INITIAL_TIPTAP_DOC),
  audiences: [] as string[],
  pinned: false,
  addToNotifications: false,
  /** Categories preserved across edit other than `priority` and `pinned`. */
  otherCategories: [] as string[],
})

const canSaveEdit = computed(() => tipTapDocHasMeaningfulText(editForm.contentTipTap))

watch(canManageDashboard, (allowed) => {
  if (allowed && !postsData.value) refreshPosts()
})

const filteredPosts = computed(() => {
  const query = search.value.trim().toLowerCase()
  const list = !query
    ? posts.value
    : posts.value.filter((post) =>
        `${postText(post)} ${post.author?.name || ''} ${post.author?.email || ''}`.toLowerCase().includes(query),
      )
  return [...list].sort((a, b) => Number(isPinned(b)) - Number(isPinned(a)))
})

function postText(post: any): string {
  const collect = (node: any): string => {
    if (!node) return ''
    if (node.type === 'text') return String(node.text || '')
    const children = Array.isArray(node.children) ? node.children.map(collect).join('') : ''
    return ['paragraph', 'heading', 'listitem'].includes(node.type) ? `${children}\n` : children
  }
  return collect(post?.content?.root).trim()
}

function audienceLabel(audience: unknown): string {
  return postAudienceLabel(audience)
}

function formatDate(value: unknown): string {
  if (!value) return '—'
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function isPriority(categories: unknown): boolean {
  return Array.isArray(categories) && categories.includes('priority')
}

function isPinned(post: any): boolean {
  return Array.isArray(post?.categories) && post.categories.includes('pinned')
}

function postCategories(post: any): string[] {
  return Array.isArray(post?.categories) ? post.categories.map(String) : []
}

function notificationLabel(post: any): string {
  if (!isPriority(post?.categories)) return '—'
  const created = post?.createdAt ? new Date(String(post.createdAt)) : null
  if (!created || Number.isNaN(created.getTime())) return 'Active'
  const expiresAt = new Date(created.getTime() + notificationTtlDays * 24 * 60 * 60 * 1000)
  if (expiresAt.getTime() <= Date.now()) return `Expired ${expiresAt.toLocaleDateString()}`
  return `Until ${expiresAt.toLocaleDateString()}`
}

function buildEditCategories(): string[] {
  return [
    ...editForm.otherCategories,
    ...(editForm.pinned ? ['pinned'] : []),
    ...(editForm.addToNotifications ? ['priority'] : []),
  ]
}

function openEdit(post: any) {
  error.value = ''
  success.value = ''
  editingId.value = post.id
  editForm.contentTipTap = lexicalToTipTap(post.content)
  editEditorMountKey.value += 1
  editForm.audiences = selectedAudiencesFromPost(post.audience)

  const categories = postCategories(post)
  editForm.otherCategories = categories.filter((c) => c !== 'priority' && c !== 'pinned')
  editForm.pinned = categories.includes('pinned')
  editForm.addToNotifications = categories.includes('priority')

  editOpen.value = true
}

async function handlePostCreated() {
  createOpen.value = false
  success.value = 'Post created.'
  await refreshPosts()
}

async function savePost() {
  if (!editingId.value || !tipTapDocHasMeaningfulText(editForm.contentTipTap)) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await $fetch(`/api/posts/${editingId.value}`, {
      method: 'PATCH',
      body: {
        content: tipTapToLexical(editForm.contentTipTap),
        audience: serializePostAudience(editForm.audiences),
        categories: buildEditCategories(),
      },
    })
    editOpen.value = false
    success.value = 'Post updated.'
    await refreshPosts()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.statusMessage || 'Failed to update post.'
  } finally {
    saving.value = false
  }
}

const pinOrUnpinPost = async (post: any) => {
  if (pinningId.value) return
  pinningId.value = post.id
  error.value = ''
  success.value = ''
  const currentlyPinned = isPinned(post)
  const categories = postCategories(post).filter((c) => c !== 'pinned')
  if (!currentlyPinned) categories.push('pinned')
  try {
    await $fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      body: { categories },
    })
    success.value = currentlyPinned ? 'Post unpinned.' : 'Post pinned to the top of the timeline.'
    await refreshPosts()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.statusMessage || 'Failed to update pin.'
  } finally {
    pinningId.value = null
  }
}

async function deletePost(post: any) {
  if (!confirm(`Delete this post by ${post.author?.name || 'this author'}?`)) return
  error.value = ''
  success.value = ''
  try {
    await $fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
    success.value = 'Post deleted.'
    await refreshPosts()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.statusMessage || 'Failed to delete post.'
  }
}
</script>
