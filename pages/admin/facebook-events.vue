<template>
  <div class="min-h-screen bg-base-200" data-theme="light">
    <div class="max-w-4xl mx-auto p-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-base-content mb-2">Import d'événements Facebook</h1>
        <p class="text-base-content/70">Ajoutez une URL d'événement Facebook pour l'importer dans le système.</p>
      </div>

      <!-- Formulaire d'ajout -->
      <div class="card bg-base-100 shadow-xl mb-8">
        <div class="card-body">
          <h2 class="card-title mb-4">Ajouter un nouvel événement</h2>
          
          <form class="space-y-6" @submit.prevent="submitEvent">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">URL de l'événement Facebook</span>
              </label>
              <div class="flex gap-2">
                <input 
                  v-model="facebookUrl" 
                  type="url" 
                  placeholder="https://www.facebook.com/events/..." 
                  class="input input-bordered flex-1" 
                  required
                >
                <button 
                  type="button" 
                  class="btn btn-outline btn-sm"
                  :disabled="!facebookUrl.trim()"
                  @click="cleanUrl"
                >
                  🧹 Nettoyer
                </button>
              </div>
              <label class="label">
                <span class="label-text-alt">
                  Exemple: https://www.facebook.com/events/123456789
                  <br>
                  <span class="text-info">💡 Les paramètres supplémentaires seront automatiquement supprimés</span>
                </span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Priorité (optionnel)</span>
              </label>
              <select v-model="priority" class="select select-bordered w-full">
                <option value="0">Normal (0)</option>
                <option value="1">Élevée (1)</option>
                <option value="2">Très élevée (2)</option>
              </select>
            </div>

            <div class="flex gap-4">
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="loading || !facebookUrl.trim()"
              >
                <span v-if="loading" class="loading loading-spinner loading-sm" />
                {{ loading ? 'Ajout en cours...' : 'Ajouter à la file d\'import' }}
              </button>
              
              <button 
                type="button" 
                class="btn btn-ghost" 
                :disabled="loading"
                @click="resetForm"
              >
                Réinitialiser
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Messages de statut -->
      <div v-if="message" class="alert mb-6" :class="messageType === 'success' ? 'alert-success' : 'alert-error'">
        <svg v-if="messageType === 'success'" xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ message }}</span>
      </div>

      <!-- Liste des imports récents -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h2 class="card-title">Imports récents</h2>
            <button class="btn btn-sm btn-ghost" @click="fetchRecentImports">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualiser
            </button>
          </div>
          
          <div v-if="loadingImports" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-md" />
          </div>
          
          <div v-else-if="recentImports.length === 0" class="text-center py-8 text-base-content/60">
            Aucun import récent trouvé
          </div>
          
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>URL Facebook</th>
                  <th>Statut</th>
                  <th>Priorité</th>
                  <th>Date d'ajout</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in recentImports" :key="item.id">
                  <td>
                    <a :href="item.facebook_url" target="_blank" class="link link-primary truncate max-w-xs inline-block">
                      {{ item.facebook_url }}
                    </a>
                  </td>
                  <td>
                    <div class="badge" :class="getStatusBadgeClass(item.status)">
                      {{ getStatusText(item.status) }}
                    </div>
                  </td>
                  <td>
                    <div class="badge badge-outline">{{ item.priority }}</div>
                  </td>
                  <td>{{ formatDate(item.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'

definePageMeta({
  layout: 'admin'
})

// State variables
const supabase = useSupabaseClient()
const facebookUrl = ref('')
const priority = ref(0)
const loading = ref(false)
const message = ref('')
const messageType = ref('success')
const recentImports = ref([])
const loadingImports = ref(false)

// Clean Facebook URL by removing parameters
function cleanFacebookUrl(url) {
  if (!url) return ''
  
  try {
    const urlObj = new URL(url)
    
    // Keep only the base path for Facebook events
    if (urlObj.hostname.includes('facebook.com') || urlObj.hostname.includes('fb.me')) {
      // Extract event ID from path
      const pathMatch = urlObj.pathname.match(/\/events\/(\d+)/)
      if (pathMatch) {
        const eventId = pathMatch[1]
        return `https://www.facebook.com/events/${eventId}/`
      }
    }
    
    // If not a Facebook URL or no event ID found, return original URL
    return url.trim()
  } catch (error) {
    // If URL parsing fails, return original
    console.warn('URL parsing failed:', error.message)
    return url.trim()
  }
}

// Submit form
async function submitEvent() {
  if (!facebookUrl.value.trim()) return
  
  loading.value = true
  message.value = ''
  
  // Clean the URL before submission
  const cleanedUrl = cleanFacebookUrl(facebookUrl.value)
  
  try {
    const response = await $fetch('/api/admin/facebook-events', {
      method: 'POST',
      body: {
        facebook_url: cleanedUrl,
        priority: priority.value
      }
    })
    
    if (response.success) {
      message.value = 'Événement ajouté avec succès à la file d\'import !'
      messageType.value = 'success'
      resetForm()
      await fetchRecentImports()
    } else {
      throw new Error(response.error || 'Erreur inconnue')
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout:', error)
    message.value = error.data?.error || error.message || 'Erreur lors de l\'ajout de l\'événement'
    messageType.value = 'error'
  } finally {
    loading.value = false
    // Clear message after 5 seconds
    setTimeout(() => {
      message.value = ''
    }, 5000)
  }
}

// Clean URL manually (triggered by button)
function cleanUrl() {
  if (facebookUrl.value.trim()) {
    const originalUrl = facebookUrl.value
    const cleanedUrl = cleanFacebookUrl(facebookUrl.value)
    
    facebookUrl.value = cleanedUrl
    
    // Show a temporary message if URL was changed
    if (originalUrl !== cleanedUrl) {
      message.value = 'URL nettoyée avec succès !'
      messageType.value = 'success'
      setTimeout(() => {
        if (message.value === 'URL nettoyée avec succès !') {
          message.value = ''
        }
      }, 3000)
    }
  }
}

// Reset form
function resetForm() {
  facebookUrl.value = ''
  priority.value = 0
}

// Fetch recent imports
async function fetchRecentImports() {
  loadingImports.value = true
  try {
    const { data, error } = await supabase
      .from('facebook_events_imports')
      .select('id, facebook_url, status, priority, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Erreur lors du chargement:', error)
      return
    }
    
    recentImports.value = data || []
  } catch (error) {
    console.error('Erreur lors du chargement:', error)
  } finally {
    loadingImports.value = false
  }
}

// Helper functions
function getStatusText(status) {
  const statusMap = {
    'pending': 'En attente',
    'processing': 'En cours',
    'completed': 'Terminé',
    'failed': 'Échoué'
  }
  return statusMap[status] || status
}

function getStatusBadgeClass(status) {
  const classMap = {
    'pending': 'badge-warning',
    'processing': 'badge-info',
    'completed': 'badge-success',
    'failed': 'badge-error'
  }
  return classMap[status] || 'badge-ghost'
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Load recent imports on mount
onMounted(() => {
  fetchRecentImports()
})
</script>
