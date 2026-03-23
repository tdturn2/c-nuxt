<template>
  <div class="h-full flex bg-gray-50 min-h-0">
    <LeftColumn />
    <RightColumn>
      <Timeline api-url="/api/posts" />
    </RightColumn>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Asbury Connect'
})
</script>
