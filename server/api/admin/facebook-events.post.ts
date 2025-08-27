import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Clean Facebook URL by removing parameters and keeping only the essential event URL
 */
function cleanFacebookUrl(url: string): string {
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
    console.warn('URL parsing failed:', error)
    return url.trim()
  }
}

export default defineEventHandler(async (event) => {
  // Only allow POST method
  if (getMethod(event) !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  try {
    const body = await readBody(event)
    let { facebook_url, priority = 0 } = body

    // Validate required fields
    if (!facebook_url || typeof facebook_url !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'URL Facebook requise'
      })
    }

    // Clean the URL first
    facebook_url = cleanFacebookUrl(facebook_url)

    // Basic URL validation
    const urlPattern = /^https?:\/\/(www\.)?(facebook\.com|fb\.me)\/events\/.+/i
    if (!urlPattern.test(facebook_url.trim())) {
      throw createError({
        statusCode: 400,
        statusMessage: 'URL Facebook invalide. Doit être au format: https://www.facebook.com/events/...'
      })
    }

    // Validate priority
    const priorityNum = parseInt(priority)
    if (isNaN(priorityNum) || priorityNum < 0 || priorityNum > 10) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Priorité invalide (doit être entre 0 et 10)'
      })
    }

    // Get Supabase service role client (bypasses RLS)
    const supabase = serverSupabaseServiceRole(event)

    // Check if URL already exists
    const { data: existingEvent, error: checkError } = await supabase
      .from('facebook_events_imports')
      .select('id, status')
      .eq('facebook_url', facebook_url.trim())
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing event:', checkError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la vérification'
      })
    }

    if (existingEvent) {
      throw createError({
        statusCode: 409,
        statusMessage: `Cette URL existe déjà (ID: ${existingEvent.id}, Statut: ${existingEvent.status})`
      })
    }

    // Insert new facebook event import
    const { data, error } = await supabase
      .from('facebook_events_imports')
      .insert([
        {
          facebook_url: facebook_url.trim(),
          priority: priorityNum,
          status: 'pending',
          retry_count: 0,
          max_retries: 5
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error inserting facebook event import:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de l\'ajout à la base de données'
      })
    }

    return {
      success: true,
      data: data,
      message: 'Événement Facebook ajouté avec succès à la file d\'import'
    }

  } catch (error) {
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }

    console.error('Unexpected error in facebook-events API:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur serveur inattendue'
    })
  }
})
