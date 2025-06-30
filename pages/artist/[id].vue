<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSeoMeta, useSupabaseClient } from '#imports'

const route = useRoute()
const entityId = route.params.id as string
const isMobile = ref(false)
const supabase = useSupabaseClient()

const artist = ref<any>(null)

async function fetchArtist() {
  const { data, error } = await supabase
    .from('artists')
    .select('id, name, description, image_url')
    .eq('id', entityId)
    .maybeSingle()
  if (!error && data) artist.value = data
}
await fetchArtist()

const artistName = computed(() => artist.value?.name || '')
const artistDescription = computed(() => artist.value?.description || '')
const artistImage = computed(() => {
  const url = artist.value?.image_url
  if (!url) return '/images/default-artist.jpg'
  return url.startsWith('http') ? url : `${url.startsWith('/') ? '' : '/'}${url}`
})

const BASE_URL = useRuntimeConfig().public.BASE_URL
const pageUrl = computed(() => `${BASE_URL}/artist/${entityId}`)

useSeoMeta({
  title: artistName.value ? `${artistName.value} - Sway` : 'Sway',
  ogTitle: artistName.value ? `${artistName.value} - Sway` : 'Sway',
  twitterTitle: artistName.value ? `${artistName.value} - Sway` : 'Sway',
  description: artistDescription.value,
  ogDescription: artistDescription.value,
  twitterDescription: artistDescription.value,
  ogImage: artistImage.value,
  twitterImage: artistImage.value,
  ogUrl: pageUrl.value,
  twitterCard: 'summary_large_image',
  ogType: 'website',
  robots: 'index, follow',
})

onMounted(() => {
  isMobile.value = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (entityId && isMobile.value) {
    window.location.href = `app.sway.main://app/artist/${entityId}`
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center items-center bg-white">
    <div class="card bg-base-100 shadow-xl w-full max-w-xl">
      <figure v-if="artistImage" class="pt-6">
        <NuxtImg :src="artistImage" :alt="artistName" class="rounded-xl w-64 h-64 object-cover" loading="lazy" />
      </figure>
      <div class="card-body items-center text-center">
        <h1 class="card-title text-3xl font-bold mb-2">{{ artistName }}</h1>
        <p v-if="artistDescription" class="mb-4 text-base-content/80">{{ artistDescription }}</p>
        <div v-if="!isMobile" class="alert alert-info mt-4">
          The web version of Sway App is not yet available.<br>Please check back soon, or open the app on your phone!
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.artist-page {
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
