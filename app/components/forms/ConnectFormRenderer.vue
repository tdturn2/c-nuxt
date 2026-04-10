<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <div v-for="f in fields" :key="f.key" class="space-y-1.5">
      <label class="block text-sm font-medium text-gray-900">
        {{ f.label || f.key }}
        <span v-if="f.required" class="text-red-600">*</span>
      </label>

      <!-- Text-ish -->
      <input
        v-if="f.type === 'text' || f.type === 'email' || f.type === 'number'"
        v-model="answersProxy[f.key]"
        :type="f.type === 'number' ? 'number' : (f.type === 'email' ? 'email' : 'text')"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,0.25)] focus:border-[rgba(13,94,130,1)]"
        :required="f.required"
      >

      <textarea
        v-else-if="f.type === 'textarea'"
        v-model="answersProxy[f.key]"
        rows="4"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,0.25)] focus:border-[rgba(13,94,130,1)]"
        :required="f.required"
      />

      <!-- Select -->
      <select
        v-else-if="f.type === 'select'"
        v-model="answersProxy[f.key]"
        class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,0.25)] focus:border-[rgba(13,94,130,1)]"
        :required="f.required"
      >
        <option value="">Select…</option>
        <option v-for="c in f.choices" :key="c.value" :value="c.value">{{ c.label }}</option>
      </select>

      <!-- Radio -->
      <div v-else-if="f.type === 'radio'" class="space-y-1">
        <label v-for="c in f.choices" :key="c.value" class="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="radio"
            :name="f.key"
            :value="c.value"
            v-model="answersProxy[f.key]"
          >
          <span>{{ c.label }}</span>
        </label>
      </div>

      <!-- Checkbox (multi) -->
      <div v-else-if="f.type === 'checkbox'" class="space-y-1">
        <label v-for="c in f.choices" :key="c.value" class="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            :value="c.value"
            :checked="Array.isArray(answersProxy[f.key]) && (answersProxy[f.key] as any[]).includes(c.value)"
            @change="toggleCheckbox(f.key, c.value)"
          >
          <span>{{ c.label }}</span>
        </label>
      </div>

      <!-- File (after submit upload) -->
      <input
        v-else-if="f.type === 'file'"
        type="file"
        class="block w-full text-sm text-gray-700"
        @change="onFileChange(f.key, $event)"
        :required="f.required"
      >

      <div v-else class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
        Unsupported field type: {{ f.type }} ({{ f.key }})
      </div>

      <p v-if="f.description" class="text-xs text-gray-500">{{ f.description }}</p>
    </div>

    <div class="flex items-center gap-2 pt-2">
      <button
        type="submit"
        class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
        :disabled="submitting"
      >
        {{ submitting ? 'Submitting…' : 'Submit' }}
      </button>
      <span v-if="error" class="text-sm text-red-600">{{ error }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
type Choice = { label: string; value: string }
type Field = {
  key: string
  label?: string
  description?: string
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'radio' | 'checkbox' | 'file' | string
  required?: boolean
  choices?: Choice[]
}

const props = defineProps<{
  fields: Field[]
  modelValue: Record<string, unknown>
  submitting?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: Record<string, unknown>): void
  (e: 'submit', v: { answers: Record<string, unknown>; files: Record<string, File | null> }): void
}>()

const filesByKey = ref<Record<string, File | null>>({})

const answersProxy = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function toggleCheckbox(key: string, value: string) {
  const cur = answersProxy.value[key]
  const arr = Array.isArray(cur) ? [...cur] : []
  const idx = arr.indexOf(value)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(value)
  answersProxy.value = { ...answersProxy.value, [key]: arr }
}

function onFileChange(key: string, e: Event) {
  const input = e.target as HTMLInputElement | null
  const file = input?.files?.[0] || null
  filesByKey.value = { ...filesByKey.value, [key]: file }
}

function onSubmit() {
  emit('submit', { answers: answersProxy.value, files: filesByKey.value })
}
</script>

