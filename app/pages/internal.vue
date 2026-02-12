<template>
  <div class="min-h-screen bg-gray-50">
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex gap-8">
        <!-- Left Navigation -->
        <aside class="w-64 flex-shrink-0">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-20">
            <UContentNavigation :navigation="navigationLinks" highlight />
          </div>
        </aside>
        
        <!-- Main Content Area -->
        <div class="flex-1 max-w-none">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 class="text-3xl font-bold text-gray-900 mb-4">Internal Page</h1>
            <p class="text-gray-600 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <p class="text-gray-600 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <p class="text-gray-600 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <p class="text-gray-600 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <p class="text-gray-600 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <p class="text-gray-600 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            

            <div class="prose max-w-none">
              <p>Main content goes here...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Internal - Asbury Connect'
})

const navigationLinks = [
  {
    title: 'Overview',
    _path: '/internal',
    path: '/internal',
    children: []
  },
  {
    title: 'Section 1',
    _path: '/internal/section-1',
    path: '/internal/section-1',
    children: []
  },
  {
    title: 'Section 2',
    _path: '/internal/section-2',
    path: '/internal/section-2',
    children: []
  },
  {
    title: 'Section 3',
    _path: '/internal/section-3',
    path: '/internal/section-3',
    children: []
  }
]
</script>
