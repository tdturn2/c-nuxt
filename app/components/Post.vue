<template>
  <article class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-3">
    <!-- Post Header -->
    <div class="px-4 py-3 flex items-center gap-2.5">
      <UPopover
        :open="showHoverCard"
        :popper="{ placement: 'top-start', strategy: 'fixed' }"
        :content="{align: 'start', side: 'top',sideOffset: 8 }"
        @update:open="showHoverCard = $event"
      >
        <div
          class="flex items-center gap-3 min-w-0 flex-1"
          @mouseenter="onAuthorHoverEnter"
          @mouseleave="onAuthorHoverLeave"
        >
          <NuxtLink
            :to="`/user/${getUsernameFromEmail(displayUser.email)}`"
            class="flex w-10 h-10 rounded-full bg-gray-300 shrink-0 items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="displayUser.name"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-gray-600 font-semibold text-sm">
              {{ displayUser.name.charAt(0).toUpperCase() }}
            </span>
          </NuxtLink>
          <div class="flex-1 min-w-0">
            <NuxtLink
              :to="`/user/${getUsernameFromEmail(displayUser.email)}`"
              class="block"
            >
              <h3 class="font-semibold text-gray-900 truncate">{{ displayUser.name }}</h3>
            </NuxtLink>
            <p class="text-xs text-gray-500">{{ formatDate(post.createdAt) }}</p>
          </div>
        </div>
        <template #content>
          <div
            class="w-72 p-0 rounded-lg shadow-lg border border-gray-200 bg-white overflow-hidden"
            @mouseenter="onAuthorHoverEnter"
            @mouseleave="onAuthorHoverLeave"
          >
            <div v-if="hoverCardLoading" class="p-4 text-center text-gray-500 text-sm">
              Loading...
            </div>
            <template v-else-if="hoverCardData">
              <div class="p-4 flex gap-3">
                <div class="w-14 h-14 rounded-full bg-gray-200 shrink-0 overflow-hidden flex items-center justify-center">
                  <img
                    v-if="hoverCardData.avatarUrl"
                    :src="hoverCardData.avatarUrl"
                    :alt="hoverCardData.name"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-gray-600 font-semibold text-lg">
                    {{ (hoverCardData.name || ' ').charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="min-w-0 flex-1">
                  <h4 class="font-semibold text-gray-900 truncate">{{ hoverCardData.name }}</h4>
                  <div v-if="hoverCardData.roles?.length" class="flex flex-wrap gap-1 mt-1">
                    <span
                      v-for="r in hoverCardData.roles"
                      :key="r"
                      class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 capitalize"
                    >
                      {{ r }}
                    </span>
                  </div>
                  <p v-if="hoverCardData.employeeTitle" class="text-sm text-gray-600 mt-0.5">
                    {{ hoverCardData.employeeTitle }}
                  </p>
                  <p v-if="hoverCardData.degree" class="text-sm text-gray-600 mt-0.5">
                    {{ hoverCardData.degree }}
                  </p>
                  <p v-if="hoverCardData.from" class="text-sm text-gray-500 mt-0.5">
                    From {{ hoverCardData.from }}
                  </p>
                </div>
              </div>
            </template>
          </div>
        </template>
      </UPopover>
      <!-- Edit/Delete (only for own posts) -->
      <div v-if="isOwnPost && !isEditing" class="flex items-center gap-3 shrink-0">
        <a
          href="#"
          @click.prevent="handleEditClick"
          class="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          Edit
        </a>
        <a
          href="#"
          @click.prevent="showDeleteConfirm = true"
          class="text-xs text-red-600 hover:text-red-800 hover:underline font-medium"
        >
          Delete
        </a>
      </div>
    </div>

    <!-- Post Content (display mode) -->
    <div v-if="!isEditing && (postContent || youtubeEmbeds.length > 0)" class="px-4 pb-2">
      <div 
        class="text-gray-900 whitespace-pre-wrap"
        :style="!isExpanded && shouldTruncate ? 'display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;' : ''"
      >
        <div v-html="formattedContent"></div>
      </div>
      <div v-if="youtubeEmbeds.length > 0" class="mt-4 space-y-4">
        <div
          v-for="(embed, index) in youtubeEmbeds"
          :key="index"
          class="aspect-video w-full rounded-lg overflow-hidden"
        >
          <iframe
            :src="embed"
            class="w-full h-full block"
            style="border: none; border-radius: 0.5rem;"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </div>
      <a
        v-if="resolvedLinkPreview && firstPreviewUrl"
        :href="firstPreviewUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-4 block rounded-lg border border-gray-200 overflow-hidden hover:bg-gray-50 transition-colors"
      >
        <img
          v-if="resolvedLinkPreview.image"
          :src="resolvedLinkPreview.image"
          :alt="resolvedLinkPreview.title || 'Link preview image'"
          class="w-full h-44 object-cover border-b border-gray-200"
        />
        <div class="p-3">
          <div class="text-xs uppercase tracking-wide text-gray-500 mb-1">{{ resolvedLinkPreview.siteName }}</div>
          <div class="text-sm font-semibold text-gray-900 line-clamp-2">{{ resolvedLinkPreview.title }}</div>
          <div v-if="resolvedLinkPreview.description" class="text-xs text-gray-600 mt-1 line-clamp-3">
            {{ resolvedLinkPreview.description }}
          </div>
        </div>
      </a>
      <button
        v-if="shouldTruncate"
        @click="isExpanded = !isExpanded"
        class="mt-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        {{ isExpanded ? 'Show less' : 'Show more' }}
      </button>
    </div>

    <!-- Post Content (edit mode) -->
    <div v-if="isEditing" class="px-4 pb-2.5">
      <textarea
        v-model="editText"
        rows="4"
        class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        placeholder="What's on your mind?"
      />
      <div class="mt-3">
        <label class="block text-xs font-medium text-gray-700 mb-1">Audience</label>
        <select
          v-model="selectedAudience"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="general">General</option>
          <option value="students">Students</option>
          <option value="employees">Employees</option>
          <option value="staff">Staff</option>
          <option value="faculty">Faculty</option>
        </select>
      </div>
      <div class="mt-3">
        <div class="flex items-center gap-2">
          <input
            ref="editImageInputRef"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="handleEditImageSelect"
          />
          <button
            type="button"
            @click="editImageInputRef?.click()"
            class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Add Images
          </button>
          <button
            type="button"
            @click="openEditGallery"
            :disabled="savingEdit || editGalleryLoading"
            class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ editGalleryLoading ? 'Loading...' : 'My Gallery' }}
          </button>
          <span class="text-xs text-gray-500">Up to 4 total images</span>
        </div>
        <div v-if="editImages.length > 0" class="grid grid-cols-2 gap-2 mt-2">
          <div
            v-for="(img, index) in editImages"
            :key="img.key"
            :class="[
              'relative rounded-md overflow-hidden border',
              img.file ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'
            ]"
          >
            <img :src="img.previewUrl" :alt="img.alt || 'Post image'" class="w-full h-28 object-cover" />
            <span
              v-if="img.file"
              class="absolute top-1 left-1 px-2 py-0.5 text-[10px] font-semibold text-white bg-blue-600 rounded"
            >
              New
            </span>
            <span
              v-else-if="img.fromGallery"
              class="absolute top-1 left-1 px-2 py-0.5 text-[10px] font-semibold text-white bg-indigo-600 rounded"
            >
              Reused
            </span>
            <button
              type="button"
              @click="removeEditImage(index)"
              class="absolute top-1 right-1 px-2 py-1 text-[10px] font-medium text-white bg-black/60 rounded hover:bg-black/80"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
      <UModal v-model:open="editGalleryOpen" :ui="{ content: 'max-w-3xl', body: 'p-4' }">
        <template #header>
          <h3 class="text-base font-semibold text-gray-900">My Gallery</h3>
        </template>
        <template #body>
          <div v-if="editGalleryError" class="text-sm text-red-600 mb-3">{{ editGalleryError }}</div>
          <div v-if="editGalleryItems.length === 0 && !editGalleryLoading" class="text-sm text-gray-500">
            No previously uploaded images found.
          </div>
          <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              v-for="item in editGalleryItems"
              :key="item.id"
              type="button"
              @click="toggleEditGalleryItem(item)"
              :disabled="!isEditGalleryItemSelected(item) && editImages.length >= 4"
              :class="[
                'relative rounded-md overflow-hidden border-2',
                isEditGalleryItemSelected(item) ? 'border-indigo-600' : 'border-transparent'
              ]"
            >
              <img :src="item.url" :alt="item.alt || 'Gallery image'" class="w-full h-28 object-cover" />
              <span
                v-if="isEditGalleryItemSelected(item)"
                class="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-semibold text-white bg-indigo-600 rounded"
              >
                Selected
              </span>
            </button>
          </div>
        </template>
      </UModal>
      <div v-if="editDraftYoutubeEmbed || editDraftLinkPreview" class="mt-3 rounded-md border border-gray-200 overflow-hidden">
        <div class="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">
          Link Preview
        </div>
        <div v-if="editDraftYoutubeEmbed" class="aspect-video w-full">
          <iframe
            :src="editDraftYoutubeEmbed"
            class="w-full h-full block"
            style="border: none;"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
        <a
          v-else-if="editDraftLinkPreview"
          :href="editDraftLinkPreview.url"
          target="_blank"
          rel="noopener noreferrer"
          class="block hover:bg-gray-50 transition-colors"
        >
          <img
            v-if="editDraftLinkPreview.image"
            :src="editDraftLinkPreview.image"
            :alt="editDraftLinkPreview.title || 'Link preview image'"
            class="w-full h-40 object-cover border-b border-gray-200"
          />
          <div class="p-3">
            <div class="text-xs uppercase tracking-wide text-gray-500 mb-1">{{ editDraftLinkPreview.siteName }}</div>
            <div class="text-sm font-semibold text-gray-900 line-clamp-2">{{ editDraftLinkPreview.title }}</div>
            <div v-if="editDraftLinkPreview.description" class="text-xs text-gray-600 mt-1 line-clamp-3">
              {{ editDraftLinkPreview.description }}
            </div>
          </div>
        </a>
      </div>
      <div class="flex items-center gap-2 mt-2">
        <button
          @click="saveEdit"
          :disabled="!editText.trim() || savingEdit"
          class="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ savingEdit ? 'Saving...' : 'Save' }}
        </button>
        <button
          @click="cancelEdit"
          class="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Post Images -->
    <div v-if="!isEditing && post.images && post.images.length > 0" class="px-4 pb-2">
      <div v-if="post.images.length === 1 && post.images[0]?.image" class="rounded-xl overflow-hidden">
        <button
          type="button"
          @click="openImageModal(0)"
          class="block w-full"
        >
          <img
          :src="post.images[0].image.url"
          :alt="post.images[0].image.alt || 'Post image'"
          class="w-full h-auto object-cover"
          />
        </button>
      </div>
      <div v-else class="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
        <template v-for="(img, index) in post.images" :key="img.id">
          <button
            v-if="img.image"
            type="button"
            @click="openImageModal(index)"
            class="block w-full"
          >
            <img
            :src="img.image.url"
            :alt="img.image.alt || `Post image ${index + 1}`"
            class="w-full h-48 object-cover"
            />
          </button>
        </template>
      </div>
    </div>

    <!-- Post Actions -->
    <div class="border-t border-gray-200 px-4 py-2">
      <div class="flex items-center gap-3">
        <!-- Reaction Button with Picker -->
        <UPopover :open="showReactionPicker" @update:open="showReactionPicker = $event" :popper="{ placement: 'top' }">
          <template #default="{ open }">
            <UButton
              :disabled="togglingReaction || !currentUserId"
              variant="ghost"
              color="neutral"
              size="sm"
              :class="[
                'min-h-0 py-1! px-2! flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                userReaction ? getReactionConfig(userReaction).color : 'text-gray-600! hover:text-gray-900!'
              ]"
            >
              <span class="text-base leading-none" :class="userReaction ? '' : 'opacity-60'">
                {{ userReaction ? getReactionConfig(userReaction).emoji : '👍' }}
              </span>
              <span class="text-xs font-medium">
                {{ userReaction ? getReactionConfig(userReaction).label : 'Like' }}
              </span>
            </UButton>
          </template>
          
          <template #content>
            <div class="p-2 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col gap-2">
              <div class="flex items-center gap-1">
                <button
                  v-for="(config, type) in reactionConfig"
                  :key="type"
                  @click.stop="handleReactionClick(type as ReactionType)"
                  :disabled="togglingReaction || !currentUserId"
                  class="p-2 hover:scale-125 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  :title="config.label"
                  :class="userReaction === type ? 'ring-2 ring-blue-500 rounded-full' : ''"
                >
                  <span class="text-2xl">{{ config.emoji }}</span>
                </button>
              </div>
              <button
                v-if="userReaction"
                @click.stop="handleRemoveReaction"
                :disabled="togglingReaction || !currentUserId"
                class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                title="Remove reaction"
              >
                <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </template>
        </UPopover>
        
        <button 
          @click="handleCommentClick"
          class="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors py-1 px-1 rounded-md hover:bg-gray-50"
        >
          <UIcon name="i-heroicons-chat-bubble-left-right" class="w-4 h-4 shrink-0" />
          <span class="text-xs font-medium">Comment</span>
          <span v-if="commentCount > 0" class="text-xs text-gray-500">({{ commentCount }})</span>
        </button>
      </div>
      
      <!-- Reaction Summary -->
      <div v-if="reactions.length > 0" class="mt-1.5 flex items-center gap-2">
        <!-- Reaction Type Icons -->
        <div class="flex items-center gap-1">
          <template v-for="(count, type) in reactionCountsByType" :key="type">
            <span v-if="count > 0" class="text-sm" :title="`${count} ${getReactionConfig(type).label}`">
              {{ getReactionConfig(type).emoji }}
            </span>
          </template>
        </div>
        
        <!-- Reaction Count -->
        <span class="text-xs text-gray-600 font-medium">
          {{ reactionCount }}
        </span>
        
        <!-- Reaction Avatars -->
        <div class="flex -space-x-2 ml-2">
          <template v-for="(reaction, index) in reactions.slice(0, 5)" :key="reaction.id">
            <img
              v-if="reaction.user?.avatar?.url"
              :src="reaction.user.avatar.url"
              :alt="reaction.user.name"
              class="w-6 h-6 rounded-full border-2 border-white object-cover"
              :title="`${reaction.user.name} reacted with ${getReactionConfig(reaction.reactionType).label}`"
            />
            <div
              v-else
              class="w-6 h-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600"
              :title="`${reaction.user.name} reacted with ${getReactionConfig(reaction.reactionType).label}`"
            >
              {{ reaction.user?.name?.charAt(0)?.toUpperCase() || '?' }}
            </div>
          </template>
        </div>
      </div>

      <!-- Comments Section -->
      <div v-if="showComments" class="border-t border-gray-200 px-4 py-2 mt-2">
        <!-- Comment Form -->
        <div v-if="currentUserId" class="mb-2.5 relative">
          <textarea
            ref="commentTextareaRef"
            v-model="newCommentText"
            @input="handleCommentInput"
            @keydown="handleCommentKeydown"
            placeholder="Write a comment... Use @ to mention someone"
            rows="3"
            class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <MentionAutocomplete
            :is-visible="showMentionAutocomplete"
            :users="mentionUsers"
            :selected-index="mentionSelectedIndex"
            :position="mentionPosition"
            @select="handleMentionSelect"
            @update-selected-index="mentionSelectedIndex = $event"
          />
          <div class="flex items-center justify-end gap-2 mt-1.5">
            <button
              @click="submitComment"
              :disabled="!newCommentText.trim() || submittingComment"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ submittingComment ? 'Posting...' : 'Post Comment' }}
            </button>
          </div>
        </div>

        <!-- Comments List -->
        <div v-if="loadingComments" class="text-center py-4 text-gray-500 text-sm">
          Loading comments...
        </div>
        <div v-else-if="organizedComments.length > 0" class="space-y-2.5">
          <Comment
            v-for="comment in organizedComments"
            :key="comment.id"
            :comment="comment"
            :post-id="post.id"
            :current-user-id="currentUserId"
            @reply-created="handleReplyCreated"
            @comment-updated="handleCommentUpdated"
            @comment-deleted="handleCommentDeleted"
          />
        </div>
        <div v-else class="text-center py-4 text-gray-500 text-sm">
          No comments yet. Be the first to comment!
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="showDeleteConfirm = false">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-2">Delete Post?</h3>
        <p class="text-sm text-gray-600 mb-4">Are you sure you want to delete this post? This action cannot be undone.</p>
        <div class="flex items-center justify-end gap-2">
          <button
            @click="showDeleteConfirm = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="confirmDelete"
            :disabled="deletingPost"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ deletingPost ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <UModal
      v-model:open="isImageModalOpen"
      :ui="{ content: 'max-w-5xl max-h-[90vh] overflow-hidden', body: 'p-0 overflow-hidden' }"
    >
      <template #body>
        <div v-if="currentModalImage" class="bg-black rounded-lg overflow-hidden h-[90vh] max-h-[90vh] flex flex-col">
          <div class="relative flex-1 min-h-0">
            <img
              :src="currentModalImage.image.url"
              :alt="currentModalImage.image.alt || `Post image ${activeImageIndex + 1}`"
              class="w-full h-full object-contain"
            />
            <button
              v-if="modalImages.length > 1"
              type="button"
              @click="showPreviousImage"
              class="absolute left-3 top-1/2 -translate-y-1/2 px-3 py-2 text-white bg-black/50 rounded hover:bg-black/70"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              v-if="modalImages.length > 1"
              type="button"
              @click="showNextImage"
              class="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-2 text-white bg-black/50 rounded hover:bg-black/70"
              aria-label="Next image"
            >
              ›
            </button>
          </div>
          <div v-if="modalImages.length > 1" class="p-3 bg-gray-900 border-t border-white/10 shrink-0">
            <div class="flex items-center gap-2 overflow-x-auto">
              <button
                v-for="(img, idx) in modalImages"
                :key="`${img.id}-${idx}`"
                type="button"
                @click="activeImageIndex = idx"
                :class="[
                  'shrink-0 rounded overflow-hidden border-2',
                  idx === activeImageIndex ? 'border-white' : 'border-transparent'
                ]"
              >
                <img
                  v-if="img.image"
                  :src="img.image.url"
                  :alt="img.image.alt || `Thumbnail ${idx + 1}`"
                  class="w-16 h-16 object-cover"
                />
              </button>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </article>
</template>

<script setup lang="ts">
interface Author {
  id: number
  name: string
  avatar: string | null
  bio: string
  email: string
}

interface User {
  id: number
  name: string
  avatar: {
    id: number
    url: string
    alt: string
  } | null
  bio: string
  email: string
}

interface Image {
  id: string
  image: {
    id: number
    url: string
    alt: string
    width: number
    height: number
  }
}

interface Reaction {
  id: number
  user: {
    id: number
    name: string
    avatar?: {
      url: string
    } | null
  }
  reactionType: string
  createdAt: string
}

interface Post {
  id: number
  author: Author
  content: {
    root: {
      children: Array<{
        type: string
        children?: Array<{
          type: string
          text?: string
        }>
      }>
    }
  }
  images: Image[]
  audience?: string[]
  linkPreview?: {
    url: string
    title: string
    description: string
    image: string | null
    siteName: string
  } | null
  reactionRefreshAt?: number
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  post: Post
  user: User | null
  currentUserId?: number
  allowInlineEdit?: boolean
  allowInlineComments?: boolean
  startInEditMode?: boolean
  startWithCommentsOpen?: boolean
}>()

const { toggleReaction, getReactions, createReaction, deleteReaction, unreact } = useReactions()
const { fetchComments, organizeComments, createComment, extractTextFromContent, updateComment } = useComments()
const { searchUsers, createLexicalContentWithMentions, extractTextWithMentions } = useMentions()
const { fetchPreview } = useLinkPreview()

const emit = defineEmits<{
  postUpdated: [post: Post]
  postDeleted: [postId: number]
  postEditRequest: [post: Post & { user: User | null }]
  postCommentRequest: [post: Post & { user: User | null }]
}>()

const reactions = ref<Reaction[]>([])
const togglingReaction = ref(false)
const showReactionPicker = ref(false)

// Comments state
const showComments = ref(false)
const comments = ref<any[]>([])
const loadingComments = ref(false)
const newCommentText = ref('')
const submittingComment = ref(false)

// Edit/Delete state
const isEditing = ref(false)
const editText = ref('')
const savingEdit = ref(false)
const selectedAudience = ref<'general' | 'students' | 'employees' | 'staff' | 'faculty'>('general')
const editImageInputRef = ref<HTMLInputElement | null>(null)
type EditImage = {
  key: string
  previewUrl: string
  alt: string
  existingMediaId?: number
  file?: File
  fromGallery?: boolean
}
const editImages = ref<EditImage[]>([])
const editGalleryOpen = ref(false)
const editGalleryLoading = ref(false)
const editGalleryError = ref<string | null>(null)
const editGalleryItems = ref<Array<{ id: number; url: string; alt: string }>>([])
const editDraftLinkPreview = ref<{ url: string; title: string; description: string; image: string | null; siteName: string } | null>(null)
const editDraftYoutubeEmbed = ref<string | null>(null)
let editPreviewDebounce: ReturnType<typeof setTimeout> | null = null
const showDeleteConfirm = ref(false)
const deletingPost = ref(false)
const isImageModalOpen = ref(false)
const activeImageIndex = ref(0)

// Hover card (FB-style author preview)
const showHoverCard = ref(false)
const hoverCardData = ref<{
  name: string
  roles: string[]
  employeeTitle: string | null
  from: string | null
  degree: string | null
  avatarUrl: string | null
} | null>(null)
const hoverCardLoading = ref(false)
const hoverCardCache = new Map<number, typeof hoverCardData.value>()
let hoverCardOpenTimeout: ReturnType<typeof setTimeout> | null = null
let hoverCardCloseTimeout: ReturnType<typeof setTimeout> | null = null

const onAuthorHoverEnter = () => {
  if (hoverCardCloseTimeout) {
    clearTimeout(hoverCardCloseTimeout)
    hoverCardCloseTimeout = null
  }
  hoverCardOpenTimeout = setTimeout(async () => {
    showHoverCard.value = true
    const authorId = props.post.author?.id
    if (!authorId) return
    const cached = hoverCardCache.get(authorId)
    if (cached) {
      hoverCardData.value = cached
      return
    }
    hoverCardLoading.value = true
    hoverCardData.value = null
    try {
      const data = await $fetch<{
        name: string
        roles: string[]
        employeeTitle: string | null
        from: string | null
        degree: string | null
        avatarUrl: string | null
      }>(`/api/users/${authorId}/hover-card`)
      hoverCardData.value = data
      hoverCardCache.set(authorId, data)
    } catch {
      hoverCardData.value = null
    } finally {
      hoverCardLoading.value = false
    }
  }, 400)
}

const onAuthorHoverLeave = () => {
  if (hoverCardOpenTimeout) {
    clearTimeout(hoverCardOpenTimeout)
    hoverCardOpenTimeout = null
  }
  hoverCardCloseTimeout = setTimeout(() => {
    showHoverCard.value = false
    hoverCardCloseTimeout = null
  }, 200)
}

// Mention autocomplete state
const commentTextareaRef = ref<HTMLTextAreaElement | null>(null)
const showMentionAutocomplete = ref(false)
const mentionUsers = ref<Array<{ id: number; name: string; email: string; avatar: string | null }>>([])
const mentionSelectedIndex = ref(0)
const mentionPosition = ref({ top: 0, left: 0 })
const mentionQuery = ref('')
const mentionStartIndex = ref(-1)
const fallbackLinkPreview = ref<{ url: string; title: string; description: string; image: string | null; siteName: string } | null>(null)

// Reaction types
type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'pray'

// Reaction configuration
const reactionConfig: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  like: { emoji: '👍', label: 'Like', color: 'text-blue-600' },
  love: { emoji: '❤️', label: 'Love', color: 'text-red-600' },
  laugh: { emoji: '😂', label: 'Haha', color: 'text-yellow-600' },
  wow: { emoji: '😮', label: 'Wow', color: 'text-yellow-600' },
  sad: { emoji: '😢', label: 'Sad', color: 'text-yellow-600' },
  pray: { emoji: '🙏', label: 'Praying', color: 'text-purple-600' }
}

// Helper to safely get reaction config
const getReactionConfig = (type: string | null): { emoji: string; label: string; color: string } => {
  if (!type || !(type in reactionConfig)) {
    return reactionConfig.like
  }
  return reactionConfig[type as ReactionType]
}

// Check if this post belongs to the current user
const isOwnPost = computed(() => {
  return props.currentUserId !== undefined &&
         props.post.author?.id === props.currentUserId
})

const allowInlineEdit = computed(() => props.allowInlineEdit !== false)
const allowInlineComments = computed(() => props.allowInlineComments !== false)

// Fetch reactions for this post
const loadReactions = async () => {
  try {
    //console.log('Loading reactions for post:', props.post.id)
    const response: any = await getReactions(props.post.id)
    //console.log('Reactions response for post', props.post.id, ':', response)
    reactions.value = response?.docs || []
    //console.log('Set reactions to:', reactions.value)
  } catch (error) {
    console.error('Error loading reactions:', error)
  }
}

// Load reactions and comments on mount
onMounted(() => {
  if (import.meta.client) {
    loadReactions()
    loadComments() // Load comments on mount so count is available immediately
  }
})

// Watch for comments section to open and reload comments if needed
watch(showComments, async (isOpen) => {
  if (isOpen && comments.value.length === 0) {
    await loadComments()
  }
})

// Load comments
const loadComments = async () => {
  loadingComments.value = true
  try {
    // console.log('Loading comments for post:', props.post.id)
    const fetchedComments = await fetchComments(props.post.id)
    // console.log('Fetched comments:', fetchedComments)
    
    // Ensure we have fresh data by replacing the entire array
    // This ensures reactivity works properly
    await nextTick()
    comments.value = [...fetchedComments]
    console.log('Set comments.value to:', comments.value.length, 'comments')
  } catch (error) {
    console.error('Error loading comments:', error)
  } finally {
    loadingComments.value = false
  }
}

// Edit post
const getAudienceKey = (audience?: string[]): 'general' | 'students' | 'employees' | 'staff' | 'faculty' => {
  if (!audience || audience.length === 0 || audience.includes('all')) return 'general'
  if (audience.includes('students')) return 'students'
  if (audience.includes('employees')) return 'employees'
  if (audience.includes('staff')) return 'staff'
  if (audience.includes('faculty')) return 'faculty'
  return 'general'
}

const startEdit = () => {
  editText.value = extractTextWithMentions(props.post.content)
  selectedAudience.value = getAudienceKey(props.post.audience)
  editImages.value = (props.post.images || [])
    .filter((img) => Boolean(img?.image?.id) && Boolean(img?.image?.url))
    .map((img, index) => ({
      key: `existing-${img.image.id}-${index}`,
      previewUrl: img.image.url,
      alt: img.image.alt || 'Post image',
      existingMediaId: img.image.id
    }))
  isEditing.value = true
}

const handleEditClick = () => {
  if (!allowInlineEdit.value) {
    emit('postEditRequest', { ...props.post, user: props.user })
    return
  }
  startEdit()
}

const handleCommentClick = () => {
  if (!allowInlineComments.value) {
    emit('postCommentRequest', { ...props.post, user: props.user })
    return
  }
  showComments.value = !showComments.value
}

const cancelEdit = () => {
  editImages.value.forEach((img) => {
    if (img.file) URL.revokeObjectURL(img.previewUrl)
  })
  isEditing.value = false
  editText.value = ''
  editImages.value = []
}

const handleEditImageSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (!files.length) return

  const remainingSlots = Math.max(0, 4 - editImages.value.length)
  const imageFiles = files.filter((file) => file.type.startsWith('image/')).slice(0, remainingSlots)
  const oversized = imageFiles.find((file) => file.size > 5 * 1024 * 1024)
  if (oversized) {
    if (target) target.value = ''
    return
  }

  for (const file of imageFiles) {
    editImages.value.push({
      key: `new-${file.name}-${file.size}-${Date.now()}`,
      previewUrl: URL.createObjectURL(file),
      alt: file.name,
      file
    })
  }

  if (target) target.value = ''
}

const removeEditImage = (index: number) => {
  const img = editImages.value[index]
  if (img?.file) URL.revokeObjectURL(img.previewUrl)
  editImages.value.splice(index, 1)
}

const extractUrlsFromText = (text: string): string[] => {
  const matches = text.match(/\bhttps?:\/\/[^\s<>"')\]}]+/gi)
  return matches || []
}

const getYoutubeEmbedFromUrl = (url: string): string | null => {
  if (!url) return null
  if (url.includes('youtube.com/watch?v=')) {
    const id = url.split('v=')[1]?.split('&')[0]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  return null
}

const fetchEditGallery = async () => {
  editGalleryLoading.value = true
  editGalleryError.value = null
  try {
    const response = await $fetch<{ docs: Array<{ id: number; url: string; alt: string }> }>('/api/connect-user-media?kind=post-images&limit=100', {
      credentials: 'include'
    })
    editGalleryItems.value = (response?.docs || []).filter((item) => item.url)
  } catch (err: any) {
    editGalleryError.value = err?.data?.message || 'Failed to load gallery'
  } finally {
    editGalleryLoading.value = false
  }
}

const openEditGallery = async () => {
  editGalleryOpen.value = true
  await fetchEditGallery()
}

const isEditGalleryItemSelected = (item: { id: number }) =>
  editImages.value.some((img) => img.existingMediaId === item.id)

const toggleEditGalleryItem = (item: { id: number; url: string; alt: string }) => {
  const existingIdx = editImages.value.findIndex((img) => img.existingMediaId === item.id)
  if (existingIdx >= 0) {
    editImages.value.splice(existingIdx, 1)
    return
  }
  if (editImages.value.length >= 4) return
  editImages.value.push({
    key: `gallery-${item.id}`,
    previewUrl: item.url,
    alt: item.alt || 'Post image',
    existingMediaId: item.id,
    fromGallery: true
  })
}

const saveEdit = async () => {
  if (!editText.value.trim() || savingEdit.value) return

  savingEdit.value = true
  try {
    const content = createLexicalContentWithMentions(editText.value.trim())
    const audience = (() => {
      switch (selectedAudience.value) {
        case 'students': return ['students']
        case 'employees': return ['employees']
        case 'staff': return ['staff']
        case 'faculty': return ['faculty']
        case 'general':
        default:
          return []
      }
    })()

    const imageMediaIds: number[] = []
    for (const image of editImages.value) {
      if (image.existingMediaId) {
        const normalizedExistingId = Number(image.existingMediaId)
        if (!Number.isNaN(normalizedExistingId) && normalizedExistingId > 0) {
          imageMediaIds.push(normalizedExistingId)
        }
        continue
      }

      if (!image.file) continue
      const uploadForm = new FormData()
      uploadForm.append('file', image.file)
      uploadForm.append('alt', image.alt || image.file.name)
      uploadForm.append('kind', 'post-images')

      const media: any = await $fetch('/api/connect-user-media/upload', {
        method: 'POST',
        body: uploadForm
      })
      const uploadedId = Number(media?.id)
      if (!Number.isNaN(uploadedId) && uploadedId > 0) {
        imageMediaIds.push(uploadedId)
      }
    }

    // If user selected images but none resolved to valid IDs, do not send an empty array
    // that could unintentionally clear existing post images.
    if (editImages.value.length > 0 && imageMediaIds.length === 0) {
      throw new Error('No valid image IDs were resolved from your selected images')
    }

    const imageRelations = imageMediaIds.map((id) => ({ image: id }))

    const updated = await $fetch(`/api/posts/${props.post.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        content,
        audience,
        imagesConnectUserMedia: imageRelations,
        images: imageRelations
      }
    }) as Post

    if (updated) {
      // PATCH response may not include fully populated image relations/URLs.
      // Re-fetch canonical post shape so UI updates immediately without requiring refresh.
      const hydrated = await $fetch(`/api/posts/${props.post.id}`, {
        credentials: 'include'
      }).catch(() => null) as Post | null

      isEditing.value = false
      editText.value = ''
      editImages.value.forEach((img) => {
        if (img.file) URL.revokeObjectURL(img.previewUrl)
      })
      editImages.value = []
      emit('postUpdated', hydrated ? { ...props.post, ...hydrated } : { ...props.post, ...updated })
    }
  } catch (error) {
    console.error('Error updating post:', error)
  } finally {
    savingEdit.value = false
  }
}

// Delete post
const confirmDelete = async () => {
  if (deletingPost.value) return

  deletingPost.value = true
  try {
    await $fetch(`/api/posts/${props.post.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    showDeleteConfirm.value = false
    emit('postDeleted', props.post.id)
  } catch (error) {
    console.error('Error deleting post:', error)
  } finally {
    deletingPost.value = false
  }
}

// Organize comments into tree structure
const organizedComments = computed(() => {
  // Force reactivity by creating a new array reference
  const organized = organizeComments(comments.value)
  console.log('Organized comments computed:', organized.length, 'top-level comments')
  return organized
})

// Comment count
const commentCount = computed(() => {
  return comments.value.filter((comment: any) => {
    const parentId = typeof comment?.parent === 'object' && comment.parent !== null
      ? (comment.parent as any).id
      : comment?.parent
    return parentId === null || parentId === undefined
  }).length
})

// Handle comment input for mention detection
const handleCommentInput = async (e?: Event) => {
  const textarea = commentTextareaRef.value
  if (!textarea) return

  // Use setTimeout to ensure cursor position is updated
  await nextTick()
  
  const text = newCommentText.value
  const cursorPos = textarea.selectionStart || text.length
  
  console.log('Input detected, cursor pos:', cursorPos, 'text:', text)
  
  // Find @ symbol before cursor
  const textBeforeCursor = text.substring(0, cursorPos)
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')
  
  console.log('Last @ index:', lastAtIndex)
  
  if (lastAtIndex !== -1) {
    // Check if there's a space after @ (meaning mention is complete or invalid)
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
    const spaceIndex = textAfterAt.indexOf(' ')
    
    console.log('Text after @:', textAfterAt, 'space index:', spaceIndex)
    
    // Only show autocomplete if we're actively typing a mention (no space yet)
    if (spaceIndex === -1) {
      // We're in a mention - extract query (everything after @ until cursor)
      const query = textAfterAt.trim()
      
      console.log('Mention query:', query, 'length:', query.length)
      
      // Show autocomplete even if query is empty (just typed @)
      // or if there's a query to search
      mentionQuery.value = query
      mentionStartIndex.value = lastAtIndex
      
      // Search for users (empty query will return empty array, but we can show all users)
      console.log('Searching users for:', query || '(empty - showing all)')
      const users = query.length > 0 
        ? await searchUsers(query)
        : await searchUsers('') // Search with empty string to get some users
      
      console.log('Found users:', users.length, users)
      mentionUsers.value = users
      
      // Calculate position for autocomplete dropdown - simpler approach
      const textareaRect = textarea.getBoundingClientRect()
      
      // Position dropdown below the textarea, aligned to left
      mentionPosition.value = {
        top: textareaRect.bottom + 5,
        left: textareaRect.left + 10
      }
      
      console.log('Autocomplete position:', mentionPosition.value, 'visible:', users.length > 0)
      
      showMentionAutocomplete.value = users.length > 0
      mentionSelectedIndex.value = 0
    } else {
      // Space found after @, mention is complete
      console.log('Space found, hiding autocomplete')
      showMentionAutocomplete.value = false
    }
  } else {
    // No @ found
    showMentionAutocomplete.value = false
  }
}

// Handle keyboard navigation in mention autocomplete
const handleCommentKeydown = (e: KeyboardEvent) => {
  if (showMentionAutocomplete.value && mentionUsers.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionSelectedIndex.value = Math.min(mentionSelectedIndex.value + 1, mentionUsers.value.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionSelectedIndex.value = Math.max(mentionSelectedIndex.value - 1, 0)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const selectedUser = mentionUsers.value[mentionSelectedIndex.value]
      if (selectedUser) {
        handleMentionSelect(selectedUser)
      }
    } else if (e.key === 'Escape') {
      showMentionAutocomplete.value = false
    }
  }
}

// Handle mention selection
const handleMentionSelect = (user: { id: number; name: string; email: string; avatar: string | null }) => {
  const textarea = commentTextareaRef.value
  if (!textarea || mentionStartIndex.value === -1) return

  const text = newCommentText.value
  const textBeforeMention = text.substring(0, mentionStartIndex.value)
  const textAfterMention = text.substring(textarea.selectionStart)
  
  // Insert mention as "@Friendly Name "
  newCommentText.value = textBeforeMention + `@${user.name} ` + textAfterMention
  
  // Move cursor after the mention
  const newCursorPos = textBeforeMention.length + user.name.length + 2 // +2 for @ and space
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  }, 0)
  
  showMentionAutocomplete.value = false
  mentionStartIndex.value = -1
}

// Submit new comment
const submitComment = async () => {
  if (!newCommentText.value.trim() || submittingComment.value || !props.currentUserId) return

  submittingComment.value = true
  try {
    // Create Lexical content structure with mentions
    const content = createLexicalContentWithMentions(newCommentText.value.trim())

    const newComment = await createComment(props.post.id, content)
    
    if (newComment) {
      newCommentText.value = ''
      
      // Ensure comments section is visible
      if (!showComments.value) {
        showComments.value = true
      }
      
      // Normalize parent field if it's an object
      if (newComment.parent && typeof newComment.parent === 'object' && newComment.parent !== null && 'id' in newComment.parent) {
        newComment.parent = (newComment.parent as any).id
      }
      
      // Add the new comment to the list immediately
      // Don't reload immediately - we already have the comment data from the create response
      comments.value = [...comments.value, newComment]
      
      // Silently sync in the background after a delay, but preserve the new comment
      // This ensures we have the latest data without removing the comment
      setTimeout(async () => {
        try {
          const fetchedComments = await fetchComments(props.post.id)
          const newCommentId = newComment.id
          
          // Check if our new comment is in the fetched list
          const commentExists = fetchedComments.some(c => c.id === newCommentId)
          
          if (commentExists) {
            // Comment is now in PayloadCMS, use the fetched version
            comments.value = fetchedComments
          } else {
            // Comment not indexed yet, merge fetched with our new comment
            const fetchedIds = new Set(fetchedComments.map(c => c.id))
            const commentsToKeep = comments.value.filter(c => !fetchedIds.has(c.id))
            comments.value = [...fetchedComments, ...commentsToKeep]
          }
        } catch (error) {
          // If fetch fails, keep the optimistic comment
          console.error('Background sync failed, keeping optimistic comment:', error)
        }
      }, 2000)
    }
  } catch (error) {
    console.error('Error submitting comment:', error)
  } finally {
    submittingComment.value = false
  }
}

// Handle reply created
const handleReplyCreated = async () => {
  // Reload comments to get the new reply
  await loadComments()
}

// Handle comment updated
const handleCommentUpdated = async (updatedComment?: CommentWithReplies) => {
  console.log('Comment updated event received', updatedComment)
  
  // If we have the updated comment, update it in the array immediately
  if (updatedComment) {
    const index = comments.value.findIndex(c => c.id === updatedComment.id)
    if (index !== -1) {
      // Update the comment in place - create new object to ensure reactivity
      comments.value[index] = { ...comments.value[index], ...updatedComment }
      console.log('Updated comment in array at index:', index)
      
      // Force reactivity by replacing the entire array
      comments.value = [...comments.value]
    }
  }
  
  // Don't reload immediately - the local update is already applied
  // Only reload if user navigates away or after a longer delay
  // This prevents the reload from overwriting our local update
  // The update will persist when the page is refreshed or comments are reloaded naturally
}

// Handle comment deleted
const handleCommentDeleted = async (commentId?: number) => {
  console.log('Comment deleted event received', commentId)
  
  // Remove the comment from the array immediately
  if (commentId) {
    const index = comments.value.findIndex(c => c.id === commentId)
    if (index !== -1) {
      comments.value.splice(index, 1)
      // Force reactivity by replacing the array
      comments.value = [...comments.value]
      console.log('Removed comment from array:', commentId)
    }
    
    // Also check nested replies
    const removeFromReplies = (commentList: CommentWithReplies[]): CommentWithReplies[] => {
      return commentList
        .filter(c => c.id !== commentId)
        .map(c => {
          if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: removeFromReplies(c.replies)
            }
          }
          return c
        })
    }
    
    // Update organized comments structure
    const organized = organizeComments(comments.value)
    // Force reactivity
    comments.value = [...comments.value]
  }
  
  // Don't reload immediately - the local removal is already applied
  // The deletion will persist when the page is refreshed
}

const reactionCount = computed(() => reactions.value.length)

// Get user's current reaction
const userReaction = computed(() => {
  if (!props.currentUserId) return null
  const foundReaction = reactions.value.find(r => r.user?.id === props.currentUserId)
  return foundReaction?.reactionType ?? null
})

// Group reactions by type
const reactionCountsByType = computed(() => {
  const counts: Record<string, number> = {}
  reactions.value.forEach(reaction => {
    const type = reaction.reactionType || 'like'
    counts[type] = (counts[type] || 0) + 1
  })
  return counts
})

const handleReactionClick = async (reactionType: ReactionType) => {
  if (!props.currentUserId || togglingReaction.value) {
    if (!props.currentUserId) {
      console.warn('Cannot react: No current user ID provided')
    }
    return
  }
  
  // Close popover immediately
  showReactionPicker.value = false
  
  togglingReaction.value = true
  
  try {
    // Find current user's reaction
    const currentUserReaction = reactions.value.find(r => r.user?.id === props.currentUserId)
    
    if (currentUserReaction) {
      if (currentUserReaction.reactionType === reactionType) {
        // Remove reaction if clicking the same type - use unreact endpoint
        try {
          await unreact(props.post.id)
        } catch (error: any) {
          // Handle 403/401 errors gracefully - if we can't delete, just reload
          if (error?.statusCode === 403 || error?.statusCode === 401 || error?.status === 403 || error?.status === 401) {
            console.warn('Permission denied: Cannot delete reaction')
            await loadReactions()
            return
          }
          throw error
        }
      } else {
        // Replace reaction with new type
        // First remove the old one using unreact endpoint
        try {
          await unreact(props.post.id)
        } catch (error: any) {
          // Handle 403/401 errors gracefully - if we can't delete, try to add new one anyway
          if (error?.statusCode === 403 || error?.statusCode === 401 || error?.status === 403 || error?.status === 401) {
            console.warn('Permission denied: Cannot delete old reaction, will try to add new one')
          } else {
            throw error
          }
        }
        // Then add the new one
        await createReaction({
          post: props.post.id,
          reactionType
        })
      }
    } else {
      // Add new reaction
      await createReaction({
        post: props.post.id,
        reactionType
      })
    }
    
    // Reload reactions to get updated list
    await loadReactions()
    emit('postUpdated', { ...props.post, reactionRefreshAt: Date.now() } as Post)
  } catch (error) {
    console.error('Error toggling reaction:', error)
  } finally {
    togglingReaction.value = false
  }
}

const handleRemoveReaction = async () => {
  if (!props.currentUserId || togglingReaction.value) {
    return
  }
  
  // Close popover immediately
  showReactionPicker.value = false
  
  togglingReaction.value = true
  
  try {
    // Find current user's reaction
    const currentUserReaction = reactions.value.find(r => r.user?.id === props.currentUserId)
    
    if (currentUserReaction) {
      try {
        // Remove reaction using unreact endpoint (includes email for SSO auth)
        await unreact(props.post.id)
        // Reload reactions to get updated list
        await loadReactions()
        emit('postUpdated', { ...props.post, reactionRefreshAt: Date.now() } as Post)
      } catch (error: any) {
        // Handle 403/401 errors gracefully
        if (error?.statusCode === 403 || error?.statusCode === 401 || error?.status === 403 || error?.status === 401) {
          console.warn('Permission denied: Cannot delete reaction. You may not have permission or the reaction may not belong to you.')
          // Still reload to get current state
          await loadReactions()
          emit('postUpdated', { ...props.post, reactionRefreshAt: Date.now() } as Post)
        } else {
          throw error
        }
      }
    }
  } catch (error) {
    console.error('Error removing reaction:', error)
  } finally {
    togglingReaction.value = false
  }
}

const displayUser = computed(() => props.user || props.post.author)

const avatarUrl = computed(() => {
  // Use user avatar if available
  if (props.user?.avatar) {
    // Handle avatar as object with url property
    if (props.user.avatar && typeof props.user.avatar === 'object' && 'url' in props.user.avatar) {
      const url = props.user.avatar.url
      if (typeof url === 'string' && url) {
        return url
      }
    }
    // Handle avatar as string (legacy)
    if (typeof props.user.avatar === 'string') {
      return props.user.avatar
    }
  }
  // Fallback to author avatar (legacy format - string)
  if (props.post.author?.avatar && typeof props.post.author.avatar === 'string') {
    return props.post.author.avatar
  }
  return null
})

const isExpanded = ref(false)

const shouldTruncate = computed(() => {
  if (!postContent.value) return false
  // Check if content has multiple lines or is long enough to need truncation
  const lines = postContent.value.split('\n')
  return lines.length > 3 || postContent.value.length > 200
})

const modalImages = computed(() => (props.post.images || []).filter((img) => Boolean(img?.image?.url)))
const currentModalImage = computed(() => modalImages.value[activeImageIndex.value] || null)

const openImageModal = (index: number) => {
  if (!modalImages.value.length) return
  activeImageIndex.value = Math.min(Math.max(index, 0), modalImages.value.length - 1)
  isImageModalOpen.value = true
}

const showPreviousImage = () => {
  if (!modalImages.value.length) return
  activeImageIndex.value = (activeImageIndex.value - 1 + modalImages.value.length) % modalImages.value.length
}

const showNextImage = () => {
  if (!modalImages.value.length) return
  activeImageIndex.value = (activeImageIndex.value + 1) % modalImages.value.length
}

// Extract YouTube URLs from Lexical content
const extractYouTubeLinks = (children: any[]): string[] => {
  const links: string[] = []
  
  children.forEach(child => {
    if (child.type === 'autolink' && child.fields?.url) {
      const url = child.fields.url
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        links.push(url)
      }
    }
    if (child.type === 'text' && child.text) {
      const matches = String(child.text).match(/\bhttps?:\/\/[^\s<>"')\]}]+/gi) || []
      matches.forEach((url) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          links.push(url)
        }
      })
    }
    if (child.children) {
      links.push(...extractYouTubeLinks(child.children))
    }
  })
  
  return links
}

// Extract text content from Lexical JSON structure
const postContent = computed(() => {
  if (!props.post.content?.root?.children) return ''
  
  const extractText = (children: Array<{ 
    type: string
    children?: Array<{ type: string; text?: string }>
    fields?: { url?: string }
  }>): string => {
    return children
      .map(child => {
        // Skip autolink nodes (we'll handle YouTube separately)
        if (child.type === 'autolink') {
          return ''
        }
        if (child.type === 'text' && 'text' in child) {
          return (child as any).text || ''
        }
        if (child.children) {
          return extractText(child.children as any)
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  
  return extractText(props.post.content.root.children)
})

const youtubeLinks = computed(() => {
  if (!props.post.content?.root?.children) return []
  return extractYouTubeLinks(props.post.content.root.children)
})

const extractAllLinks = (children: any[]): string[] => {
  const urlRegex = /\bhttps?:\/\/[^\s<>"')\]}]+/gi
  const links: string[] = []
  children.forEach((child) => {
    if (child?.type === 'autolink' && child?.fields?.url && typeof child.fields.url === 'string') {
      links.push(child.fields.url)
    }
    if (child?.type === 'text' && typeof child?.text === 'string') {
      const matches = child.text.match(urlRegex)
      if (matches?.length) links.push(...matches)
    }
    if (Array.isArray(child?.children)) {
      links.push(...extractAllLinks(child.children))
    }
  })
  return links
}

const firstPreviewUrl = computed(() => {
  if (!props.post.content?.root?.children) return null
  const links = extractAllLinks(props.post.content.root.children)
  const nonYoutube = links.find((url) => !(url.includes('youtube.com') || url.includes('youtu.be')))
  return nonYoutube || null
})

const resolvedLinkPreview = computed(() => props.post.linkPreview || fallbackLinkPreview.value)

const youtubeEmbeds = computed(() => {
  return youtubeLinks.value.map(url => {
    // Convert YouTube URL to embed format
    let videoId = ''
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || ''
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`
    }
    return null
  }).filter(Boolean) as string[]
})

const formattedContent = computed(() => {
  if (!postContent.value) return ''

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const linkify = (value: string) => {
    const urlRegex = /\bhttps?:\/\/[^\s<>"')\]}]+/gi
    let lastIndex = 0
    let result = ''
    let match: RegExpExecArray | null

    while ((match = urlRegex.exec(value)) !== null) {
      const url = match[0]
      const start = match.index
      const end = start + url.length
      result += escapeHtml(value.slice(lastIndex, start))
      const safeUrl = escapeHtml(url)
      result += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline break-all">${safeUrl}</a>`
      lastIndex = end
    }

    result += escapeHtml(value.slice(lastIndex))
    return result
  }

  // Linkify URLs, then preserve line breaks.
  return linkify(postContent.value).replace(/\n/g, '<br>')
})

watch(
  [firstPreviewUrl, () => props.post.linkPreview],
  async ([url, embeddedPreview]) => {
    if (embeddedPreview) {
      fallbackLinkPreview.value = null
      return
    }
    if (!url) {
      fallbackLinkPreview.value = null
      return
    }
    fallbackLinkPreview.value = await fetchPreview(url)
  },
  { immediate: true }
)

watch(
  [isEditing, editText],
  ([editing, text]) => {
    if (editPreviewDebounce) clearTimeout(editPreviewDebounce)
    if (!editing) {
      editDraftLinkPreview.value = null
      editDraftYoutubeEmbed.value = null
      return
    }
    editPreviewDebounce = setTimeout(async () => {
      const firstUrl = extractUrlsFromText(text || '')[0]
      if (!firstUrl) {
        editDraftLinkPreview.value = null
        editDraftYoutubeEmbed.value = null
        return
      }
      const ytEmbed = getYoutubeEmbedFromUrl(firstUrl)
      if (ytEmbed) {
        editDraftYoutubeEmbed.value = ytEmbed
        editDraftLinkPreview.value = null
        return
      }
      editDraftYoutubeEmbed.value = null
      editDraftLinkPreview.value = await fetchPreview(firstUrl)
    }, 350)
  },
  { immediate: true }
)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }
}

// Helper function to extract username from email
const getUsernameFromEmail = (email: string): string => {
  if (!email) return ''
  return email.replace('@asburyseminary.edu', '').toLowerCase()
}

watch(
  () => props.startInEditMode,
  (shouldStart) => {
    if (shouldStart && isOwnPost.value && !isEditing.value) {
      startEdit()
    }
  },
  { immediate: true }
)

watch(
  () => props.startWithCommentsOpen,
  (shouldOpenComments) => {
    if (shouldOpenComments) {
      showComments.value = true
    }
  },
  { immediate: true }
)
</script>
