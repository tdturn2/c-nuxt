<template>
  <div class="flex min-h-0 bg-gray-50">
    <aside class="sticky top-15 self-start shrink-0 h-[calc(100vh-3.75rem)] overflow-hidden w-80 min-w-80">
      <LeftInternal />
    </aside>
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Edit form</h1>
          <p class="mt-1 text-sm text-gray-600">Update form schema and publication settings.</p>
        </div>

        <div v-if="loading" class="py-8 text-gray-500">Loading form...</div>
        <div v-else-if="loadError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {{ loadError }}
        </div>
        <FormBuilderEditor
          v-else
          :model-value="form"
          :saving="saving"
          :error-message="saveError"
          save-label="Save changes"
          @submit-form="save"
          @cancel="navigateTo('/dashboard/forms')"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import FormBuilderEditor from '~/components/dashboard/FormBuilderEditor.vue'
import type { ConnectFormDefinition } from '~/types/forms'

const route = useRoute()
const id = computed(() => String(route.params.id || '').trim())
const { getFormById, updateForm } = useDashboardForms()

const form = ref<ConnectFormDefinition | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    form.value = await getFormById(id.value)
  } catch (e: any) {
    loadError.value = e?.message || 'Failed to load form.'
  } finally {
    loading.value = false
  }
}

async function save(payload: any) {
  saving.value = true
  saveError.value = null
  try {
    form.value = await updateForm(id.value, payload)
  } catch (e: any) {
    saveError.value = e?.message || 'Failed to update form.'
  } finally {
    saving.value = false
  }
}

watch(id, load, { immediate: true })
</script>
