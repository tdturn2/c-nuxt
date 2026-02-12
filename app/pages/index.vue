<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <div class="flex gap-8">
        <LeftColumn />
        <RightColumn>
          <Timeline api-url="/api/posts" />
        </RightColumn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Asbury Connect'
})
</script>
