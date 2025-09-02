<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSeoMeta, useSupabaseClient } from '#imports'
import { useRuntimeConfig } from '#app'

// Type Definitions
interface Promoter {
  id: string
  name: string
  description?: string
  image_url?: string
}

interface Genre {
  id: number
  name: string
}

interface Venue {
  id: number
  name: string
  address?: string
}

interface Event {
  id: number
  title: string
  description?: string
  date_time: string
  end_date_time?: string
  image_url?: string
  event_genre: Array<{ genres: Genre }>
  event_venue: Array<{ venues: Venue }>
}

const route = useRoute()
const entityId = parseInt(route.params.id as string)
const supabase = useSupabaseClient()

const promoter = ref<Promoter | null>(null)
const genres = ref<Genre[]>([])
const upcomingEvents = ref<Event[]>([])
const pastEvents = ref<Event[]>([])
const loading = ref(true)
const showFullDescription = ref(false)

// Helper to check if description is too long (more than 3 lines ~ 200 chars)
const isDescriptionLong = computed(() => {
  return promoter.value?.description && promoter.value.description.length > 200
})

const displayDescription = computed(() => {
  if (!promoter.value?.description) return ''
  if (!isDescriptionLong.value || showFullDescription.value) {
    return promoter.value.description
  }
  return promoter.value.description.substring(0, 200) + '...'
})

async function fetchPromoter() {
  const { data, error } = await supabase
    .from('promoters')
    .select('id, name, description, image_url')
    .eq('id', entityId)
    .maybeSingle()
  if (!error && data) promoter.value = data as Promoter
}

async function fetchPromoterGenres() {
  // Récupérer les genres directement depuis promoter_genre (pas via les événements)
  const { data: promoterGenres, error: genreError } = await supabase
    .from('promoter_genre')
    .select(`
      genres (
        id,
        name
      )
    `)
    .eq('promoter_id', entityId)

  if (!genreError && promoterGenres) {
    genres.value = promoterGenres.map((item: { genres: Genre }) => item.genres).filter(Boolean)
  } else {
    console.error('Erreur récupération genres du promoteur:', genreError)
  }
}

async function fetchPromoterEvents() {
  console.log('🔍 fetchPromoterEvents called, entityId:', entityId)

  const now = new Date().toISOString()
  console.log('⏰ Current time:', now)

  // Récupérer les IDs des événements du promoteur
  const { data: eventIds, error: eventError } = await supabase
    .from('event_promoter')
    .select('event_id')
    .eq('promoter_id', entityId)

  console.log('📋 Event IDs result:', { eventIds, eventError })

  if (eventError || !eventIds || eventIds.length === 0) {
    console.error('Erreur récupération events du promoteur:', eventError)
    return
  }

  const eventIdList = eventIds.map((e: { event_id: number }) => e.event_id)
  console.log('🎯 Event ID list:', eventIdList)

  // Fonction pour enrichir les événements avec genres et venues
  const enrichEvents = async (events: { id: number, title: string, description: string, date_time: string, end_date_time: string, image_url: string }[]) => {
    const enrichedEvents = []

    for (const event of events) {
      // Récupérer les genres de l'événement
      const { data: genreData } = await supabase
        .from('event_genre')
        .select(`
          genres (id, name)
        `)
        .eq('event_id', event.id)

      // Récupérer la venue de l'événement - approche en 2 étapes
      let venueData = null
      try {
        const { data: venueJoin } = await supabase
          .from('event_venue')
          .select('venue_id')
          .eq('event_id', event.id)
          .limit(1)
          .single()

        if (venueJoin) {
          const venueId = (venueJoin as { venue_id: number }).venue_id
          if (venueId) {
            const { data: venue } = await supabase
              .from('venues')
              .select('id, name, location')
              .eq('id', venueId)
              .single()

            if (venue) {
              venueData = [{ venues: venue }]
            }
          }
        }
      } catch (error) {
        console.log('Venue fetch error for event', event.id, ':', error)
      }

      enrichedEvents.push({
        ...event,
        event_genre: genreData || [],
        event_venue: venueData || []
      })
    }

    return enrichedEvents
  }

  // Upcoming events
  const { data: upcoming, error: upcomingError } = await supabase
    .from('events')
    .select('id, title, description, date_time, end_date_time, image_url')
    .in('id', eventIdList)
    .gte('date_time', now)
    .order('date_time', { ascending: true })

  console.log('⏭️ Upcoming events result:', { upcoming, upcomingError })

  if (!upcomingError && upcoming) {
    upcomingEvents.value = await enrichEvents(upcoming) as Event[]
    console.log('✅ Upcoming events assigned:', upcomingEvents.value.length, 'events')
  }

  // Past events
  const { data: past, error: pastError } = await supabase
    .from('events')
    .select('id, title, description, date_time, end_date_time, image_url')
    .in('id', eventIdList)
    .lt('date_time', now)
    .order('date_time', { ascending: false })
    .limit(10)

  console.log('⏮️ Past events result:', { past, pastError })
  console.log('📊 Past events count:', past?.length || 0)

  if (!pastError && past) {
    pastEvents.value = await enrichEvents(past) as Event[]
    console.log('✅ Past events assigned:', pastEvents.value.length, 'events')
    console.log('📝 Past events data:', pastEvents.value)
  } else {
    console.log('❌ Past events error or no data:', { pastError, past })
  }

  console.log('🎬 Final pastEvents.value:', pastEvents.value)
  console.log('📏 Final pastEvents length:', pastEvents.value.length)
}

async function loadAllData() {
  loading.value = true
  try {
    await Promise.all([
      fetchPromoter(),
      fetchPromoterGenres(),
      fetchPromoterEvents()
    ])
  } finally {
    loading.value = false
  }
}

await loadAllData()

const promoterName = computed(() => promoter.value?.name || '')
const promoterDescription = computed(() => promoter.value?.description || '')
const promoterImage = computed(() => {
  const url = promoter.value?.image_url
  if (!url) return '/images/default-promoter.jpg'
  return url.startsWith('http') ? url : `${url.startsWith('/') ? '' : '/'}${url}`
})

const BASE_URL = useRuntimeConfig().public.BASE_URL
const pageUrl = computed(() => `${BASE_URL}/promoter/${entityId}`)

// Helper function to format date and time on same line
const formatEventDateTime = (dateTime: string) => {
  const date = new Date(dateTime)
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  }
  const formattedDate = date.toLocaleDateString('fr-FR', dateOptions)
  const formattedTime = date.toLocaleTimeString('fr-FR', timeOptions)
  return `${formattedDate} à ${formattedTime}`
}

// Helper function to get limited genres (max 3)
const getLimitedGenres = (eventGenres: Array<{ genres: Genre }>) => {
  if (!eventGenres) return []
  return eventGenres.slice(0, 3).map((eg: { genres: Genre }) => eg.genres?.name).filter(Boolean)
}

// Helper function to get first venue name
const getVenueName = (eventVenues: Array<{ venues: Venue }>) => {
  if (!eventVenues || eventVenues.length === 0) return ''
  return eventVenues[0]?.venues?.name || ''
}

const currentYear = new Date().getFullYear()

// Navigation function
const navigateToEvent = (eventId: string | number) => {
  window.open(`/event/${eventId}`, '_blank')
}

useSeoMeta({
  title: promoterName.value ? `${promoterName.value} - Sway` : 'Sway',
  ogTitle: promoterName.value ? `${promoterName.value} - Sway` : 'Sway',
  twitterTitle: promoterName.value ? `${promoterName.value} - Sway` : 'Sway',
  description: promoterDescription.value,
  ogDescription: promoterDescription.value,
  twitterDescription: promoterDescription.value,
  ogImage: promoterImage.value,
  twitterImage: promoterImage.value,
  ogUrl: pageUrl.value,
  twitterCard: 'summary_large_image',
  ogType: 'website',
  robots: 'index, follow',
})

onMounted(() => {
  // Mobile redirection removed - web interface now available
})
</script>

<template>
  <div data-theme="light" class="min-h-screen bg-base-100">
    <!-- Loading State -->
    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <span class="loading loading-spinner loading-lg text-primary" />
        <p class="mt-4 text-base-content/70">Loading...</p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="promoter" class="max-w-7xl mx-auto px-4 py-8">
      <!-- Desktop Layout -->
      <div class="hidden lg:grid lg:grid-cols-12 lg:gap-8 lg:h-screen lg:max-h-screen lg:overflow-hidden">
        <!-- Left Column: Hero + MOOD (4 columns) -->
        <div class="lg:col-span-4 flex flex-col space-y-8">
          <!-- Hero Section -->
          <div class="bg-base-200 rounded-2xl p-8 flex-1">
            <div class="flex flex-col items-start text-left">
              <div class="avatar mb-6">
                <div class="w-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  <NuxtImg :src="promoterImage" :alt="promoterName" class="object-cover" loading="lazy" />
                </div>
              </div>
              <h1 class="text-4xl font-bold text-base-content mb-4 text-left">{{ promoterName }}</h1>

              <!-- Description with show more/less -->
              <div v-if="promoter?.description" class="mb-6 text-left">
                <p class="text-base text-base-content/80 leading-relaxed whitespace-pre-line">
                  {{ displayDescription }}
                </p>
                <button v-if="isDescriptionLong"
                  class="btn btn-link btn-sm p-0 text-primary hover:text-primary-focus mt-2"
                  @click="showFullDescription = !showFullDescription">
                  {{ showFullDescription ? 'Show less' : 'Show more' }}
                </button>
              </div>

              <!-- MOOD Section - Genres (integrated in card) -->
              <div v-if="genres.length > 0">
                <h3 class="text-lg font-bold text-base-content mb-3 text-left">MOOD</h3>
                <div class="flex flex-wrap gap-2">
                  <div v-for="genre in genres" :key="genre.id" class="badge badge-primary badge-md">
                    {{ genre.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Events (8 columns) -->
        <div class="lg:col-span-8 flex flex-col space-y-6 overflow-y-auto">
          <!-- Upcoming Events -->
          <div v-if="upcomingEvents.length > 0" class="bg-base-100">
            <h2 class="text-2xl font-bold text-base-content mb-4">UPCOMING EVENTS</h2>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div v-for="event in upcomingEvents" :key="event.id"
                class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                @click="navigateToEvent(event.id)">
                <figure class="relative h-32">
                  <NuxtImg :src="event.image_url || '/images/default-event.jpg'" :alt="event.title"
                    class="w-full h-full object-cover" loading="lazy" />
                  <!-- Genres overlay -->
                  <div v-if="getLimitedGenres(event.event_genre).length > 0"
                    class="absolute top-2 left-2 flex flex-wrap gap-1">
                    <span v-for="genreName in getLimitedGenres(event.event_genre)" :key="genreName"
                      class="badge badge-primary badge-xs">
                      {{ genreName }}
                    </span>
                  </div>
                </figure>
                <div class="card-body p-4">
                  <h3 class="card-title text-base">{{ event.title }}</h3>
                  <div class="space-y-1 text-xs text-base-content/70">
                    <div class="flex items-center gap-2">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 9h12v7H4V9z" />
                      </svg>
                      <span class="text-xs">{{ formatEventDateTime(event.date_time) }}</span>
                    </div>
                    <div v-if="getVenueName(event.event_venue)" class="flex items-center gap-2">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clip-rule="evenodd" />
                      </svg>
                      <span class="text-xs">{{ getVenueName(event.event_venue) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Past Events -->
          <div class="bg-base-100">
            <h2 class="text-2xl font-bold text-base-content mb-4">PAST EVENTS (Debug: {{ pastEvents.length }} events)
            </h2>
            <div v-if="pastEvents.length === 0" class="text-center py-8">
              <p class="text-base-content/60">No past events found.</p>
            </div>
            <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div v-for="event in pastEvents" :key="event.id"
                class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer opacity-80"
                @click="navigateToEvent(event.id)">
                <figure class="relative h-32">
                  <NuxtImg :src="event.image_url || '/images/default-event.jpg'" :alt="event.title"
                    class="w-full h-full object-cover" loading="lazy" />
                  <!-- Genres overlay -->
                  <div v-if="getLimitedGenres(event.event_genre).length > 0"
                    class="absolute top-2 left-2 flex flex-wrap gap-1">
                    <span v-for="genreName in getLimitedGenres(event.event_genre)" :key="genreName"
                      class="badge badge-primary badge-xs">
                      {{ genreName }}
                    </span>
                  </div>
                </figure>
                <div class="card-body p-4">
                  <h3 class="card-title text-base">{{ event.title }}</h3>
                  <div class="space-y-1 text-xs text-base-content/70">
                    <div class="flex items-center gap-2">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 9h12v7H4V9z" />
                      </svg>
                      <span class="text-xs">{{ formatEventDateTime(event.date_time) }}</span>
                    </div>
                    <div v-if="getVenueName(event.event_venue)" class="flex items-center gap-2">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clip-rule="evenodd" />
                      </svg>
                      <span class="text-xs">{{ getVenueName(event.event_venue) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Layout -->
      <div class="lg:hidden space-y-8">
        <!-- Hero Section -->
        <div class="hero bg-base-200 rounded-2xl">
          <div class="hero-content text-center">
            <div class="max-w-md">
              <div class="avatar mb-6">
                <div class="w-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  <NuxtImg :src="promoterImage" :alt="promoterName" class="object-cover" loading="lazy" />
                </div>
              </div>
              <h1 class="text-5xl font-bold text-base-content mb-4">{{ promoterName }}</h1>
              <p v-if="promoterDescription" class="text-lg text-base-content/80 leading-relaxed whitespace-pre-line">
                {{ promoterDescription }}
              </p>
            </div>
          </div>
        </div>

        <!-- MOOD Section - Genres -->
        <div v-if="genres.length > 0" class="mb-12">
          <h2 class="text-3xl font-bold text-base-content mb-6 text-center">MOOD</h2>
          <div class="flex flex-wrap justify-center gap-3">
            <div v-for="genre in genres" :key="genre.id" class="badge badge-primary badge-lg">
              {{ genre.name }}
            </div>
          </div>
        </div>

        <!-- Upcoming Events -->
        <div v-if="upcomingEvents.length > 0" class="mb-12">
          <h2 class="text-3xl font-bold text-base-content mb-6 text-center">UPCOMING EVENTS</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="event in upcomingEvents" :key="event.id"
              class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
              @click="navigateToEvent(event.id)">
              <figure class="relative">
                <NuxtImg :src="event.image_url || '/images/default-event.jpg'" :alt="event.title"
                  class="w-full h-48 object-cover" loading="lazy" />
                <!-- Genres overlay -->
                <div v-if="getLimitedGenres(event.event_genre).length > 0"
                  class="absolute top-2 left-2 flex flex-wrap gap-1">
                  <span v-for="genreName in getLimitedGenres(event.event_genre)" :key="genreName"
                    class="badge badge-primary badge-sm">
                    {{ genreName }}
                  </span>
                </div>
              </figure>
              <div class="card-body">
                <h3 class="card-title text-lg">{{ event.title }}</h3>
                <div class="space-y-2 text-sm text-base-content/70">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 9h12v7H4V9z" />
                    </svg>
                    <span>{{ formatEventDateTime(event.date_time) }}</span>
                  </div>
                  <div v-if="getVenueName(event.event_venue)" class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clip-rule="evenodd" />
                    </svg>
                    <span>{{ getVenueName(event.event_venue) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Past Events -->
        <div class="mb-12">
          <h2 class="text-3xl font-bold text-base-content mb-6 text-center">PAST EVENTS (Debug: {{ pastEvents.length }}
            events)</h2>
          <div v-if="pastEvents.length === 0" class="text-center py-8">
            <p class="text-base-content/60">No past events found.</p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="event in pastEvents" :key="event.id"
              class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer opacity-80"
              @click="navigateToEvent(event.id)">
              <figure class="relative">
                <NuxtImg :src="event.image_url || '/images/default-event.jpg'" :alt="event.title"
                  class="w-full h-48 object-cover" loading="lazy" />
                <!-- Genres overlay -->
                <div v-if="getLimitedGenres(event.event_genre).length > 0"
                  class="absolute top-2 left-2 flex flex-wrap gap-1">
                  <span v-for="genreName in getLimitedGenres(event.event_genre)" :key="genreName"
                    class="badge badge-primary badge-sm">
                    {{ genreName }}
                  </span>
                </div>
              </figure>
              <div class="card-body">
                <h3 class="card-title text-lg">{{ event.title }}</h3>
                <div class="space-y-2 text-sm text-base-content/70">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 9h12v7H4V9z" />
                    </svg>
                    <span>{{ formatEventDateTime(event.date_time) }}</span>
                  </div>
                  <div v-if="getVenueName(event.event_venue)" class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clip-rule="evenodd" />
                    </svg>
                    <span>{{ getVenueName(event.event_venue) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-error mb-4">Promoter Not Found</h1>
        <p class="text-base-content/70">This promoter does not exist or is no longer available.</p>
      </div>
    </div>

    <!-- Footer -->
    <footer class="bg-base-200 py-8 mt-12">
      <div class="max-w-6xl mx-auto px-4">
        <div class="text-center space-y-4">
          <div class="text-base-content/70">
            © {{ currentYear }} - Powered by
            <NuxtLink to="/" class="text-primary hover:text-primary-focus font-semibold transition-colors">
              Sway
            </NuxtLink>
          </div>
          <div class="flex justify-center gap-6 text-sm">
            <NuxtLink to="/privacy" class="text-base-content/60 hover:text-base-content transition-colors">
              Privacy Policy
            </NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.promoter-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #fff;
  font-family: Arial, sans-serif;
}

.logo {
  width: 400px;
  height: 400px;
  opacity: 1;
  animation: pulse 2s infinite;
}

.loading-text {
  margin-top: 20px;
  font-size: 1.5em;
  color: #333;
}

.message {
  margin-top: 30px;
  font-size: 1em;
  color: #666;
  text-align: center;
  max-width: 100%;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(0.9);
    opacity: 0.6;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
