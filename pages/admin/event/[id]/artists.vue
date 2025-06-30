<template>
  <div class="min-h-screen bg-white" data-theme="light">
    <div class="container mx-auto py-6 px-2">
      <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
        <span class="inline-block"><span class="badge badge-primary">Event</span></span>
        Artist Management
      </h1>

      <div v-if="eventLoading" class="flex justify-center items-center h-40">
        <span class="loading loading-spinner loading-lg text-primary" />
      </div>

      <div v-else>
        <div class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <h2 class="card-title">Artists Lineup</h2>
            <p class="mb-2 text-base-content/70">Manage the artists programmed for this event. Add, edit, reorder, or remove artists from the lineup.</p>
            <div class="flex flex-wrap gap-2 mb-4">
              <button class="btn btn-primary"
                :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''"
                :aria-disabled="isActionDisabled" :disabled="isActionDisabled" @click="openAddModal">
                <span>Add Artist Slot</span>
              </button>
              <button class="btn btn-outline" :aria-disabled="false" @click="exportArtists">
                Export CSV
              </button>
            </div>
            <div v-if="artistSlots.length === 0" class="alert alert-info">
              No artists programmed yet.
            </div>
            <div v-else class="overflow-x-auto">
              <table class="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Artists</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Stage</th>
                    <th>Day</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="slot in artistSlots" :key="slot.id">
                    <td>
                      <div class="flex flex-wrap gap-1">
                        <span v-for="artist in slot.artists" :key="artist.id" class="badge badge-outline">
                          {{ artist.name }}
                        </span>
                      </div>
                    </td>
                    <td>{{ formatTime(slot.start_time) }} - {{ formatTime(slot.end_time) }}</td>
                    <td>
                      <span class="badge" :class="{
                        'badge-success': slot.status === 'confirmed',
                        'badge-warning': slot.status === 'pending',
                        'badge-error': slot.status === 'cancelled'
                      }">{{ slot.status }}</span>
                    </td>
                    <td>{{ slot.stage || '-' }}</td>
                    <td>{{ (slot as any).day || '-' }}</td>
                    <td class="flex gap-2 justify-end">
                      <button class="btn btn-sm btn-outline"
                        :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''"
                        :aria-disabled="isActionDisabled" :disabled="isActionDisabled"
                        @click="startEditArtist(slot)">Edit</button>
                      <button class="btn btn-sm btn-error"
                        :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''"
                        :aria-disabled="isActionDisabled" :disabled="isActionDisabled"
                        @click="startDeleteArtist(slot)">Delete</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <dialog :open="showModal" class="modal">
        <form method="dialog" class="modal-box max-w-2xl w-full" @submit.prevent="saveArtist">
          <h3 class="font-bold text-lg mb-4">{{ editingArtist ? 'Edit Artist Slot' : 'Add Artist Slot' }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left: Artist Search & Select -->
            <div class="flex flex-col">
              <label class="label mb-1">
                <span class="label-text">Artists</span>
              </label>
              <input
                v-model="artistSearchTerm"
                type="text"
                class="input input-bordered w-full mb-2"
                placeholder="Search artist by name..."
                :disabled="isActionDisabled"
                autocomplete="off"
              >
              <div class="bg-base-200 rounded-lg p-2 min-h-[120px] max-h-48 overflow-y-auto border border-base-300">
                <div v-if="artistSearchTerm && filteredArtists.length === 0" class="text-sm text-gray-500 flex items-center gap-2">
                  <span class="opacity-60">No artist found.</span>
                </div>
                <div v-else-if="!artistSearchTerm">
                  <span class="text-xs text-gray-400">Start typing to search artists.</span>
                </div>
                <ul v-else class="space-y-1">
                  <li v-for="artist in filteredArtists.slice(0, 6)" :key="artist.id">
                    <label :class="['flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors', artistForm.artist_id.includes(artist.id) ? 'bg-primary text-primary-content shadow' : 'hover:bg-base-300', isActionDisabled ? 'opacity-50 cursor-not-allowed' : '']">
                      <input
                        type="checkbox"
                        class="checkbox checkbox-primary mr-2"
                        :value="artist.id"
                        v-model="artistForm.artist_id"
                        :disabled="isActionDisabled"
                        :aria-disabled="isActionDisabled"
                      >
                      <span class="font-medium">{{ artist.name }}</span>
                      <span v-if="artist.genre" class="badge badge-ghost text-xs">{{ artist.genre }}</span>
                    </label>
                  </li>
                </ul>
                <div v-if="artistSearchTerm && filteredArtists.length > 6" class="text-xs text-gray-500 mt-2">Showing first 6 results. Refine your search.</div>
              </div>
              <div class="flex flex-wrap gap-1 mt-2">
                <span v-for="id in artistForm.artist_id" :key="id" class="badge badge-outline">
                  {{ getArtistName(id) }}
                  <button v-if="!isActionDisabled" type="button" class="ml-1 btn btn-xs btn-circle btn-ghost" @click="removeArtistFromForm(id)">✕</button>
                </span>
              </div>
            </div>
            <!-- Right: Slot Details -->
            <div class="flex flex-col gap-2">
              <div class="form-control mb-2">
                <label class="label">
                  <span class="label-text">Status</span>
                </label>
                <select v-model="artistForm.status" class="select select-bordered w-full" :disabled="isActionDisabled">
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div class="form-control mb-2">
                <label class="label">
                  <span class="label-text">Stage</span>
                </label>
                <template v-if="stageOptions.length > 0">
                  <select v-model="artistForm.stage" class="select select-bordered w-full" :disabled="isActionDisabled">
                    <option value="">Select a stage</option>
                    <option v-for="stage in stageOptions" :key="stage" :value="stage">{{ stage }}</option>
                  </select>
                </template>
                <template v-else>
                  <input v-model="artistForm.stage" class="input input-bordered" :disabled="isActionDisabled" placeholder="Stage name">
                </template>
              </div>
              <div class="form-control mb-2" v-if="timetableEnabled">
                <label class="label">
                  <span class="label-text">Day</span>
                </label>
                <select v-model="artistForm.day" class="select select-bordered w-full" :disabled="isActionDisabled">
                  <option value="">Select a day</option>
                  <option v-for="day in dayOptions" :key="day" :value="day">{{ day }}</option>
                </select>
                <div v-if="artistForm.day && dayMetaMap[artistForm.day]" class="text-xs text-gray-500 mt-1">
                  <span class="font-semibold">Range:</span>
                  {{ formatDateTime(dayMetaMap[artistForm.day].start) }}
                  <span class="mx-1">→</span>
                  {{ formatDateTime(dayMetaMap[artistForm.day].end) }}
                </div>
              </div>
              <div v-if="timetableEnabled && artistForm.day" class="flex gap-2 mb-2">
                <div class="form-control flex-1">
                  <label class="label">
                    <span class="label-text">Start Date</span>
                  </label>
                  <input v-model="slotStartDate" type="date" class="input input-bordered w-full" :disabled="isActionDisabled">
                </div>
                <div class="form-control flex-1">
                  <label class="label">
                    <span class="label-text">Start Time</span>
                  </label>
                  <input v-model="artistForm.start_time" type="time" class="input input-bordered w-full" :disabled="isActionDisabled">
                </div>
              </div>
              <div v-if="timetableEnabled && artistForm.day" class="flex gap-2 mb-2">
                <div class="form-control flex-1">
                  <label class="label">
                    <span class="label-text">End Date</span>
                  </label>
                  <input v-model="slotEndDate" type="date" class="input input-bordered w-full" :disabled="isActionDisabled">
                </div>
                <div class="form-control flex-1">
                  <label class="label">
                    <span class="label-text">End Time</span>
                  </label>
                  <input v-model="artistForm.end_time" type="time" class="input input-bordered w-full" :disabled="isActionDisabled">
                </div>
              </div>
              <div v-if="slotError" class="alert alert-error my-2">{{ slotError }}</div>
            </div>
          </div>
          <div class="modal-action mt-6">
            <button type="button" class="btn" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :aria-disabled="isActionDisabled"
              :disabled="isActionDisabled || artistForm.artist_id.length === 0"
              :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''">Save</button>
          </div>
        </form>
      </dialog>

      <!-- Delete Modal -->
      <dialog :open="showDeleteModal" class="modal">
        <form method="dialog" class="modal-box" @submit.prevent="deleteArtist">
          <h3 class="font-bold text-lg mb-4">Delete Artist Slot</h3>
          <p>Are you sure you want to remove this slot from the lineup?</p>
          <div class="modal-action">
            <button type="button" class="btn" @click="closeDeleteModal">Cancel</button>
            <button type="submit" class="btn btn-error" :aria-disabled="isActionDisabled"
              :disabled="isActionDisabled"
              :class="isActionDisabled ? 'btn-disabled opacity-50 cursor-not-allowed' : ''">Delete</button>
          </div>
        </form>
      </dialog>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabaseClient } from '#imports'
import { useEntityPermission } from '~/composables/useEntityPermission'

import authEntityPermission from '~/middleware/auth-entity-permission.global'
definePageMeta({
    layout: 'admin-event',
    middleware: [authEntityPermission]
})


const supabase = useSupabaseClient()
const route = useRoute()
const eventId = typeof route.params.id === 'string' ? route.params.id : Array.isArray(route.params.id) ? route.params.id[0] : ''
const { currentUserPermission, fetchPermission } = useEntityPermission(eventId, 'event')
const eventLoading = ref(true)

interface Artist {
  id: number
  name: string
  genre?: string
}
interface ArtistSlot {
  id: number
  artist_id: number[]
  status: string
  stage: string
  start_time: string
  end_time: string
  artists: Artist[]
}
interface ArtistForm {
  artist_id: number[]
  status: string
  stage: string
  day: string // new: festival day name or empty
  start_time: string
  end_time: string
}
interface FestivalDay {
  name: string
  start: string // ISO string
  end: string   // ISO string
}
interface ArtistSlotDB {
  artist_id: number[];
  status: string;
  stage: string;
  start_time: string;
  end_time: string;
  day?: string;
  event_id?: number;
}

const artistSlots = ref<ArtistSlot[]>([])
const allArtists = ref<Artist[]>([])
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingArtist = ref<ArtistSlot | null>(null)
const deletingArtist = ref<ArtistSlot | null>(null)
const artistForm = ref<ArtistForm>({ artist_id: [], status: 'confirmed', stage: '', day: '', start_time: '', end_time: '' })
const slotStartDate = ref('') // for start date selection
const slotEndDate = ref('')   // for end date selection
const slotError = ref('')

// Artist search state
const artistSearchTerm = ref('')
const filteredArtists = computed(() => {
  if (!artistSearchTerm.value) return []
  const search = artistSearchTerm.value.toLowerCase()
  return allArtists.value.filter(a => a.name.toLowerCase().includes(search))
})

function getArtistName(id: number) {
  const artist = allArtists.value.find(a => a.id === id)
  return artist ? artist.name : id
}
function removeArtistFromForm(id: number) {
  artistForm.value.artist_id = artistForm.value.artist_id.filter(aid => aid !== id)
}

// Stage and day options from event metadata
const stageOptions = ref<string[]>([])
const dayOptions = ref<string[]>([])
const dayMetaMap = ref<Record<string, FestivalDay>>({})
const timetableEnabled = ref(false)

const isReadOnly = computed(() => currentUserPermission.value === 1)
const isActionDisabled = computed(() => isReadOnly.value)

function formatTime(time: string) {
  if (!time) return ''
  return time.length === 5 ? time : time.slice(0, 5)
}
function formatDateTime(dt: string) {
  const d = new Date(dt)
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

async function openAddModal() {
  editingArtist.value = null
  artistForm.value = { artist_id: [], status: 'confirmed', stage: '', day: '', start_time: '', end_time: '' }
  artistSearchTerm.value = ''
  slotStartDate.value = ''
  slotEndDate.value = ''
  await fetchEventMeta()
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingArtist.value = null
}

async function startEditArtist(slot: ArtistSlot) {
  editingArtist.value = { ...slot }
  artistForm.value = {
    artist_id: slot.artist_id ? [...slot.artist_id] : [],
    status: slot.status || 'confirmed',
    stage: slot.stage || '',
    day: (slot as { day?: string }).day || '',
    start_time: '',
    end_time: ''
  }
  // Extraction date+heure si possible
  if (slot.start_time) {
    const dt = new Date(slot.start_time)
    slotStartDate.value = dt.toISOString().slice(0, 10)
    artistForm.value.start_time = dt.toISOString().slice(11, 16)
  } else {
    slotStartDate.value = ''
    artistForm.value.start_time = ''
  }
  if (slot.end_time) {
    const dt = new Date(slot.end_time)
    slotEndDate.value = dt.toISOString().slice(0, 10)
    artistForm.value.end_time = dt.toISOString().slice(11, 16)
  } else {
    slotEndDate.value = ''
    artistForm.value.end_time = ''
  }
  artistSearchTerm.value = ''
  await fetchEventMeta()
  showModal.value = true
}

// Fetch event metadata for stages and days
async function fetchEventMeta() {
  const { data, error } = await supabase
    .from('events')
    .select('metadata')
    .eq('id', eventId)
    .single<{ metadata: { stages?: { name: string }[]; festival_days?: FestivalDay[]; timetable?: boolean } }>()
  if (!error && data && data.metadata) {
    const meta = data.metadata
    // Stages
    if (Array.isArray(meta.stages)) {
      stageOptions.value = meta.stages.map((s) => s.name).filter(Boolean)
    } else {
      stageOptions.value = []
    }
    // Days
    if (Array.isArray(meta.festival_days)) {
      dayOptions.value = meta.festival_days.map((d) => d.name).filter(Boolean)
      // Map for validation
      dayMetaMap.value = Object.fromEntries(meta.festival_days.map((d) => [d.name, d]))
    } else {
      dayOptions.value = []
      dayMetaMap.value = {}
    }
    timetableEnabled.value = !!meta.timetable
  } else {
    stageOptions.value = []
    dayOptions.value = []
    dayMetaMap.value = {}
    timetableEnabled.value = false
  }
}

function validateSlotTimes(): boolean {
  slotError.value = ''
  if (!timetableEnabled.value || !artistForm.value.day) return true
  const day = dayMetaMap.value[artistForm.value.day]
  if (!day) return true
  // Les deux dates sont requises
  if (!slotStartDate.value || !slotEndDate.value) {
    slotError.value = 'Please select both start and end dates.'
    return false
  }
  // Check time range
  const slotStart = slotStartDate.value + 'T' + (artistForm.value.start_time || '00:00')
  const slotEnd = slotEndDate.value + 'T' + (artistForm.value.end_time || '00:00')
  const dayStart = day.start
  const dayEnd = day.end
  if (slotStart < dayStart || slotEnd > dayEnd) {
    slotError.value = `Slot must be between ${formatDateTime(dayStart)} and ${formatDateTime(dayEnd)}`
    return false
  }
  if (slotEnd <= slotStart) {
    slotError.value = 'End time must be after start time.'
    return false
  }
  return true
}

async function saveArtist() {
  if (isActionDisabled.value) return
  if (!artistForm.value.artist_id || artistForm.value.artist_id.length === 0) return
  if (timetableEnabled.value) {
    if (!validateSlotTimes()) return
  }
  // Prepare slot data
  const slotData: ArtistSlotDB = {
    artist_id: artistForm.value.artist_id,
    status: artistForm.value.status,
    stage: artistForm.value.stage,
    start_time: timetableEnabled.value ? (slotStartDate.value + 'T' + (artistForm.value.start_time || '00:00')) : artistForm.value.start_time,
    end_time: timetableEnabled.value ? (slotEndDate.value + 'T' + (artistForm.value.end_time || '00:00')) : artistForm.value.end_time,
    day: timetableEnabled.value ? artistForm.value.day : undefined
  }
  if (editingArtist.value) {
    // Update
    const { error } = await supabase
      .from('event_artist')
      .update(slotData as any)
      .eq('id', editingArtist.value.id ?? 0)
    if (!error) {
      await fetchArtists()
      closeModal()
    }
  } else {
    // Insert
    slotData.event_id = Number(eventId)
    const { error } = await supabase
      .from('event_artist')
      .insert([slotData as any])
    if (!error) {
      await fetchArtists()
      closeModal()
    }
  }
}

function startDeleteArtist(slot: ArtistSlot) {
  deletingArtist.value = slot
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  deletingArtist.value = null
}

async function deleteArtist() {
  if (isActionDisabled.value || !deletingArtist.value) return
  const { error } = await supabase
    .from('event_artist')
    .delete()
    .eq('id', deletingArtist.value.id ?? 0)
  if (!error) {
    await fetchArtists()
    closeDeleteModal()
  }
}

async function fetchArtists() {
  eventLoading.value = true
  // 1. Fetch all slots for this event
  const { data: slots, error } = await supabase
    .from('event_artist')
    .select('*')
    .eq('event_id', eventId)
    .order('start_time', { ascending: true })
  if (error) {
    eventLoading.value = false
    return
  }
  // 2. Get all unique artist IDs
  const allIds = [...new Set((slots as ArtistSlot[]).flatMap((s) => s.artist_id || []))]
  // 3. Fetch all artists
  let artistsMap: Record<number, Artist> = {}
  if (allIds.length > 0) {
    const { data: artistsData } = await supabase
      .from('artists')
      .select('*')
      .in('id', allIds)
    if (artistsData) {
      artistsMap = Object.fromEntries((artistsData as Artist[]).map((a) => [a.id, a]))
    }
    allArtists.value = (artistsData as Artist[]) || []
  } else {
    allArtists.value = []
  }
  // 4. Map slots to include artist details
  artistSlots.value = (slots as ArtistSlot[]).map((slot) => ({
    ...slot,
    artists: (slot.artist_id || []).map((id: number) => artistsMap[id]).filter(Boolean)
  }))
  eventLoading.value = false
}

async function exportArtists() {
  // CSV export with all artists per slot
  const rows = [
    ['Artists', 'Status', 'Stage', 'Start Time', 'End Time'],
    ...artistSlots.value.map(slot => [
      slot.artists.map((a: Artist) => a?.name).join(', '),
      slot.status,
      slot.stage,
      formatTime(slot.start_time || ''),
      formatTime(slot.end_time || '')
    ])
  ]
  const csv = rows.map(r => r.map(x => '"' + (x || '') + '"').join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `event_${eventId}_artists.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  fetchArtists()
  fetchPermission()
})
</script>

<style scoped></style>
