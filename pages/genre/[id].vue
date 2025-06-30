<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSeoMeta, useSupabaseClient } from '#imports'

const route = useRoute()
const entityId = route.params.id as string
const isMobile = ref(false)
const supabase = useSupabaseClient()

const genre = ref<any>(null)

async function fetchGenre() {
  const { data, error } = await supabase
    .from('genres')
    .select('id, name, description')
    .eq('id', entityId)
    .maybeSingle()
  if (!error && data) genre.value = data
}
await fetchGenre()

const genreName = computed(() => genre.value?.name || '')
const genreDescription = computed(() => genre.value?.description || '')

const BASE_URL = useRuntimeConfig().public.BASE_URL
const pageUrl = computed(() => `${BASE_URL}/genre/${entityId}`)

useSeoMeta({
  title: genreName.value ? `${genreName.value} - Sway` : 'Sway',
  ogTitle: genreName.value ? `${genreName.value} - Sway` : 'Sway',
  twitterTitle: genreName.value ? `${genreName.value} - Sway` : 'Sway',
  description: genreDescription.value,
  ogDescription: genreDescription.value,
  twitterDescription: genreDescription.value,
  ogUrl: pageUrl.value,
  twitterCard: 'summary',
  ogType: 'website',
  robots: 'index, follow',
})

onMounted(() => {
  isMobile.value = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (entityId && isMobile.value) {
    window.location.href = `app.sway.main://app/genre/${entityId}`
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center items-center bg-white">
    <div class="card bg-base-100 shadow-xl w-full max-w-xl">
      <div class="card-body items-center text-center">
        <h1 class="card-title text-3xl font-bold mb-2">{{ genreName }}</h1>
        <p v-if="genreDescription" class="mb-4 text-base-content/80 max-w-prose w-full mx-auto">{{ genreDescription }}
        </p>
        <div v-if="!isMobile" class="alert alert-info mt-4">
          The web version of Sway App is not yet available.<br>Please check back soon, or open the app on your phone!
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.genre-page {
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
