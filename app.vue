<!-- <template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

-->

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
import { useHead } from '#imports'

// Google Analytics gtag.js global integration
useHead({
  script: [
    {
      src: 'https://www.googletagmanager.com/gtag/js?id=G-3PPVHPNSL5',
      async: true
    },
    {
      children: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-3PPVHPNSL5');
      `
    }
  ]
})
useHead({
  htmlAttrs: {
    'data-theme': 'light'
  }
})
</script>