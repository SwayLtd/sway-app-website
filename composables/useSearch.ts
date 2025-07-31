export interface SearchEntity {
  type: 'event' | 'artist' | 'venue' | 'promoter' | 'genre' | 'user'
  id: number
  name: string
  description: string | null
}

export interface SearchHistory {
  query: string
  timestamp: Date
  results: readonly SearchEntity[]
}

export const useSearch = () => {
  const supabase = useSupabaseClient()
  
  // État réactif pour les résultats de recherche
  const searchResults = ref<SearchEntity[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Historique de recherche stocké dans localStorage
  const searchHistory = ref<SearchHistory[]>([])
  
  // Charger l'historique de recherche depuis localStorage
  const loadSearchHistory = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sway_search_history')
        if (stored) {
          const parsed = JSON.parse(stored)
          searchHistory.value = parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }))
        }
      } catch (e) {
        console.warn('Erreur lors du chargement de l\'historique de recherche:', e)
      }
    }
  }
  
  // Sauvegarder l'historique de recherche dans localStorage
  const saveSearchHistory = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sway_search_history', JSON.stringify(searchHistory.value))
      } catch (e) {
        console.warn('Erreur lors de la sauvegarde de l\'historique de recherche:', e)
      }
    }
  }
  
  // Ajouter une recherche à l'historique
  const addToHistory = (query: string, results: SearchEntity[]) => {
    if (!query.trim()) return
    
    // Supprimer l'entrée existante si elle existe
    const existingIndex = searchHistory.value.findIndex(item => item.query.toLowerCase() === query.toLowerCase())
    if (existingIndex !== -1) {
      searchHistory.value.splice(existingIndex, 1)
    }
    
    // Ajouter la nouvelle recherche au début
    searchHistory.value.unshift({
      query,
      timestamp: new Date(),
      results: results.slice(0, 5) // Garder seulement les 5 premiers résultats
    })
    
    // Garder seulement les 10 dernières recherches
    if (searchHistory.value.length > 10) {
      searchHistory.value = searchHistory.value.slice(0, 10)
    }
    
    saveSearchHistory()
  }
  
  // Vider l'historique
  const clearSearchHistory = () => {
    searchHistory.value = []
    saveSearchHistory()
  }
  
  // Fonction de recherche principale
  const search = async (query: string, entityType?: string) => {
    if (!query.trim()) {
      searchResults.value = []
      return
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      const { data, error: searchError } = await supabase
        .rpc('search_entities', {
          p_entity_type: entityType || null,
          p_query: query.trim()
        })
      
      if (searchError) {
        throw searchError
      }
      
      searchResults.value = data || []
      
      // Ajouter à l'historique
      addToHistory(query, searchResults.value)
      
    } catch (e: any) {
      error.value = e.message || 'Erreur lors de la recherche'
      searchResults.value = []
    } finally {
      isLoading.value = false
    }
  }
  
  // Recherche avec délai (debounce)
  let searchTimeout: NodeJS.Timeout | null = null
  const searchWithDelay = (query: string, entityType?: string, delay = 300) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    searchTimeout = setTimeout(() => {
      search(query, entityType)
    }, delay)
  }
  
  // Obtenir l'URL pour une entité
  const getEntityUrl = (entity: SearchEntity): string => {
    return `/${entity.type}/${entity.id}`
  }
  
  // Naviguer vers une entité
  const navigateToEntity = (entity: SearchEntity) => {
    navigateTo(getEntityUrl(entity))
  }
  
  // Charger l'historique au montage
  onMounted(() => {
    loadSearchHistory()
  })
  
  return {
    // État
    searchResults: readonly(searchResults),
    isLoading: readonly(isLoading),
    error: readonly(error),
    searchHistory: readonly(searchHistory),
    
    // Méthodes
    search,
    searchWithDelay,
    getEntityUrl,
    navigateToEntity,
    clearSearchHistory,
    loadSearchHistory
  }
}
