<template>
  <div
    v-if="active"
    class="flex items-center justify-center gap-3 border-b border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-950"
    role="status"
  >
    <UIcon name="i-heroicons-eye" class="h-4 w-4 shrink-0 text-amber-800" />
    <p class="min-w-0 truncate">
      Previewing as <span class="font-semibold">{{ roleLabel }}</span>
      <span class="hidden sm:inline"> — your account, that role’s access</span>
    </p>
    <UButton
      size="xs"
      color="neutral"
      variant="outline"
      :loading="pending"
      @click="stopRolePreview"
    >
      Exit preview
    </UButton>
  </div>
</template>

<script setup lang="ts">
import { rolePreviewLabel, type ImpersonationState } from '@shared/impersonation'

const { user } = useMe()
const { pending, stopRolePreview } = useImpersonation()

const impersonation = computed<ImpersonationState>(() => {
  const state = user.value?.impersonation
  if (state?.active) return state
  return { active: false }
})

const active = computed(() => impersonation.value.active)
const roleLabel = computed(() =>
  impersonation.value.active ? rolePreviewLabel(impersonation.value.role) : '',
)
</script>
