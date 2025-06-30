<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSeoMeta, useSupabaseClient } from '#imports'

const route = useRoute()
const entityId = route.params.id as string
const isMobile = ref(false)
const supabase = useSupabaseClient()

const venue = ref<any>(null)

async function fetchVenue() {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, description, image_url')
    .eq('id', entityId)
    .maybeSingle()
  if (!error && data) venue.value = data
}
await fetchVenue()

const venueName = computed(() => venue.value?.name || '')
const venueDescription = computed(() => venue.value?.description || '')
const venueImage = computed(() => {
  const url = venue.value?.image_url
  if (!url) return '/images/default-venue.jpg'
  return url.startsWith('http') ? url : `${url.startsWith('/') ? '' : '/'}${url}`
})

const BASE_URL = useRuntimeConfig().public.BASE_URL
const pageUrl = computed(() => `${BASE_URL}/venue/${entityId}`)

useSeoMeta({
  title: venueName.value ? `${venueName.value} - Sway` : 'Sway',
  ogTitle: venueName.value ? `${venueName.value} - Sway` : 'Sway',
  twitterTitle: venueName.value ? `${venueName.value} - Sway` : 'Sway',
  description: venueDescription.value,
  ogDescription: venueDescription.value,
  twitterDescription: venueDescription.value,
  ogImage: venueImage.value,
  twitterImage: venueImage.value,
  ogUrl: pageUrl.value,
  twitterCard: 'summary_large_image',
  ogType: 'website',
  robots: 'index, follow',
})

onMounted(() => {
  isMobile.value = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (entityId && isMobile.value) {
    window.location.href = `app.sway.main://app/venue/${entityId}`
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center items-center bg-white">
    <div class="card bg-base-100 shadow-xl w-full max-w-xl">
      <figure v-if="venueImage" class="pt-6">
        <img :src="venueImage" :alt="venueName" class="rounded-xl w-64 h-64 object-cover" loading="eager">
      </figure>
      <div class="card-body items-center text-center">
        <h1 class="card-title text-3xl font-bold mb-2">{{ venueName }}</h1>
        <p v-if="venueDescription" class="mb-4 text-base-content/80">{{ venueDescription }}</p>
        <div v-if="!isMobile" class="alert alert-info mt-4">
          The web version of Sway App is not yet available.<br>Please check back soon, or open the app on your phone!
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.venue-page {
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
