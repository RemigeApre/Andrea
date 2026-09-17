Ce que TOI tu dois faire
Créer un projet Google Cloud — sur console.cloud.google.com, avec ton compte Google perso. Nomme-le par ex. "andrea-site".
Activer la facturation — Google l'exige pour utiliser l'API Places, même si l'usage réel restera dans le quota gratuit vu le faible trafic du site. Il te faudra une carte bancaire (aucun prélèvement tant que tu restes sous le seuil gratuit).
Activer l'API — dans le menu API et services → Bibliothèque, cherche "Places API" et clique sur Activer.
Créer une clé API — API et services → Identifiants → Créer des identifiants → Clé API.
Restreindre la clé (fortement recommandé, sinon n'importe qui peut l'utiliser à tes frais) : dans les restrictions de la clé, limite-la à l'API "Places API" uniquement, et si possible restreins-la par adresse IP à celle du VPS.
Trouver le Place ID de son cabinet — va sur l'outil public Place ID Finder de Google, cherche "Andrea Simonet-Davin psychologue Canet-en-Roussillon" (ou l'adresse exacte), et copie l'identifiant qui commence par ChIJ....
Renseigner les deux valeurs sur le VPS, dans le fichier .env du dossier deploy/ :

GOOGLE_PLACES_API_KEY=ta_clé
GOOGLE_PLACE_ID=ChIJ...
Redéployer comme d'habitude (git pull && docker compose up -d --build frontend).
Ce que tu pourrais lui demander (optionnel, pas bloquant)
Lui envoyer le lien Google Maps trouvé à l'étape 6 pour qu'elle confirme que c'est bien la bonne fiche (il arrive qu'il existe des doublons pour un même établissement).
Lui signaler qu'elle peut répondre aux avis directement si elle gère sa fiche Google Business Profile — mais ça n'a aucun lien avec l'affichage sur le site, c'est juste une info utile pour elle.
Question de fond à trancher avec elle si tu veux être rigoureux : préfères-tu garder la clé API/facturation sur ton compte Google, ou veux-tu qu'elle la crée sur le sien pour que ce soit elle qui "possède" cette dépendance à long terme ? Pas urgent, mais plus propre si le site doit lui être remis un jour.