<template>
  <div class="flex min-h-0 bg-gray-50">
    <aside class="sticky top-15 self-start shrink-0 h-[calc(100vh-3.75rem)] overflow-hidden w-80 min-w-80">
      <LeftInternal />
    </aside>
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Create form</h1>
          <p class="mt-1 text-sm text-gray-600">Build a new Connect form schema and metadata.</p>
        </div>
        <FormBuilderEditor
          :saving="saving"
          :error-message="error"
          save-label="Create form"
          @submit-form="save"
          @cancel="navigateTo('/dashboard/forms')"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import FormBuilderEditor from '~/components/dashboard/FormBuilderEditor.vue'

const { createForm } = useDashboardForms()
const saving = ref(false)
const error = ref<string | null>(null)

async function save(payload: any) {
  saving.value = true
  error.value = null
  try {
    const created: any = await createForm(payload)
    await navigateTo(`/dashboard/forms/${created?.id}`)
  } catch (e: any) {
    error.value = e?.message || 'Failed to create form.'
  } finally {
    saving.value = false
  }
}
</script>
