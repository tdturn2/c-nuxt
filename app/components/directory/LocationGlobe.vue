<template>
  <div class="location-globe relative mx-auto w-full max-w-3xl">
    <div
      ref="hostRef"
      class="aspect-square w-full overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_25%,#7eb8d4_0%,#0d5e82_45%,#083d55_100%)] shadow-[inset_0_0_60px_rgba(0,0,0,0.25)] ring-1 ring-[rgba(13,94,130,0.35)]"
      role="img"
      aria-label="Interactive globe. Drag to rotate. Click a country to explore."
    />
    <p
      v-if="hoverLabel"
      class="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-md bg-white/95 px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm"
    >
      {{ hoverLabel }}
    </p>
    <p class="mt-3 text-center text-sm text-gray-600">
      Drag to rotate · Click a country
      <span v-if="activeCount > 0"> · {{ activeCount }} with people on Connect</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { drag } from 'd3-drag'
import { geoOrthographic, geoPath, geoGraticule } from 'd3-geo'
import { select } from 'd3-selection'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import worldAtlas from 'world-atlas/countries-110m.json'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'

countries.registerLocale(enLocale as any)

const props = withDefaults(
  defineProps<{
    /** ISO alpha-2 codes that have at least one person */
    activeCountries?: string[]
  }>(),
  {
    activeCountries: () => [],
  },
)

const emit = defineEmits<{
  select: [{ code: string; name: string }]
}>()

const hostRef = ref<HTMLElement | null>(null)
const hoverLabel = ref('')
const activeCount = computed(() => props.activeCountries.length)

const activeSet = computed(() => new Set(props.activeCountries.map((c) => c.toUpperCase())))

const FILL_IDLE = 'rgba(255,255,255,0.72)'
const FILL_ACTIVE = '#f4f8fb'
const FILL_HOVER = '#ffe8a3'
const STROKE = 'rgba(8,61,85,0.45)'

onMounted(() => {
  const host = hostRef.value
  if (!host) return

  const size = Math.min(host.clientWidth || 640, 720)
  const topology = worldAtlas as unknown as Topology
  const countriesGeo = feature(topology, topology.objects.countries) as GeoJSON.FeatureCollection
  const land = feature(topology, topology.objects.land) as GeoJSON.Feature

  const projection = geoOrthographic()
    .scale(size / 2.15)
    .translate([size / 2, size / 2])
    .clipAngle(90)
    .rotate([20, -15])

  const path = geoPath(projection)
  const graticule = geoGraticule()

  const svg = select(host)
    .append('svg')
    .attr('viewBox', `0 0 ${size} ${size}`)
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('class', 'cursor-grab active:cursor-grabbing touch-none')

  // Sphere (ocean already from CSS; this adds rim + graticule)
  svg
    .append('circle')
    .attr('cx', size / 2)
    .attr('cy', size / 2)
    .attr('r', projection.scale()!)
    .attr('fill', 'rgba(255,255,255,0.08)')
    .attr('stroke', 'rgba(255,255,255,0.35)')
    .attr('stroke-width', 1.5)

  const g = svg.append('g')

  g.append('path')
    .datum(graticule())
    .attr('d', path as any)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(255,255,255,0.18)')
    .attr('stroke-width', 0.6)

  g.append('path')
    .datum(land)
    .attr('d', path as any)
    .attr('fill', 'rgba(255,255,255,0.12)')
    .attr('stroke', 'none')

  const countryPaths = g
    .selectAll('path.country')
    .data(countriesGeo.features)
    .join('path')
    .attr('class', 'country')
    .attr('d', path as any)
    .attr('fill', (d: any) => {
      const code = numericToAlpha2(d.id)
      return code && activeSet.value.has(code) ? FILL_ACTIVE : FILL_IDLE
    })
    .attr('stroke', STROKE)
    .attr('stroke-width', 0.45)
    .attr('vector-effect', 'non-scaling-stroke')
    .style('cursor', 'pointer')
    .on('mouseenter', function (event: MouseEvent, d: any) {
      select(this).attr('fill', FILL_HOVER)
      const code = numericToAlpha2(d.id)
      const name = d.properties?.name || (code ? countries.getName(code, 'en') : '') || 'Unknown'
      hoverLabel.value = code && activeSet.value.has(code) ? `${name} · has people` : name
    })
    .on('mouseleave', function (_event: MouseEvent, d: any) {
      const code = numericToAlpha2(d.id)
      select(this).attr('fill', code && activeSet.value.has(code) ? FILL_ACTIVE : FILL_IDLE)
      hoverLabel.value = ''
    })
    .on('click', (_event: MouseEvent, d: any) => {
      const code = numericToAlpha2(d.id)
      if (!code) return
      const name = countries.getName(code, 'en') || d.properties?.name || code
      emit('select', { code, name })
    })

  function redraw() {
    g.selectAll('path').attr('d', path as any)
  }

  const sens = 0.35
  svg.call(
    drag()
      .on('drag', (event) => {
        const [λ, φ] = projection.rotate()
        projection.rotate([λ + event.dx * sens, φ - event.dy * sens])
        redraw()
      }) as any,
  )

  watch(activeSet, () => {
    countryPaths.attr('fill', (d: any) => {
      const code = numericToAlpha2(d.id)
      return code && activeSet.value.has(code) ? FILL_ACTIVE : FILL_IDLE
    })
  })

  onBeforeUnmount(() => {
    select(host).selectAll('*').remove()
  })
})

function numericToAlpha2(id: string | number | undefined): string | null {
  if (id == null) return null
  const numeric = String(id).padStart(3, '0')
  const alpha = countries.numericToAlpha2(numeric)
  return alpha ? alpha.toUpperCase() : null
}
</script>
