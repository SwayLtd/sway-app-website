#!/usr/bin/env node

// Test de l'API de résolution Facebook
async function testFacebookResolver() {
    const testUrl = 'https://fb.me/e/63dcq5QR4';
    
    // Test différents ports possibles
    const ports = [3000, 3001, 3002];
    
    console.log('🧪 Test du Facebook URL Resolver');
    console.log('='.repeat(50));
    console.log(`🎯 URL de test: ${testUrl}`);
    console.log('');
    
    for (const port of ports) {
        const apiUrl = `http://localhost:${port}/api/admin/resolve-facebook-url`;
        
        console.log(`🔍 Test sur le port ${port}...`);
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: testUrl })
            });
            
            if (!response.ok) {
                console.log(`   ❌ Erreur HTTP ${response.status}: ${response.statusText}`);
                continue;
            }
            
            const data = await response.json();
            
            if (data.success) {
                console.log('   ✅ SUCCÈS !');
                console.log(`   📍 URL originale: ${data.originalUrl}`);
                console.log(`   🎯 URL résolue: ${data.resolvedUrl}`);
                if (data.note) {
                    console.log(`   📝 Note: ${data.note}`);
                }
                
                // Test réussi, on peut arrêter
                return true;
                
            } else {
                console.log(`   ❌ Erreur API: ${data.error}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Erreur de connexion: ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log('❌ Aucun serveur trouvé sur les ports testés');
    return false;
}

// Test aussi notre logique de nettoyage côté client
function testCleanFacebookUrl() {
    console.log('\n🧹 Test de la fonction cleanFacebookUrl');
    console.log('='.repeat(50));
    
    // Copie de la fonction depuis notre page Vue
    function cleanFacebookUrl(url) {
        if (!url) return '';
        
        try {
            const urlObj = new URL(url);
            
            // Keep only the base path for Facebook events and invitations
            if (urlObj.hostname.includes('facebook.com') || urlObj.hostname.includes('fb.me')) {
                // Extract event ID from path for direct event URLs
                const pathMatch = urlObj.pathname.match(/\/events\/(\d+)/);
                if (pathMatch) {
                    const eventId = pathMatch[1];
                    return `https://www.facebook.com/events/${eventId}/`;
                }
                
                // Keep invitation URLs as they are (they're intermediate URLs)
                const inviteMatch = urlObj.pathname.match(/\/event_invite\/([^/]+)/);
                if (inviteMatch) {
                    const inviteId = inviteMatch[1];
                    return `https://www.facebook.com/event_invite/${inviteId}/`;
                }
            }
            
            // If not a Facebook URL or no event ID found, return original URL
            return url.trim();
        } catch (error) {
            // If URL parsing fails, return original
            console.warn('URL parsing failed:', error.message);
            return url.trim();
        }
    }
    
    const testCases = [
        {
            input: 'https://www.facebook.com/event_invite/63dcq5QR4/',
            expected: 'https://www.facebook.com/event_invite/63dcq5QR4/',
            name: 'URL d\'invitation propre'
        },
        {
            input: 'https://www.facebook.com/events/1413467193091635/?acontext=%7B%22ref%22%3A%2252%22%7D',
            expected: 'https://www.facebook.com/events/1413467193091635/',
            name: 'URL d\'événement avec paramètres'
        }
    ];
    
    testCases.forEach((testCase, index) => {
        const result = cleanFacebookUrl(testCase.input);
        const passed = result === testCase.expected;
        
        console.log(`${index + 1}. ${testCase.name} ${passed ? '✅' : '❌'}`);
        console.log(`   Input:    ${testCase.input}`);
        console.log(`   Expected: ${testCase.expected}`);
        console.log(`   Got:      ${result}`);
        console.log('');
    });
}

// Exécution
testFacebookResolver()
    .then(success => {
        if (success) {
            testCleanFacebookUrl();
        }
    })
    .catch(error => {
        console.error('Erreur lors du test:', error);
    });
