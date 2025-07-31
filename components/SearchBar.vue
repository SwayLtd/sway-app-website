<template>
  <div class="search-container relative w-full max-w-2xl mx-auto">
    <!-- Main search bar -->
    <div class="form-control">
      <div class="input-group">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          placeholder="Search events, artists, venues, promoters..."
          class="input input-bordered input-lg w-full"
          @input="handleSearch"
          @focus="showDropdown = true"
          @keydown.escape="hideDropdown"
          @keydown.arrow-down.prevent="navigateDropdown(1)"
          @keydown.arrow-up.prevent="navigateDropdown(-1)"
          @keydown.enter.prevent="selectHighlighted"
        >
      </div>
    </div>

    <!-- Results dropdown -->
    <div 
      v-show="showDropdown && (hasResults || hasHistory)"
      class="dropdown-content absolute top-full left-0 right-0 mt-2 bg-base-100 rounded-box shadow-lg border border-base-300 z-50 max-h-96 overflow-y-auto"
      style="overscroll-behavior: contain;"
      @wheel="handleDropdownWheel"
    >
      <!-- Search results -->
      <div v-if="hasResults" class="py-2">
        <div class="px-4 py-2 text-sm font-semibold text-base-content/70 border-b border-base-300">
          Results
        </div>
        <button
          v-for="(result, index) in searchResults"
          :key="`result-${result.type}-${result.id}`"
          class="w-full px-4 py-3 text-left hover:bg-base-200 flex items-center gap-3 transition-colors"
          :class="{ 'bg-base-200': highlightedIndex === index }"
          @click="selectEntity(result)"
        >
          <!-- Icon based on entity type -->
          <div class="flex-shrink-0">
            <Icon
              :name="getEntityIcon(result.type)"
              class="h-5 w-5 text-primary"
            />
          </div>
          
          <!-- Entity information -->
          <div class="flex-1 min-w-0">
            <div class="font-medium text-base-content truncate">
              {{ result.name }}
            </div>
            <div class="text-sm text-base-content/70 truncate">
              {{ getEntityTypeLabel(result.type) }}
              <span v-if="result.description" class="ml-1">
                · {{ result.description }}
              </span>
            </div>
          </div>
          
          <!-- Type badge -->
          <div class="flex-shrink-0">
            <span 
              class="badge badge-sm"
              :class="getEntityBadgeClass(result.type)"
            >
              {{ getEntityTypeLabel(result.type) }}
            </span>
          </div>
        </button>
      </div>

      <!-- Search history -->
      <div v-if="hasHistory && !hasResults" class="py-2">
        <div class="px-4 py-2 text-sm font-semibold text-base-content/70 border-b border-base-300 flex items-center justify-between">
          Recent searches
          <button 
            class="btn btn-ghost btn-xs"
            @click="clearHistory"
          >
            Clear
          </button>
        </div>
        <button
          v-for="(historyItem, index) in searchHistory.slice(0, 5)"
          :key="`history-${index}`"
          class="w-full px-4 py-3 text-left hover:bg-base-200 flex items-center gap-3 transition-colors"
          :class="{ 'bg-base-200': highlightedIndex === (searchResults.length + index) }"
          @click="selectHistoryItem(historyItem)"
        >
          <Icon
            name="heroicons:clock"
            class="h-4 w-4 text-base-content/50 flex-shrink-0"
          />
          <span class="flex-1 text-base-content truncate">
            {{ historyItem.query }}
          </span>
          <span class="text-xs text-base-content/50 flex-shrink-0">
            {{ formatRelativeTime(historyItem.timestamp) }}
          </span>
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="!hasResults && !hasHistory && searchQuery.trim()" class="px-4 py-8 text-center text-base-content/70">
        <Icon name="heroicons:magnifying-glass" class="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No results found for "{{ searchQuery }}"</p>
      </div>
    </div>

    <!-- Overlay to close dropdown -->
    <div 
      v-show="showDropdown"
      class="fixed inset-0 z-40"
      @click="hideDropdown"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useSearch } from '~/composables/useSearch'
import type { SearchEntity, SearchHistory } from '~/composables/useSearch'

const {
  searchResults,
  searchHistory,
  searchWithDelay,
  navigateToEntity,
  clearSearchHistory
} = useSearch()

// Local component state
const searchQuery = ref('')
const showDropdown = ref(false)
const highlightedIndex = ref(-1)
const searchInput = ref<HTMLInputElement>()

// Computed
const hasResults = computed(() => searchResults.value.length > 0)
const hasHistory = computed(() => searchHistory.value.length > 0)
const totalItems = computed(() => searchResults.value.length + (hasHistory.value ? Math.min(5, searchHistory.value.length) : 0))

// Search handling
const handleSearch = () => {
  const query = searchQuery.value.trim()
  if (query.length >= 2) {
    searchWithDelay(query)
    showDropdown.value = true
  } else if (query.length === 0) {
    showDropdown.value = hasHistory.value
  }
  highlightedIndex.value = -1
}

// Keyboard navigation
const navigateDropdown = (direction: number) => {
  if (!showDropdown.value || totalItems.value === 0) return
  
  const newIndex = highlightedIndex.value + direction
  if (newIndex >= -1 && newIndex < totalItems.value) {
    highlightedIndex.value = newIndex
  }
}

const selectHighlighted = () => {
  if (highlightedIndex.value === -1) return
  
  if (highlightedIndex.value < searchResults.value.length) {
    // Select a search result
    const result = searchResults.value[highlightedIndex.value]
    selectEntity(result)
  } else {
    // Select a history item
    const historyIndex = highlightedIndex.value - searchResults.value.length
    const historyItem = searchHistory.value[historyIndex]
    if (historyItem) {
      selectHistoryItem(historyItem)
    }
  }
}

// Entity selection
const selectEntity = (entity: SearchEntity) => {
  hideDropdown()
  navigateToEntity(entity)
}

const selectHistoryItem = (historyItem: SearchHistory) => {
  searchQuery.value = historyItem.query
  handleSearch()
}

// Dropdown management
const hideDropdown = () => {
  showDropdown.value = false
  highlightedIndex.value = -1
}

// History cleanup
const clearHistory = () => {
  clearSearchHistory()
  if (!hasResults.value) {
    hideDropdown()
  }
}

// Display utilities
const getEntityIcon = (type: string): string => {
  const icons = {
    event: 'heroicons:calendar-days',
    artist: 'heroicons:musical-note',
    venue: 'heroicons:map-pin',
    promoter: 'heroicons:building-office',
    genre: 'heroicons:tag',
    user: 'heroicons:user'
  }
  return icons[type as keyof typeof icons] || 'heroicons:square-3-stack-3d'
}

const getEntityTypeLabel = (type: string): string => {
  const labels = {
    event: 'Event',
    artist: 'Artist',
    venue: 'Venue',
    promoter: 'Promoter',
    genre: 'Genre',
    user: 'User'
  }
  return labels[type as keyof typeof labels] || type
}

const getEntityBadgeClass = (type: string): string => {
  const classes = {
    event: 'badge-primary',
    artist: 'badge-secondary',
    venue: 'badge-accent',
    promoter: 'badge-info',
    genre: 'badge-warning',
    user: 'badge-success'
  }
  return classes[type as keyof typeof classes] || 'badge-neutral'
}

const formatRelativeTime = (date: Date): string => {
  return formatDistanceToNow(date, { 
    addSuffix: true, 
    locale: enUS 
  })
}

// Global event handling
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.search-container')) {
    hideDropdown()
  }
}

// Prevent page scroll when scrolling inside dropdown
const handleDropdownWheel = (event: WheelEvent) => {
  const dropdown = event.currentTarget as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = dropdown
  
  // Check if we're at the top or bottom of the dropdown
  const isAtTop = scrollTop === 0
  const isAtBottom = scrollTop + clientHeight >= scrollHeight
  
  // Prevent page scroll if we're not at the limits or scrolling in the opposite direction
  if ((!isAtTop && event.deltaY < 0) || (!isAtBottom && event.deltaY > 0)) {
    event.stopPropagation()
  }
  
  // Always prevent the default behavior to stop page scrolling
  if ((isAtTop && event.deltaY < 0) || (isAtBottom && event.deltaY > 0)) {
    // Allow scroll to propagate only when at limits and scrolling beyond
    return
  }
  
  event.stopPropagation()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Focus on input
const focusSearchInput = () => {
  nextTick(() => {
    searchInput.value?.focus()
  })
}

// Expose methods if needed
defineExpose({
  focusSearchInput,
  clearSearch: () => {
    searchQuery.value = ''
    hideDropdown()
  }
})
</script>

<style scoped>
.search-container {
  /* Performance improvement with will-change */
  will-change: transform;
}

.dropdown-content {
  /* Fade-in animation */
  animation: fadeIn 0.2s ease-out;
  /* Fix scrolling issue - prevent page scroll when hovering over dropdown */
  overscroll-behavior: contain;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Accessibility improvement */
.dropdown-content button:focus {
  outline: 2px solid hsl(var(--p));
  outline-offset: -2px;
}

/* Scrollbar customization */
.dropdown-content::-webkit-scrollbar {
  width: 6px;
}

.dropdown-content::-webkit-scrollbar-track {
  background: transparent;
}

.dropdown-content::-webkit-scrollbar-thumb {
  background: hsl(var(--bc) / 0.2);
  border-radius: 3px;
}

.dropdown-content::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--bc) / 0.3);
}
</style>
