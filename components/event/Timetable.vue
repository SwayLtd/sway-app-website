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
      <div class="btn-group mt-2 sm:mt-0">
        <button
          class="btn btn-outline btn-primary flex items-center gap-2"
          :class="{ 'btn-active': view === 'grid' }"
          aria-label="Grid view"
          @click="setView('grid')"
        >
          <span class="hidden sm:inline"><i class="fa-regular fa-table"></i> Grid</span>
          <span class="sm:hidden"><i class="fa-regular fa-table"></i></span>
        </button>
        <button
          class="btn btn-outline btn-primary flex items-center gap-2"
          :class="{ 'btn-active': view === 'list' }"
          aria-label="List view"
          @click="setView('list')"
        >
          <span class="hidden sm:inline"><i class="fa-regular fa-list"></i> List</span>
          <span class="sm:hidden"><i class="fa-regular fa-list"></i></span>
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
              <div v-for="item in getArtistsAt(stage, slot)" :key="item.id" class="card bg-base-100 shadow-sm p-4 mb-1 flex flex-col items-center min-h-24">
                <img v-if="item.artist && item.artist.image_url" :src="item.artist.image_url" :alt="item.artist.name" class="w-16 h-16 rounded-full mb-1" />
                <span class="font-semibold text-xs">{{ item.artist && item.artist.name ? item.artist.name : 'Unknown artist' }}</span>
                <span class="badge badge-ghost badge-xs mt-1">{{ formatTime(item.start_time) }} - {{ formatTime(item.end_time) }}</span>
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
          <img v-if="item.artist.image_url" :src="item.artist.image_url" :alt="item.artist.name" class="w-8 h-8 rounded-full" />
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
import { ref, computed, watch, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'

const props = defineProps<{
  eventId: number | string
  artistIdsFilter?: number[]
}>()

const view = ref<'grid' | 'list'>('grid')
const setView = (v: 'grid' | 'list') => (view.value = v)

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

// List view sorted
const sortedList = computed(() => {
  return [...timetable.value].sort((a, b) => a.start_time.localeCompare(b.start_time))
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
