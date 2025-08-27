export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { url } = body

    if (!url) {
      return {
        success: false,
        error: 'URL is required'
      }
    }

    // Validate that it's a Facebook short URL or invitation URL
    try {
      const urlObj = new URL(url)
      const isFbMeShortUrl = (urlObj.hostname === 'fb.me' || urlObj.hostname === 'www.fb.me') && 
                             urlObj.pathname.startsWith('/e/')
      const isFbInviteUrl = urlObj.hostname.includes('facebook.com') && 
                            urlObj.pathname.includes('/event_invite/')
      
      if (!isFbMeShortUrl && !isFbInviteUrl) {
        return {
          success: false,
          error: 'Not a Facebook short URL or invitation URL'
        }
      }
    } catch {
      return {
        success: false,
        error: 'Invalid URL format'
      }
    }

    // For fb.me/e/ URLs, we need to resolve to the final event URL
    // For event_invite/ URLs, we also need to resolve to the final event URL
    // We'll use curl since Node.js fetch is blocked by Facebook
    
    let invitationUrl = url
    
    // If it's a fb.me/e/ URL, first convert to invitation format
    const fbMeMatch = url.match(/fb\.me\/e\/([^/?]+)/)
    if (fbMeMatch) {
      const eventCode = fbMeMatch[1]
      invitationUrl = `https://www.facebook.com/event_invite/${eventCode}/`
    }
    
    // If it's already an invitation URL or we converted it, resolve it
    if (invitationUrl.includes('/event_invite/')) {
      try {
        const { execSync } = await import('child_process')
        
        console.log(`Trying to resolve: ${invitationUrl}`)
        
        // Execute curl to get the redirect location
        const curlCommand = `curl -I "${invitationUrl}"`
        const curlOutput = execSync(curlCommand, { 
          encoding: 'utf8',
          timeout: 10000 // 10 seconds timeout
        })
        
        console.log('Curl output:', curlOutput)
        
        // Parse the Location header from curl output
        const locationMatch = curlOutput.match(/Location: (.+)/i)
        if (locationMatch) {
          const location = locationMatch[1].trim()
          console.log(`Redirect location: ${location}`)
          
          if (location && location.includes('/events/')) {
            // Extract event ID from the redirected URL
            const eventMatch = location.match(/\/events\/(\d+)/)
            if (eventMatch) {
              const eventId = eventMatch[1]
              const finalEventUrl = `https://www.facebook.com/events/${eventId}/`
              
              return {
                success: true,
                resolvedUrl: finalEventUrl,
                originalUrl: url,
                note: 'Fully resolved Facebook invitation/short URL to event URL using curl'
              }
            }
          }
        }
        
        // If we can't extract the final URL, fall back to invitation URL
        return {
          success: true,
          resolvedUrl: invitationUrl,
          originalUrl: url,
          note: 'Converted to invitation URL, could not resolve to final event URL'
        }
        
      } catch (error) {
        console.warn('Could not resolve invitation URL with curl:', error)
        
        // Fallback to invitation URL if curl fails
        return {
          success: true,
          resolvedUrl: invitationUrl,
          originalUrl: url,
          note: 'Converted to invitation URL (curl resolution failed)'
        }
      }
    }

  } catch (error) {
    console.error('API error:', error)
    return {
      success: false,
      error: 'Server error'
    }
  }
})
