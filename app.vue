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

useHead({
  htmlAttrs: {
    'data-theme': 'light'
  }
})
</script>