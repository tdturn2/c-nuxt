<template>
  <div>
    <label
      v-if="label"
      class="mb-2 block font-medium text-gray-700"
      :class="compact ? 'text-xs' : 'text-sm'"
    >
      {{ label }}
    </label>
    <USelectMenu
      v-model="selected"
      multiple
      :items="[...POST_AUDIENCE_OPTIONS]"
      value-key="value"
      label-key="label"
      placeholder="Everyone"
      class="w-full"
    />
    <p v-if="hint" class="mt-1 text-xs text-gray-500">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  POST_AUDIENCE_OPTIONS,
  serializePostAudience,
  type PostAudienceValue,
} from '~/utils/postAudience'

const props = withDefaults(defineProps<{
  modelValue?: unknown
  label?: string
  hint?: string
  compact?: boolean
}>(), {
  label: 'Target audience',
  hint: 'Choose one or more groups. Leave empty to show this post to everyone.',
  compact: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: PostAudienceValue[]]
}>()

const selected = computed({
  get(): PostAudienceValue[] {
    return serializePostAudience(props.modelValue) as PostAudienceValue[]
  },
  set(value: unknown) {
    emit('update:modelValue', serializePostAudience(value) as PostAudienceValue[])
  },
})
</script>
