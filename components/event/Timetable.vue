<template>
  <div>
    <!-- Jour & Toggle grid/list view -->
    <div class="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
      <div v-if="festivalDays.length > 0" class="w-full sm:w-auto">
        <label class="form-control w-full max-w-xs">
          <div class="label"><span class="label-text">Select day</span></div>
          <select class="select select-bordered" v-model="selectedDayIndex" aria-label="Select day">
            <option v-for="(day, idx) in festivalDays" :key="day.name" :value="idx">{{ day.name }}</option>
          </select>
        </label>
      </div>
      <div class="btn-group flex flex-row gap-2 mt-2 sm:mt-0">
        <button class="btn btn-outline btn-primary flex items-center justify-center"
          :class="{ 'btn-active': view === 'grid' }" aria-label="Grid view" @click="setView('grid')">
          <!-- Icône grille SVG -->
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="2" class="fill-base-200" />
            <rect x="14" y="3" width="7" height="7" rx="2" class="fill-base-200" />
            <rect x="14" y="14" width="7" height="7" rx="2" class="fill-base-200" />
            <rect x="3" y="14" width="7" height="7" rx="2" class="fill-base-200" />
          </svg>
        </button>
        <button class="btn btn-outline btn-primary flex items-center justify-center"
          :class="{ 'btn-active': view === 'list' }" aria-label="List view" @click="setView('list')">
          <!-- Icône liste SVG -->
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            stroke-width="2">
            <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Grid View -->
    <div v-if="view === 'grid' && timetableEnabled" class="overflow-x-auto">
      <table class="table table-zebra w-full min-w-[600px]">
        <thead>
          <tr>
            <th class="bg-base-200">Stage</th>
            <th v-for="slot in timeSlots" :key="slot" class="bg-base-200 text-xs">
              {{ formatHour(slot) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stage in stages" :key="stage" class="h-40">
            <td class="font-bold align-middle">{{ stage }}</td>
            <td v-for="slot in timeSlots" :key="slot">
              <div v-if="getArtistsAt(stage, slot).length > 0"
                class="card bg-base-100 shadow-sm p-4 mb-1 flex flex-col items-center min-h-24">
                <template v-if="getArtistsAt(stage, slot).length === 1">
                  <img v-if="getArtistsAt(stage, slot)[0].artist && getArtistsAt(stage, slot)[0].artist.image_url"
                    :src="getArtistsAt(stage, slot)[0].artist.image_url" :alt="getArtistsAt(stage, slot)[0].artist.name"
                    class="w-16 h-16 rounded-full mb-1" />
                  <span class="font-semibold text-xs">{{ getArtistsAt(stage, slot)[0].artist && getArtistsAt(stage,
                    slot)[0].artist.name ? getArtistsAt(stage, slot)[0].artist.name : 'Unknown artist' }}</span>
                  <span class="badge badge-ghost badge-xs mt-1">{{ formatTime(getArtistsAt(stage, slot)[0].start_time)
                    }} - {{ formatTime(getArtistsAt(stage, slot)[0].end_time) }}</span>
                </template>
                <template v-else>
                  <img
                    v-if="b2bCurrentIdx[`${stage}|${slot}`] !== undefined && getArtistsAt(stage, slot)[b2bCurrentIdx[`${stage}|${slot}`]].artist && getArtistsAt(stage, slot)[b2bCurrentIdx[`${stage}|${slot}`]].artist.image_url"
                    :src="getArtistsAt(stage, slot)[b2bCurrentIdx[`${stage}|${slot}`]].artist.image_url"
                    :alt="getArtistsAt(stage, slot)[b2bCurrentIdx[`${stage}|${slot}`]].artist.name"
                    class="w-16 h-16 rounded-full mb-1" />
                  <span class="font-semibold text-xs">
                    {{
                      getArtistsAt(stage, slot)[0].custom_name
                        ? getArtistsAt(stage, slot)[0].custom_name
                        : getArtistsAt(stage, slot).map(a => a.artist?.name).filter(Boolean).join(' B2B ')
                    }}
                  </span>
                  <span class="badge badge-ghost badge-xs mt-1">
                    {{ formatTime(getArtistsAt(stage, slot)[0].start_time) }} - {{ formatTime(getArtistsAt(stage,
                    slot)[0].end_time) }}
                  </span>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- List View -->
    <div v-else-if="view === 'list' && timetableEnabled">
      <div v-for="item in sortedList" :key="item.id" class="card bg-base-100 shadow mb-2">
        <div class="card-body flex flex-row items-center gap-3 py-2 min-h-10">
          <img v-if="item.artist.image_url" :src="item.artist.image_url" :alt="item.artist.name"
            class="w-8 h-8 rounded-full" />
          <div class="flex-1">
            <h3 class="card-title text-base">{{ item.artist.name }}</h3>
            <div class="flex flex-wrap gap-2 mt-1">
              <span class="badge badge-outline">{{ item.stage }}</span>
              <span class="badge badge-ghost">{{ formatTime(item.start_time) }} - {{ formatTime(item.end_time) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="!timetableEnabled && !loading && !error" class="alert alert-info mt-4">
      <span>No timetable available for this event.</span>
    </div>

    <div v-if="loading" class="flex justify-center mt-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
    <div v-if="error" class="alert alert-error mt-4">
      <span>Error loading timetable.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient, useRoute, useRouter } from '#imports'

// --- B2B alternance logic ---
const b2bCurrentIdx = ref<Record<string, number>>({})
let b2bInterval: any = null
onMounted(() => {
  b2bInterval = setInterval(() => {
    // Pour chaque case B2B, alterne l'index
    for (const stage of stages.value) {
      for (const slot of timeSlots.value) {
        const key = `${stage}|${slot}`
        const artists = timetable.value.filter(ea => ea.stage === stage && ea.start_time && ea.start_time.slice(0, 16) === slot)
        if (artists.length > 1) {
          if (!(key in b2bCurrentIdx.value)) b2bCurrentIdx.value[key] = 0
          b2bCurrentIdx.value[key] = (b2bCurrentIdx.value[key] + 1) % artists.length
        } else {
          b2bCurrentIdx.value[key] = 0
        }
      }
    }
  }, 3000)
})
onUnmounted(() => {
  if (b2bInterval) clearInterval(b2bInterval)
})

const props = defineProps<{
  eventId: number | string
  artistIdsFilter?: number[]
}>()

const route = useRoute()
const router = useRouter()
const validViews = ['grid', 'list']
const initialView = (route.query.view && validViews.includes(route.query.view as string)) ? (route.query.view as 'grid' | 'list') : 'list'
const view = ref<'grid' | 'list'>(initialView)

const setView = (v: 'grid' | 'list') => {
  if (view.value !== v) {
    view.value = v
    router.replace({
      query: { ...route.query, view: v }
    })
  }
}

const loading = ref(true)
const error = ref(false)
const timetable = ref<any[]>([])
const artistsMap = ref<Record<number, any>>({})
const eventMetadata = ref<any>(null)
const festivalDays = ref<any[]>([])
const selectedDayIndex = ref(0)
const timetableEnabled = ref(true)

const supabase = useSupabaseClient()

// Fetch timetable, event metadata and artists
const fetchTimetable = async () => {
  loading.value = true
  error.value = false
  try {
    // 1. Fetch event metadata
    const { data: event, error: errEvent } = await supabase
      .from('events')
      .select('metadata')
      .eq('id', props.eventId)
      .single()
    if (errEvent) throw errEvent
    eventMetadata.value = event?.metadata || {}
    timetableEnabled.value = !!(eventMetadata.value && eventMetadata.value.timetable !== false)
    festivalDays.value = Array.isArray(eventMetadata.value.festival_days) ? eventMetadata.value.festival_days : []
    if (festivalDays.value.length === 0) {
      // fallback: single day from event date if available
      if (eventMetadata.value.date_time) {
        festivalDays.value = [{
          name: 'Day 1',
          start: eventMetadata.value.date_time,
          end: eventMetadata.value.end_date_time || eventMetadata.value.date_time
        }]
      }
    }

    // 2. Fetch event_artist for this event
    let { data: eventArtists, error: err1 } = await supabase
      .from('event_artist')
      .select('*')
      .eq('event_id', props.eventId)
      .order('start_time', { ascending: true })
    if (err1) throw err1
    if (!eventArtists) eventArtists = []

    // 3. Flatten artist_ids (array) to one row per artist
    const flat = eventArtists.flatMap((ea: any) =>
      (Array.isArray(ea.artist_id) ? ea.artist_id : [ea.artist_id]).map((aid: number) => ({ ...ea, artist_id: aid }))
    )

    // 4. Filter by artistIdsFilter if provided
    let filtered = props.artistIdsFilter
      ? flat.filter((ea: any) => props.artistIdsFilter!.includes(ea.artist_id))
      : flat

    // 5. Filter by selected day
    if (festivalDays.value.length > 0) {
      const day = festivalDays.value[selectedDayIndex.value]
      if (day) {
        filtered = filtered.filter((ea: any) => {
          return ea.start_time >= day.start && ea.start_time <= day.end
        })
      }
    }

    // 6. Get all artist ids
    const artistIds = [...new Set(filtered.map((ea: any) => ea.artist_id))]
    // 7. Fetch artists
    let { data: artists, error: err2 } = await supabase
      .from('artists')
      .select('*')
      .in('id', artistIds)
    if (err2) throw err2
    artistsMap.value = Object.fromEntries((artists || []).map((a: any) => [a.id, a]))

    // 8. Attach artist info
    timetable.value = filtered.map((ea: any) => ({
      ...ea,
      artist: artistsMap.value[ea.artist_id] || { name: 'Unknown artist' },
    }))
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}


onMounted(fetchTimetable)
watch(() => props.artistIdsFilter, fetchTimetable)
watch(selectedDayIndex, fetchTimetable)

// Get all unique stages
const stages = computed(() => {
  return [...new Set(timetable.value.map((ea) => ea.stage).filter(Boolean))]
})

// Get all unique time slots (exact start times, as avant)
const timeSlots = computed(() => {
  const slots = timetable.value.map((ea) => ea.start_time).filter(Boolean)
  const unique = [...new Set(slots.map((d) => d.slice(0, 16)))] // YYYY-MM-DDTHH:mm
  return unique.sort()
})

// Artists at a given stage and slot
function getArtistsAt(stage: string, slot: string) {
  return timetable.value.filter(
    (ea) => ea.stage === stage && ea.start_time && ea.start_time.slice(0, 16) === slot
  )
}

// List view sorted by stage then start_time
const sortedList = computed(() => {
  return [...timetable.value].sort((a, b) => {
    if (a.stage < b.stage) return -1
    if (a.stage > b.stage) return 1
    return a.start_time.localeCompare(b.start_time)
  })
})

function formatTime(dt: string) {
  if (!dt) return ''
  // Affiche l'heure UTC brute (ex: "17:00")
  return dt.slice(11, 16)
}
function formatHour(dt: string) {
  if (!dt) return ''
  // dt is ISO string: YYYY-MM-DDTHH:mm
  if (dt.length >= 16) return dt.slice(11, 16)
  return dt
}
</script>

<style scoped>
.table-zebra tbody tr:nth-child(even) {
  background-color: var(--b2);
}
</style>
