<script setup lang="ts">
import { ref, onMounted } from 'vue'


// Utilisation de $gtag (vue-gtag-next)
import { useNuxtApp } from '#app'
const nuxtApp = useNuxtApp()
function trackEvent(action: string, label: string) {
  if (nuxtApp.$gtag) {
    nuxtApp.$gtag.event(action, {
      event_category: 'GetApp',
      event_label: label
    })
  }
}

const isAndroid = ref(false)
const isIOS = ref(false)
const checked = ref(false)

const playStoreUrl = 'https://play.google.com/store/apps/details?id=app.sway.main'
const appStoreUrl = 'https://apps.apple.com/us/app/sway-find-raves-and-festivals/id6744655264'

onMounted(() => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera
  isAndroid.value = /android/i.test(ua)
  isIOS.value = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
  checked.value = true

  // Track page view
  trackEvent('page_view', isAndroid.value ? 'android' : isIOS.value ? 'ios' : 'other')

  if (isAndroid.value) {
    trackEvent('redirect', 'android')
    window.location.href = playStoreUrl
  } else if (isIOS.value) {
    trackEvent('redirect', 'ios')
    window.location.href = appStoreUrl
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center items-center bg-base-100">
    <div v-if="checked && !isAndroid && !isIOS" class="card bg-base-100 shadow-xl p-8 mt-12">
      <h1 class="card-title text-2xl mb-4 text-center">Get Sway</h1>
      <p class="mb-6 text-base-content/80 text-center">Download Sway for your device:</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a :href="playStoreUrl" target="_blank" rel="noopener" aria-label="Google Play"
           @click="trackEvent('click', 'android')">
          <NuxtImg src="/images/play-store.png" alt="Google Play" width="180" height="55" class="object-contain store-btn" />
        </a>
        <a :href="appStoreUrl" target="_blank" rel="noopener" aria-label="App Store"
           @click="trackEvent('click', 'ios')">
          <NuxtImg src="/images/app-store.png" alt="App Store" width="180" height="55" class="object-contain store-btn" />
        </a>
      </div>
    </div>
    <div v-else class="mt-12">
      <span class="loading loading-spinner loading-lg text-primary" />
    </div>
  </div>
</template>
