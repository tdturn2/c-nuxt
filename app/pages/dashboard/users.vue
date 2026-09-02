<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
          <p class="mt-1 text-sm text-gray-600">Create accounts, assign roles/groups, and update profile details including title and phone.</p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to the dashboard admin panel. Access is limited to staff.
        </div>

        <template v-else>
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]" @click="openCreateUserModal">
              Create User
            </button>
            <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="openCreateGroupModal">
              Create Group
            </button>
            <button type="button" class="ml-auto text-sm text-[rgba(13,94,130,1)] hover:underline" @click="loadData">Refresh</button>
          </div>

          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>

          <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 class="text-base font-semibold text-gray-900">
                Users
                <span class="ml-1 text-sm font-normal text-gray-500">
                  ({{ filteredUsers.length }}{{ userSearch.trim() ? ` / ${users.length}` : '' }})
                </span>
              </h2>
              <UInput
                v-model="userSearch"
                type="search"
                placeholder="Search name, email, title, phone..."
                icon="i-lucide-search"
                color="neutral"
                variant="outline"
                size="sm"
                class="w-full sm:w-80"
              />
            </div>
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">Name</th>
                  <th class="px-4 py-2 text-left font-semibold">Email</th>
                  <th class="px-4 py-2 text-left font-semibold">Title</th>
                  <th class="px-4 py-2 text-left font-semibold">Phone</th>
                  <th class="px-4 py-2 text-left font-semibold">Roles</th>
                  <th class="px-4 py-2 text-left font-semibold">Groups</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="7" class="px-4 py-4 text-gray-500">Loading users...</td>
                </tr>
                <tr v-else-if="!filteredUsers.length" class="border-t border-gray-200">
                  <td colspan="7" class="px-4 py-4 text-gray-500">
                    {{ userSearch.trim() ? 'No users match your search.' : 'No users found.' }}
                  </td>
                </tr>
                <tr v-for="user in filteredUsers" :key="String(user.id)" class="border-t border-gray-200">
                  <td class="px-4 py-3 font-medium text-gray-900">{{ user.name || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ user.email || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ user.employeeTitle || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ user.phone || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ formatRoles(user.roles) }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ formatGroupNames(user.groups) }}</td>
                  <td class="px-4 py-3 text-right space-x-2">
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click="openEditUserModal(user)">Edit</button>
                    <button type="button" class="text-red-700 hover:underline" @click="removeUser(user.id)">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="border-b border-gray-200 px-4 py-3">
              <h2 class="text-base font-semibold text-gray-900">Groups</h2>
              <p class="mt-1 text-xs text-gray-500">
                Assign users to a group to grant live page edit for matching paths (e.g. <span class="font-mono">arp</span> → <span class="font-mono">/arp</span>, <span class="font-mono">hr</span> → <span class="font-mono">/hr</span>, <span class="font-mono">registrar</span> → <span class="font-mono">/registrar</span>). Add prefixes in <span class="font-mono">shared/pageEditorGroups.ts</span> if needed.
              </p>
            </div>
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">Name</th>
                  <th class="px-4 py-2 text-left font-semibold">Slug</th>
                  <th class="px-4 py-2 text-left font-semibold">Description</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="4" class="px-4 py-4 text-gray-500">Loading groups...</td>
                </tr>
                <tr v-else-if="!groups.length" class="border-t border-gray-200">
                  <td colspan="4" class="px-4 py-4 text-gray-500">No groups found.</td>
                </tr>
                <tr v-for="group in groups" :key="String(group.id)" class="border-t border-gray-200">
                  <td class="px-4 py-3 font-medium text-gray-900">{{ group.name }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ group.slug }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ group.description || '—' }}</td>
                  <td class="px-4 py-3 text-right space-x-2">
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click="openEditGroupModal(group)">Edit</button>
                    <button type="button" class="text-red-700 hover:underline" @click="removeGroup(group.id)">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </template>
      </div>
    </main>

    <UModal v-model:open="userModalOpen" :ui="{ content: 'max-w-2xl', body: 'overflow-y-auto max-h-[85vh]' }">
      <template #body>
        <h2 class="text-lg font-semibold text-gray-900">{{ editingUserId ? 'Edit User' : 'Create User' }}</h2>
        <form class="mt-4 space-y-3" @submit.prevent="saveUser">
          <div class="grid gap-3 sm:grid-cols-2">
            <input v-model="userForm.name" type="text" placeholder="Display name" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <input v-model="userForm.email" type="email" placeholder="email@domain.edu" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <input v-model="userForm.employeeTitle" type="text" placeholder="Job title" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <input v-model="userForm.phone" type="tel" placeholder="Phone" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
          </div>
          <input
            v-model="userForm.password"
            type="text"
            :placeholder="editingUserId ? 'Leave blank to keep current password' : 'Optional password (auto-generated if blank)'"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
          <div>
            <p class="mb-2 text-sm font-medium text-gray-700">Roles</p>
            <div class="flex flex-wrap gap-3 text-sm">
              <label v-for="role in roleOptions" :key="role" class="inline-flex items-center gap-2">
                <input v-model="userForm.roles" :value="role" type="checkbox">
                <span class="capitalize">{{ role }}</span>
              </label>
            </div>
          </div>
          <div>
            <p class="mb-2 text-sm font-medium text-gray-700">Groups</p>
            <div class="max-h-40 overflow-auto rounded-md border border-gray-200 p-2">
              <label
                v-for="group in groups"
                :key="String(group.id)"
                class="flex items-center gap-2 px-1 py-1 text-sm"
              >
                <input v-model="userForm.groups" :value="group.id" type="checkbox">
                <span>{{ group.name }} <span class="text-gray-500">({{ group.slug }})</span></span>
              </label>
              <p v-if="!groups.length" class="px-1 py-1 text-sm text-gray-500">No groups available yet.</p>
            </div>
          </div>

          <div class="rounded-md border border-gray-200 p-3">
            <p class="text-sm font-medium text-gray-700">Avatar</p>
            <p v-if="!editingUserId" class="mt-1 text-xs text-gray-500">Create the user first, then reopen Edit to upload/select avatar.</p>
            <template v-else>
              <div class="mt-2 flex items-center gap-3">
                <img v-if="selectedAvatarUrl" :src="selectedAvatarUrl" alt="Selected avatar" class="h-12 w-12 rounded-full object-cover border border-gray-200">
                <div class="text-xs text-gray-600">Selected media ID: {{ userForm.avatarConnectUserMedia ?? 'none' }}</div>
              </div>
              <div class="mt-2 flex items-center gap-2">
                <input ref="avatarUploadInputRef" type="file" accept="image/*" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  :disabled="uploadingAvatar"
                  @click="uploadAvatar"
                >
                  {{ uploadingAvatar ? 'Uploading...' : 'Upload' }}
                </button>
              </div>
              <div class="mt-2 max-h-40 overflow-auto rounded-md border border-gray-200 divide-y divide-gray-100">
                <button
                  v-for="asset in avatarAssets"
                  :key="String(asset.id)"
                  type="button"
                  class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  @click="userForm.avatarConnectUserMedia = asset.id"
                >
                  <div class="min-w-0">
                    <p class="truncate text-gray-900">{{ asset.alt || `Avatar #${asset.id}` }}</p>
                    <p class="truncate text-xs text-gray-500">ID: {{ asset.id }}</p>
                  </div>
                  <span v-if="String(userForm.avatarConnectUserMedia) === String(asset.id)" class="text-xs text-[rgba(13,94,130,1)]">Selected</span>
                </button>
                <p v-if="!avatarAssets.length" class="px-3 py-2 text-xs text-gray-500">No avatar media found for this user.</p>
              </div>
            </template>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <button type="submit" class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]">
              {{ editingUserId ? 'Update user' : 'Create user' }}
            </button>
            <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="closeUserModal">
              Cancel
            </button>
          </div>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="groupModalOpen" :ui="{ content: 'max-w-lg' }">
      <template #body>
        <h2 class="text-lg font-semibold text-gray-900">{{ editingGroupId ? 'Edit Group' : 'Create Group' }}</h2>
        <form class="mt-4 space-y-3" @submit.prevent="saveGroup">
          <input v-model="groupForm.name" type="text" placeholder="Group name" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <input v-model="groupForm.slug" type="text" placeholder="group-slug" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <textarea
            v-model="groupForm.description"
            rows="3"
            placeholder="Description (optional)"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          ></textarea>
          <div class="flex items-center gap-2 pt-1">
            <button type="submit" class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]">
              {{ editingGroupId ? 'Update group' : 'Create group' }}
            </button>
            <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="closeGroupModal">
              Cancel
            </button>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
type GroupItem = {
  id: string | number
  name: string
  slug: string
  description?: string | null
}

type UserItem = {
  id: string | number
  name?: string
  email?: string
  employeeTitle?: string | null
  phone?: string | null
  roles?: string[]
  groups?: Array<GroupItem | string | number>
  avatarConnectUserMedia?: { id?: string | number; url?: string } | string | number | null
}

type AvatarAsset = {
  id: string | number
  alt?: string
  url?: string
}

const roleOptions = ['admin', 'faculty', 'staff', 'student', 'alumni'] as const
const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', { key: 'dashboard-users-me' })
const config = useRuntimeConfig()

const canManageDashboard = computed(() => {
  const roles: string[] = Array.isArray(me.value?.roles) ? me.value.roles : []
  return roles.some((role) => String(role).toLowerCase() === 'staff')
})

const users = ref<UserItem[]>([])
const groups = ref<GroupItem[]>([])
const avatarAssets = ref<AvatarAsset[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const userSearch = ref('')
const uploadingAvatar = ref(false)
const userModalOpen = ref(false)
const groupModalOpen = ref(false)
const editingUserId = ref<string | number | null>(null)
const editingGroupId = ref<string | number | null>(null)
const avatarUploadInputRef = ref<HTMLInputElement | null>(null)

const userForm = ref({
  name: '',
  email: '',
  employeeTitle: '',
  phone: '',
  password: '',
  roles: [] as string[],
  groups: [] as Array<string | number>,
  avatarConnectUserMedia: null as string | number | null,
})

const groupForm = ref({
  name: '',
  slug: '',
  description: '',
})

const selectedAvatarUrl = computed(() => {
  if (!userForm.value.avatarConnectUserMedia) return ''
  const match = avatarAssets.value.find((asset) => String(asset.id) === String(userForm.value.avatarConnectUserMedia))
  return normalizeMediaUrl(match?.url)
})

function normalizeMediaUrl(url?: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const baseUrl = String(config.public.connectApi || '').replace(/\/$/, '')
  if (!baseUrl) return url
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function resetUserForm() {
  editingUserId.value = null
  avatarAssets.value = []
  userForm.value = {
    name: '',
    email: '',
    employeeTitle: '',
    phone: '',
    password: '',
    roles: [],
    groups: [],
    avatarConnectUserMedia: null,
  }
}

function resetGroupForm() {
  editingGroupId.value = null
  groupForm.value = {
    name: '',
    slug: '',
    description: '',
  }
}

function closeUserModal() {
  userModalOpen.value = false
  resetUserForm()
}

function closeGroupModal() {
  groupModalOpen.value = false
  resetGroupForm()
}

function extractGroupId(group: GroupItem | string | number): string | number {
  if (typeof group === 'string' || typeof group === 'number') return group
  return group.id
}

function avatarIdFromUser(user: UserItem): string | number | null {
  const avatar = user.avatarConnectUserMedia
  if (!avatar) return null
  if (typeof avatar === 'string' || typeof avatar === 'number') return avatar
  return avatar.id ?? null
}

function formatRoles(roles: unknown): string {
  if (!Array.isArray(roles) || !roles.length) return '—'
  return roles.map((role) => String(role)).join(', ')
}

function formatGroupNames(userGroups: unknown): string {
  if (!Array.isArray(userGroups) || !userGroups.length) return '—'
  return userGroups
    .map((group) => {
      if (group && typeof group === 'object' && 'name' in group) return String((group as GroupItem).name || '')
      const id = String(group)
      const match = groups.value.find((item) => String(item.id) === id)
      return match?.name || id
    })
    .filter(Boolean)
    .join(', ')
}

const filteredUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter((user) => {
    const haystack = [
      user.name,
      user.email,
      user.employeeTitle,
      user.phone,
      formatRoles(user.roles),
      formatGroupNames(user.groups),
    ]
      .map((v) => String(v || '').toLowerCase())
      .join(' ')
    return haystack.includes(q)
  })
})

async function loadData() {
  if (!canManageDashboard.value) return
  loading.value = true
  error.value = null
  try {
    const [userRes, groupRes] = await Promise.all([
      $fetch<any>('/api/dashboard/users'),
      $fetch<any>('/api/dashboard/groups'),
    ])
    users.value = Array.isArray(userRes?.docs) ? userRes.docs : []
    groups.value = Array.isArray(groupRes?.docs) ? groupRes.docs : []
  } catch (e: any) {
    error.value = e?.message || 'Failed to load user management data.'
  } finally {
    loading.value = false
  }
}

async function loadUserAvatars(userId: string | number) {
  try {
    const res = await $fetch<any>(`/api/dashboard/users/${encodeURIComponent(String(userId))}/avatars`)
    avatarAssets.value = Array.isArray(res?.docs) ? res.docs : []
  } catch {
    avatarAssets.value = []
  }
}

function openCreateUserModal() {
  resetUserForm()
  userModalOpen.value = true
}

async function openEditUserModal(user: UserItem) {
  resetUserForm()
  editingUserId.value = user.id
  userForm.value = {
    name: user.name || '',
    email: user.email || '',
    employeeTitle: user.employeeTitle || '',
    phone: user.phone || '',
    password: '',
    roles: Array.isArray(user.roles) ? user.roles.map((role) => String(role)) : [],
    groups: Array.isArray(user.groups) ? user.groups.map(extractGroupId) : [],
    avatarConnectUserMedia: avatarIdFromUser(user),
  }
  userModalOpen.value = true
  await loadUserAvatars(user.id)
}

function openCreateGroupModal() {
  resetGroupForm()
  groupModalOpen.value = true
}

function openEditGroupModal(group: GroupItem) {
  resetGroupForm()
  editingGroupId.value = group.id
  groupForm.value = {
    name: group.name || '',
    slug: group.slug || '',
    description: group.description || '',
  }
  groupModalOpen.value = true
}

async function uploadAvatar() {
  if (!editingUserId.value) return
  const file = avatarUploadInputRef.value?.files?.[0]
  if (!file) {
    error.value = 'Choose an avatar file to upload.'
    return
  }
  uploadingAvatar.value = true
  error.value = null
  try {
    const body = new FormData()
    body.append('avatar', file)
    body.append('alt', userForm.value.name.trim() || 'User avatar')
    const updated: any = await $fetch(`/api/dashboard/users/${encodeURIComponent(String(editingUserId.value))}/avatar`, {
      method: 'POST',
      body,
    })
    userForm.value.avatarConnectUserMedia = avatarIdFromUser(updated)
    await loadUserAvatars(editingUserId.value)
    if (avatarUploadInputRef.value) avatarUploadInputRef.value.value = ''
  } catch (e: any) {
    error.value = e?.message || 'Failed to upload avatar.'
  } finally {
    uploadingAvatar.value = false
  }
}

async function saveUser() {
  error.value = null
  if (!userForm.value.email.trim()) {
    error.value = 'User email is required.'
    return
  }

  const payload = {
    name: userForm.value.name.trim(),
    email: userForm.value.email.trim(),
    employeeTitle: userForm.value.employeeTitle.trim(),
    phone: userForm.value.phone.trim(),
    password: userForm.value.password.trim(),
    roles: userForm.value.roles,
    groups: userForm.value.groups,
    avatarConnectUserMedia: userForm.value.avatarConnectUserMedia,
  }

  try {
    if (editingUserId.value != null) {
      await $fetch(`/api/dashboard/users/${encodeURIComponent(String(editingUserId.value))}`, {
        method: 'PATCH',
        body: payload,
      })
    } else {
      await $fetch('/api/dashboard/users', { method: 'POST', body: payload })
    }
    userModalOpen.value = false
    resetUserForm()
    await loadData()
  } catch (e: any) {
    error.value = e?.message || 'Failed to save user.'
  }
}

async function removeUser(id: string | number) {
  if (!confirm('Delete this user account?')) return
  error.value = null
  try {
    await $fetch(`/api/dashboard/users/${encodeURIComponent(String(id))}`, { method: 'DELETE' })
    await loadData()
  } catch (e: any) {
    error.value = e?.message || 'Failed to delete user.'
  }
}

async function saveGroup() {
  error.value = null
  if (!groupForm.value.name.trim()) {
    error.value = 'Group name is required.'
    return
  }

  const payload = {
    name: groupForm.value.name.trim(),
    slug: normalizeSlug(groupForm.value.slug || groupForm.value.name),
    description: groupForm.value.description.trim(),
  }

  try {
    if (editingGroupId.value != null) {
      await $fetch(`/api/dashboard/groups/${encodeURIComponent(String(editingGroupId.value))}`, {
        method: 'PATCH',
        body: payload,
      })
    } else {
      await $fetch('/api/dashboard/groups', { method: 'POST', body: payload })
    }
    groupModalOpen.value = false
    resetGroupForm()
    await loadData()
  } catch (e: any) {
    error.value = e?.message || 'Failed to save group.'
  }
}

async function removeGroup(id: string | number) {
  if (!confirm('Delete this group?')) return
  error.value = null
  try {
    await $fetch(`/api/dashboard/groups/${encodeURIComponent(String(id))}`, { method: 'DELETE' })
    await loadData()
  } catch (e: any) {
    error.value = e?.message || 'Failed to delete group.'
  }
}

watch(
  () => groupForm.value.name,
  (name) => {
    if (!editingGroupId.value && !groupForm.value.slug.trim()) {
      groupForm.value.slug = normalizeSlug(name)
    }
  },
)

watch(canManageDashboard, () => loadData(), { immediate: true })
</script>
