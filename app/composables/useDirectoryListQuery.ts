import { watchDebounced } from '@vueuse/core'
import {
  directoryListSearchParams,
  parseDirectoryListQuery,
  sameDirectoryListQuery,
  type DirectoryListState,
} from '@shared/directoryListQuery'
import { isDirectoryListState, keepDirectoryReturn, readDirectoryReturn } from './useDirectoryReturnState'

/**
 * Keeps directory page, name search, and location filters in the URL so Back
 * from a profile returns to the same slice of the list.
 */
export function useDirectoryListQuery() {
  const route = useRoute()
  const router = useRouter()
  const fromQuery = parseDirectoryListQuery(route.query)
  const remembered = readDirectoryReturn(route.path, isDirectoryListState)
  const initial = remembered ?? fromQuery

  const searchQuery = ref(initial.q)
  const filterCountry = ref(initial.country)
  const filterRegion = ref(initial.region)
  const filterCity = ref(initial.city)
  const currentPage = ref(initial.page)

  let applying = false

  function currentState(): DirectoryListState {
    return {
      page: currentPage.value,
      q: searchQuery.value,
      country: filterCountry.value,
      region: filterRegion.value,
      city: filterCity.value,
    }
  }

  function applyFromRoute(query: typeof route.query) {
    const next = parseDirectoryListQuery(query)
    const current = directoryListSearchParams(currentState())
    if (sameDirectoryListQuery(current, directoryListSearchParams(next))) return
    applying = true
    searchQuery.value = next.q
    filterCountry.value = next.country
    filterRegion.value = next.region
    filterCity.value = next.city
    currentPage.value = next.page
    applying = false
  }

  function syncRoute() {
    if (applying) return
    const next = directoryListSearchParams(currentState())
    const current = directoryListSearchParams(parseDirectoryListQuery(route.query))
    if (sameDirectoryListQuery(next, current)) return
    router.replace({ path: route.path, query: next })
  }

  watch([filterCountry, filterRegion, filterCity, searchQuery], () => {
    if (applying) return
    if (currentPage.value !== 1) currentPage.value = 1
  }, { flush: 'sync' })

  watch([filterCountry, filterRegion, filterCity, currentPage], syncRoute)
  watchDebounced(searchQuery, syncRoute, { debounce: 400 })
  watch(() => route.query, query => applyFromRoute(query), { deep: true })
  keepDirectoryReturn(route.path, currentState)
  onMounted(() => syncRoute())

  return {
    searchQuery,
    filterCountry,
    filterRegion,
    filterCity,
    currentPage,
  }
}
