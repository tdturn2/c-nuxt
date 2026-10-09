<template>
  <section class="bcw-archive bg-[#f3f4f6] px-6 py-12 sm:px-8 sm:py-14">
    <div class="mx-auto max-w-6xl space-y-12 text-gray-800">
      <div>
        <h2 class="text-xl font-bold text-gray-900 sm:text-2xl">Latest Updates</h2>
        <ul class="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed sm:text-base">
          <li v-for="link in archive.updates" :key="link.href">
            <a :href="link.href" class="underline underline-offset-2" target="_blank" rel="noopener noreferrer">{{ link.label }}</a>
          </li>
        </ul>
      </div>

      <div>
        <h2 class="text-xl font-bold text-gray-900 sm:text-2xl">Project Teams</h2>
        <p class="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base">{{ archive.projectIntro }}</p>
        <p class="mt-3 text-sm sm:text-base">
          <a :href="archive.projectSummary.href" class="underline underline-offset-2" target="_blank" rel="noopener noreferrer">{{ archive.projectSummary.label }}</a>
        </p>

        <div class="mt-8 space-y-8">
          <article v-for="team in archive.teams" :key="team.title" class="border-t border-gray-300 pt-6">
            <h3 class="text-lg font-bold text-gray-900">{{ team.title }}</h3>
            <div class="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p class="text-sm font-semibold text-gray-900">Members:</p>
                <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm leading-relaxed">
                  <li v-for="member in team.members" :key="member">{{ member }}</li>
                </ul>
              </div>
              <div class="space-y-2 text-sm leading-relaxed">
                <p v-for="link in team.links" :key="link.href">
                  <a :href="link.href" class="underline underline-offset-2" target="_blank" rel="noopener noreferrer">{{ link.label }}</a>
                </p>
                <p v-if="team.note" class="italic">{{ team.note }}</p>
                <p v-if="team.email">
                  To submit compensation and benefits-related questions, please email:
                  <a :href="team.email.href" class="underline underline-offset-2">{{ team.email.label }}</a>
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div class="border-t border-gray-300 pt-10">
        <h2 class="text-xl font-bold text-gray-900 sm:text-2xl">Leadership Advisory Council</h2>
        <p class="mt-4 max-w-3xl text-sm italic leading-relaxed sm:text-base">{{ archive.councilIntro }}</p>
        <ul class="mt-5 divide-y divide-gray-200 overflow-hidden rounded-sm border border-gray-200 bg-white">
          <li v-for="(doc, index) in archive.councilDocs" :key="doc.href" class="flex items-center justify-between gap-4 px-4 py-3 text-sm" :class="index % 2 === 0 ? 'bg-gray-50' : 'bg-white'">
            <span>{{ doc.label }}</span>
            <a :href="doc.href" class="shrink-0 font-semibold underline underline-offset-2" target="_blank" rel="noopener noreferrer">PDF</a>
          </li>
        </ul>

        <h3 class="mt-8 text-lg font-bold text-gray-900">{{ archive.councilTeamTitle }}</h3>
        <ul class="mt-3 list-disc space-y-0.5 pl-5 text-sm leading-relaxed sm:text-base">
          <li v-for="name in archive.councilTeam" :key="name">{{ name }}</li>
        </ul>
      </div>

      <div class="border-t border-gray-300 pt-10">
        <h2 class="text-xl font-bold text-gray-900 sm:text-2xl">Important BCW Documents</h2>
        <ul class="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed sm:text-base">
          <li v-for="link in archive.importantDocs" :key="link.href">
            <a :href="link.href" class="underline underline-offset-2" target="_blank" rel="noopener noreferrer">{{ link.label }}</a>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BcwArchive } from '@shared/bcwPages'

defineProps<{
  archive: BcwArchive
}>()
</script>
