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

    // Validate that it's a Facebook short URL
    try {
      const urlObj = new URL(url)
      if (!(urlObj.hostname === 'fb.me' || urlObj.hostname === 'www.fb.me') || 
          !urlObj.pathname.startsWith('/e/')) {
        return {
          success: false,
          error: 'Not a Facebook short URL'
        }
      }
    } catch {
      return {
        success: false,
        error: 'Invalid URL format'
      }
    }

    // For fb.me/e/ URLs, we need to resolve to the final event URL
    // We'll use curl since Node.js fetch is blocked by Facebook
    
    // Extract the event code from fb.me/e/CODE
    const pathMatch = url.match(/\/e\/([^/?]+)/)
    if (pathMatch) {
      const eventCode = pathMatch[1]
      // First convert to Facebook invitation URL format
      const invitationUrl = `https://www.facebook.com/event_invite/${eventCode}/`
      
      // Use curl to resolve the invitation URL (since Facebook blocks fetch)
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
                note: 'Fully resolved fb.me link to Facebook event URL using curl'
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
    } else {
      return {
        success: false,
        error: 'Could not extract event code from fb.me URL'
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
