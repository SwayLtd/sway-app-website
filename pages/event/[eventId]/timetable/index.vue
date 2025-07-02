<template>
    <div class="max-w-5xl mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">Full timetable</h1>
        <Timetable :event-id="Number(route.params.eventId)" />
    </div>
</template>

<script setup lang="ts">
import Timetable from '~/components/event/Timetable.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
