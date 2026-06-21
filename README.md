# Andrea Simonet-Davin - Site professionnel

Site web professionnel pour Andrea Simonet-Davin, psychologue a Canet-en-Roussillon.

## Architecture

- **Frontend** : [Astro](https://astro.build/) - site statique genere a partir des donnees Directus
- **Backend** : [Directus](https://directus.io/) - CMS headless avec API REST, deploye via Docker

## Prerequis

- [Docker](https://www.docker.com/) et Docker Compose
- [Node.js](https://nodejs.org/) (v18+)
- npm

## Demarrage rapide

### 1. Lancer Directus (backend)

```bash
cd backend
docker compose up -d
```

Le panneau d'administration Directus est accessible a l'adresse :
**http://localhost:8055**

Identifiants par defaut :
- Email : `andrea@simonetdavin.fr`
- Mot de passe : `changeme123`

### 2. Peupler la base de donnees (seed)

Une fois Directus demarre et pret (attendre quelques secondes au premier lancement) :

```bash
cd backend/seed
npm install
node seed.js
```

Ce script cree toutes les collections, configure les permissions publiques et insere les donnees du site.

### 3. Lancer le frontend (Astro)

```bash
cd frontend
npm install
npm run dev
```

Le site de developpement est accessible a l'adresse :
**http://localhost:4321**

### 4. Build de production

```bash
cd frontend
npm run build
```

Les fichiers statiques sont generes dans `frontend/dist/`.

## URLs utiles

| Service            | URL                     |
|--------------------|-------------------------|
| Frontend (dev)     | http://localhost:4321    |
| Directus (admin)   | http://localhost:8055    |
| API REST Directus  | http://localhost:8055/items/ |

## Structure du projet

```
Andrea/
  backend/
    docker-compose.yml    # Configuration Docker pour Directus
    .env                  # Variables d'environnement (non versionne)
    database/             # Base de donnees SQLite (non versionnee)
    uploads/              # Fichiers uploades (non versionnes)
    snapshots/            # Snapshots Directus
    seed/
      seed.js             # Script de peuplement de la base
      package.json
  frontend/
    ...                   # Application Astro
```
