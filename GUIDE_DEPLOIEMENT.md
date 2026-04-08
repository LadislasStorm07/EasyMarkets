# 🚀 Guide de mise en ligne — FreshMart

## Architecture finale
```
Navigateur (HTML/JS) ──▶ Supabase (PostgreSQL) ──▶ Données réelles
      │
      └─▶ Netlify / GitHub Pages (hébergement gratuit)
```

---

## ÉTAPE 1 — Créer la base de données Supabase

### 1.1 Créer un compte
1. Aller sur **https://supabase.com**
2. Cliquer **"Start your project"** → se connecter avec GitHub
3. Cliquer **"New project"**
   - Name : `freshmart`
   - Database Password : choisir un mot de passe fort (le noter !)
   - Region : choisir **West EU (Ireland)** ou le plus proche
4. Attendre 2 minutes que le projet se crée

### 1.2 Exécuter le schéma SQL
1. Dans le menu gauche → **SQL Editor**
2. Cliquer **"New query"**
3. Copier-coller le contenu de `supabase_schema.sql`
4. Cliquer **"Run"** (▶️)
5. Vérifier : le message "Success" doit apparaître

### 1.3 Récupérer les clés API
1. Menu gauche → **Settings** → **API**
2. Copier :
   - **Project URL** → ressemble à `https://abcdefgh.supabase.co`
   - **anon public key** → longue chaîne commençant par `eyJ...`

---

## ÉTAPE 2 — Configurer les fichiers

### 2.1 Ouvrir `api.js` et remplacer :
```javascript
var SUPABASE_URL = 'https://VOTRE_PROJECT_ID.supabase.co';
var SUPABASE_KEY = 'VOTRE_ANON_KEY';
```
Par vos vraies valeurs :
```javascript
var SUPABASE_URL = 'https://abcdefgh.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 2.2 Ajouter `api.js` dans chaque fichier HTML
En haut de chaque fichier, **avant tout autre script** :
```html
<head>
  ...
  <script src="api.js"></script>  ← AJOUTER ICI
  <script src="https://cdnjs.cloudflare.com/...jspdf..."></script>
  ...
</head>
```

Fichiers à modifier : `0-portail.html`, `1-superadmin.html`, `2-vendeur.html`, `3-client.html`

---

## ÉTAPE 3 — Héberger le site (gratuit)

### Option A : Netlify (recommandé — le plus simple)
1. Aller sur **https://netlify.com** → créer un compte gratuit
2. Glisser-déposer votre dossier FreshMart sur la page d'accueil
3. Netlify génère une URL type `https://freshmart-xxx.netlify.app`
4. **C'est tout !**

Pour un domaine personnalisé (ex: freshmart.bj) :
- Netlify → Site settings → Domain management → Add custom domain

### Option B : GitHub Pages (aussi gratuit)
1. Créer un compte sur **https://github.com**
2. Nouveau dépôt → uploader tous les fichiers
3. Settings → Pages → Source : main branch
4. URL générée : `https://votre-nom.github.io/freshmart`

### Option C : Serveur VPS (pour la production)
Si vous voulez votre propre serveur :
- **Hostinger** : ~2€/mois, supporte les fichiers statiques
- **DigitalOcean** : ~4$/mois
- Uploader les fichiers via FTP/FileZilla

---

## ÉTAPE 4 — Vérifier que tout fonctionne

### Test rapide
1. Ouvrir `0-portail.html` depuis l'URL en ligne
2. Se connecter comme **Vendeur** : `admin@freshmart.com` / `admin123`
3. Ajouter un produit → vérifier dans Supabase : **Table Editor → products**
4. Se connecter comme **Client**, passer une commande
5. Retour Vendeur → onglet Commandes → statut devrait se mettre à jour en temps réel

### Console Supabase — vérifier les données
- **Table Editor** → voir les données en temps réel dans chaque table
- **Logs** → voir les requêtes API en direct

---

## ÉTAPE 5 — Sécurité en production

### 5.1 Mots de passe hashés
Pour l'instant les mots de passe sont en clair dans la base.
Pour la production, utiliser une **Edge Function Supabase** :

```javascript
// Supabase Edge Function (optionnel)
import { hash, compare } from 'https://deno.land/x/bcrypt/mod.ts'
// hash le mot de passe avant insertion
```

### 5.2 Variables d'environnement
Ne pas laisser la clé Supabase en dur si le code est public sur GitHub.
Utiliser Netlify → Site settings → Environment variables :
```
SUPABASE_URL = https://abcdefgh.supabase.co
SUPABASE_KEY = eyJ...
```

### 5.3 Restreindre les politiques RLS
Dans Supabase → Authentication → Policies, vous pouvez affiner :
- Les clients ne voient que **leurs propres** commandes
- Les vendeurs ne voient que les produits de **leur boutique**

---

## Structure des fichiers à uploader

```
freshmart/
├── 0-portail.html      ← Page d'accueil / sélection rôle
├── 1-superadmin.html   ← Dashboard Super Admin
├── 2-vendeur.html      ← Dashboard Vendeur
├── 3-client.html       ← Site client
├── api.js              ← Couche base de données Supabase ⭐
├── db.js               ← Couche IndexedDB (optionnel)
└── supabase_schema.sql ← Script SQL (déjà exécuté, garder pour backup)
```

---

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Super Admin | superadmin@freshmart.com | super123 |
| Vendeur | admin@freshmart.com | admin123 |
| Client | (créer un compte depuis le portail) | — |
| Code secret SA | — | 20042004 |

---

## Fonctionnement hors-ligne

Si Supabase est inaccessible (pas d'internet), l'application bascule automatiquement
sur le **cache localStorage**. Les données seront synchronisées à la reconnexion.

---

## Support Supabase

- Documentation : https://supabase.com/docs
- Discord communauté : https://discord.supabase.com
- Plan gratuit : 500 Mo DB, 5 Go bandwidth, 2 projets

---

*Guide généré pour FreshMart — Plateforme épicerie connectée*
yahode2004ladislas