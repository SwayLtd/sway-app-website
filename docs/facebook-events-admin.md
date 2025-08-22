# Page d'import d'événements Facebook

## Description
Cette page permet d'ajouter facilement des événements Facebook à la file d'import sans avoir besoin de permissions spécifiques. Elle est accessible via `/admin/facebook-events`.

## Fonctionnalités

### 1. Formulaire d'ajout
- **Champ URL**: Permet de saisir l'URL complète d'un événement Facebook
- **Priorité**: Sélection de la priorité (0 = Normal, 1 = Élevée, 2 = Très élevée)
- **Validation**: Vérification automatique du format de l'URL Facebook
- **Protection**: Empêche l'ajout d'URLs en double

### 2. Affichage des imports récents
- Liste des 10 derniers imports
- Statuts en temps réel (En attente, En cours, Terminé, Échoué)
- Possibilité d'actualiser la liste

### 3. API Endpoint
- `POST /api/admin/facebook-events`
- Accepte: `{ facebook_url: string, priority?: number }`
- Retourne: `{ success: boolean, data: object, message: string }`

## Formats d'URL acceptés
- `https://www.facebook.com/events/123456789`
- `https://facebook.com/events/123456789` 
- `https://fb.me/events/123456789`

## Statuts des imports
- **pending**: En attente de traitement
- **processing**: En cours de traitement
- **completed**: Traitement terminé avec succès
- **failed**: Traitement échoué

## Sécurité
- Aucune contrainte de permissions (comme demandé)
- Validation côté serveur des URLs
- Protection contre les doublons
- Utilisation du service role Supabase pour bypasser RLS

## Utilisation
1. Accédez à `/admin/facebook-events`
2. Collez l'URL de l'événement Facebook
3. Sélectionnez la priorité si nécessaire
4. Cliquez sur "Ajouter à la file d'import"
5. L'événement sera ajouté et visible dans la liste des imports récents
