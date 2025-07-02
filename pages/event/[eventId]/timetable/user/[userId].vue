<template>
  <div class="max-w-5xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Custom timetable of {{ username || '...' }}</h1>
    <Timetable :event-id="Number(route.params.eventId)" :artist-ids-filter="artistIds" v-if="!loading && !error" />
    <div v-if="loading" class="flex justify-center mt-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
    <div v-if="error" class="alert alert-error mt-4">
      <span>Error loading followed artists.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import Timetable from '~/components/event/Timetable.vue'
import { useRoute } from 'vue-router'
import { useSupabaseClient } from '#imports'
import { ref, onMounted } from 'vue'
import { useUserProfile } from '~/composables/useUserProfile'

const route = useRoute()
const supabase = useSupabaseClient()
const artistIds = ref<number[]>([])
const loading = ref(true)
const error = ref(false)
const username = ref<string | null>(null)

onMounted(async () => {
  loading.value = true
  error.value = false
  try {
    // Fetch followed artists
    const { data, error: err } = await supabase
      .from('user_follow_artist')
      .select('artist_id')
      .eq('user_id', Number(route.params.userId))
    if (err) throw err
    artistIds.value = (data || []).map((row: { artist_id: number }) => row.artist_id)
    // Fetch username
    username.value = await useUserProfile(Number(route.params.userId))
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>
