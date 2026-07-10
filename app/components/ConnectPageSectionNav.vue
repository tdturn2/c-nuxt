<script setup lang="ts">
export type ConnectPageNavItem = {
  id: string
  title: string
  path: string
}

const props = withDefaults(defineProps<{
  heading: string
  pages: ConnectPageNavItem[]
  isActive: (path: string) => boolean
  variant?: 'primary' | 'secondary'
}>(), {
  variant: 'primary',
})

const route = useRoute()
const navRef = ref<HTMLElement | null>(null)

function scrollActiveTabIntoView() {
  nextTick(() => {
    const active = navRef.value?.querySelector<HTMLElement>('[aria-current="page"]')
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' })
  })
}

onMounted(scrollActiveTabIntoView)
watch(() => [props.pages, route.path], scrollActiveTabIntoView)
</script>

<template>
  <div class="min-w-0">
    <p class="sr-only">
      {{ heading }}
    </p>
    <nav
      ref="navRef"
      :aria-label="heading"
      class="connect-page-tabs"
    >
      <div
        class="flex items-end gap-0.5"
        :class="variant === 'primary' ? 'min-h-10' : 'min-h-8'"
      >
        <NuxtLink
          v-for="item in pages"
          :key="item.id"
          :to="item.path"
          :title="item.title"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          class="connect-tab shrink-0 whitespace-nowrap font-medium leading-snug transition-[transform,background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asbury-blue/40 focus-visible:ring-offset-2"
          :class="[
            variant === 'primary'
              ? 'px-5 py-2 text-sm sm:px-6 sm:py-2.5'
              : 'px-4 py-1.5 text-xs sm:px-5 sm:text-sm',
            isActive(item.path)
              ? 'connect-tab--active font-semibold text-asbury-blue'
              : 'connect-tab--inactive text-asbury-blue/75 hover:text-asbury-blue',
          ]"
        >
          <span class="relative z-1 block max-w-44 truncate sm:max-w-56">{{ item.title }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.connect-page-tabs {
  overflow-x: auto;
  overflow-y: hidden;
  overflow-inline: auto;
  overflow-block: clip;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(8, 92, 128, 0.25) transparent;
}

.connect-page-tabs::-webkit-scrollbar {
  height: 5px;
}

.connect-page-tabs::-webkit-scrollbar-thumb {
  background-color: rgba(8, 92, 128, 0.25);
  border-radius: 9999px;
}

.connect-tab {
  --tab-girth: 10px;
  position: relative;
}

/* Inactive tabs: rounded top, sit slightly behind the active tab */
.connect-tab--inactive {
  margin-bottom: 1px;
  border-start-start-radius: var(--tab-girth);
  border-start-end-radius: var(--tab-girth);
  background-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 -1px 2px rgba(8, 92, 128, 0.08);
}

.connect-tab--inactive:hover {
  background-color: rgba(255, 255, 255, 0.75);
  transform: translateY(-1px);
}

/* Active tab: round-out shape carved with clip-path (Chris Coyier / master.dev technique) */
.connect-tab--active {
  z-index: 1;
  background-color: white;
  clip-path: shape(
    from bottom left,
    curve to var(--tab-girth) calc(100% - var(--tab-girth)) with var(--tab-girth) 100%,
    vline to var(--tab-girth),
    curve to calc(var(--tab-girth) * 2) 0 with var(--tab-girth) 0,
    hline to calc(100% - calc(var(--tab-girth) * 2)),
    curve to calc(100% - var(--tab-girth)) var(--tab-girth) with calc(100% - var(--tab-girth)) 0,
    vline to calc(100% - var(--tab-girth)),
    curve to 100% 100% with calc(100% - var(--tab-girth)) 100%
  );
}

@supports not (clip-path: shape(from top left, hline to 0)) {
  .connect-tab--active {
    margin-bottom: -1px;
    border-start-start-radius: var(--tab-girth);
    border-start-end-radius: var(--tab-girth);
    border: 1px solid rgba(8, 92, 128, 0.12);
    border-bottom-color: white;
    clip-path: none;
  }

  .connect-tab--active::before,
  .connect-tab--active::after {
    content: '';
    position: absolute;
    bottom: 0;
    width: var(--tab-girth);
    height: var(--tab-girth);
    pointer-events: none;
  }

  .connect-tab--active::before {
    left: calc(var(--tab-girth) * -1);
    border-bottom-right-radius: var(--tab-girth);
    box-shadow: calc(var(--tab-girth) / 2) 0 0 0 white;
  }

  .connect-tab--active::after {
    right: calc(var(--tab-girth) * -1);
    border-bottom-left-radius: var(--tab-girth);
    box-shadow: calc(var(--tab-girth) / -2) 0 0 0 white;
  }
}
</style>
