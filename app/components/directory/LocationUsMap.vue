<template>
  <div class="location-us-map relative mx-auto w-full max-w-4xl">
    <div
      ref="hostRef"
      class="w-full overflow-hidden rounded-xl bg-[#e8f2f7] ring-1 ring-[rgba(13,94,130,0.2)]"
      role="img"
      aria-label="United States map. Click a state to explore."
    />
    <p
      v-if="hoverLabel"
      class="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-md bg-white/95 px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm"
    >
      {{ hoverLabel }}
    </p>
    <p class="mt-3 text-center text-sm text-gray-600">
      Click a state
      <span v-if="activeCount > 0"> · {{ activeCount }} with people on Connect</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import usAtlas from 'us-atlas/states-10m.json'
import { fipsToStateCode } from '@shared/usFips'
import { usStateLabel } from '@shared/geo'

const props = withDefaults(
  defineProps<{
    /** USPS state codes that have at least one person */
    activeStates?: string[]
  }>(),
  {
    activeStates: () => [],
  },
)

const emit = defineEmits<{
  select: [{ code: string; name: string }]
}>()

const hostRef = ref<HTMLElement | null>(null)
const hoverLabel = ref('')
const activeCount = computed(() => props.activeStates.length)
const activeSet = computed(() => new Set(props.activeStates.map((s) => s.toUpperCase())))

const FILL_IDLE = '#ffffff'
const FILL_ACTIVE = '#c5e0ec'
const FILL_HOVER = '#0d5e82'
const STROKE = '#0d5e82'

onMounted(() => {
  const host = hostRef.value
  if (!host) return

  const width = Math.min(host.clientWidth || 900, 960)
  const height = Math.round(width * 0.58)

  const topology = usAtlas as unknown as Topology
  const statesGeo = feature(topology, topology.objects.states) as GeoJSON.FeatureCollection

  const projection = geoAlbersUsa().fitSize([width - 16, height - 16], statesGeo)
  const path = geoPath(projection)

  const svg = select(host)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('class', 'block')

  const g = svg.append('g').attr('transform', 'translate(8,8)')

  const statePaths = g
    .selectAll('path.state')
    .data(statesGeo.features)
    .join('path')
    .attr('class', 'state')
    .attr('d', path as any)
    .attr('fill', (d: any) => {
      const code = fipsToStateCode(d.id)
      return code && activeSet.value.has(code) ? FILL_ACTIVE : FILL_IDLE
    })
    .attr('stroke', STROKE)
    .attr('stroke-width', 0.8)
    .style('cursor', 'pointer')
    .on('mouseenter', function (_event: MouseEvent, d: any) {
      select(this).attr('fill', FILL_HOVER).attr('stroke-width', 1.4)
      const code = fipsToStateCode(d.id)
      const name = d.properties?.name || (code ? usStateLabel(code) : '') || 'Unknown'
      hoverLabel.value = code && activeSet.value.has(code) ? `${name} · has people` : name
    })
    .on('mouseleave', function (_event: MouseEvent, d: any) {
      const code = fipsToStateCode(d.id)
      select(this)
        .attr('fill', code && activeSet.value.has(code) ? FILL_ACTIVE : FILL_IDLE)
        .attr('stroke-width', 0.8)
      hoverLabel.value = ''
    })
    .on('click', (_event: MouseEvent, d: any) => {
      const code = fipsToStateCode(d.id)
      if (!code) return
      const name = d.properties?.name || usStateLabel(code) || code
      emit('select', { code, name })
    })

  watch(activeSet, () => {
    statePaths.attr('fill', (d: any) => {
      const code = fipsToStateCode(d.id)
      return code && activeSet.value.has(code) ? FILL_ACTIVE : FILL_IDLE
    })
  })

  onBeforeUnmount(() => {
    select(host).selectAll('*').remove()
  })
})
</script>
