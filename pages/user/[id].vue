<script setup lang="ts">
import { useRoute, useSeoMeta, useSupabaseClient } from '#imports'
import { onMounted, ref, computed } from 'vue'
import { useRuntimeConfig } from '#app'

const route = useRoute()
const entityId = route.params.id as string | undefined
const isMobile = ref(false)
const config = useRuntimeConfig()

const supabase = useSupabaseClient()
const user = ref<any>(null)

async function fetchUser() {
  if (!entityId) return
  const { data, error } = await supabase
    .from('users')
    .select('id, username, profile_picture_url, bio')
    .eq('id', entityId)
    .maybeSingle()
  if (!error && data) user.value = data
}
await fetchUser()

const userName = computed(() => user.value?.username || 'User')
const userImage = computed(() => user.value?.profile_picture_url || '/images/sway-app.png')
const userBio = computed(() => user.value?.bio || '')

useSeoMeta({
  title: userName.value ? `${userName.value} - Sway` : 'Sway User - Sway',
  ogTitle: userName.value ? `${userName.value} - Sway` : 'Sway User - Sway',
  twitterTitle: userName.value ? `${userName.value} - Sway` : 'Sway User - Sway',
  description: userBio.value || 'Sway user profile on Sway App.',
  ogDescription: userBio.value || 'Sway user profile on Sway App.',
  twitterDescription: userBio.value || 'Sway user profile on Sway App.',
  ogImage: userImage.value,
  twitterImage: userImage.value,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  robots: 'index, follow',
})

onMounted(() => {
  isMobile.value = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (entityId && isMobile.value) {
    window.location.href = `app.sway.main://app/user/${entityId}`
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center items-center bg-white">
    <div class="card bg-base-100 shadow-xl w-full max-w-xl">
      <figure v-if="userImage" class="pt-6">
        <NuxtImg
          :src="userImage"
          :alt="userName"
          class="rounded-xl w-64 h-64 object-cover"
          width="256"
          height="256"
          format="webp"
          loading="lazy"
          densities="x1 x2"
          :placeholder="userImage !== '/images/sway-app.png' ? 'blur' : undefined"
          :quality="80"
        />
      </figure>
      <div class="card-body items-center text-center">
        <h1 class="card-title text-3xl font-bold mb-2">{{ userName }}</h1>
        <p v-if="userBio" class="mb-4 text-base-content/80 max-w-prose w-full mx-auto">{{ userBio }}</p>
        <div v-if="entityId && !isMobile" class="alert alert-info mt-4 max-w-md mx-auto">
          <div class="text-sm leading-relaxed">
            <p class="mb-2">The web version of Sway App is not yet available.</p>
            <p>Please check back soon, or <a :href="`${config.public.BASE_URL || 'https://sway.events'}/get-app`" class="text-primary underline hover:text-primary-focus font-medium transition-colors">open the app</a> on your phone!</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-page {
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
