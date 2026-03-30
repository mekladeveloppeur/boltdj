# 🚀 Déployer BoltDj sur Railway (gratuit)

## Étape 1 — Préparer GitHub (5 min)

1. Créer un compte sur **github.com** (gratuit)
2. Installer Git : https://git-scm.com/downloads
3. Ouvrir un terminal dans le dossier `boltdj/backend/` :

```bash
cd boltdj/backend
git init
git add .
git commit -m "BoltDj initial"
```

4. Sur GitHub → New repository → Nom : `boltdj` → Create
5. Copier les commandes affichées (push existing repository) et les exécuter

---

## Étape 2 — Déployer sur Railway (5 min)

1. Aller sur **railway.app** → Se connecter avec GitHub
2. Cliquer **"New Project"** → **"Deploy from GitHub repo"**
3. Sélectionner votre repo `boltdj`
4. Railway détecte Node.js automatiquement → cliquer **Deploy**

---

## Étape 3 — Variables d'environnement

Dans Railway → votre projet → **Variables** → ajouter :

| Variable | Valeur |
|----------|--------|
| `JWT_SECRET` | `boltdj_prod_secret_2026_changez_moi` |
| `NODE_ENV` | `production` |
| `PORT` | `4000` (Railway le set auto) |

---

## Étape 4 — Domaine public

Dans Railway → **Settings** → **Domains** → **Generate Domain**

Vous obtenez une URL comme : `boltdj-production.up.railway.app`

---

## Vos 4 interfaces en ligne :

| Interface | URL |
|-----------|-----|
| 🏠 Accueil | `https://votre-app.up.railway.app` |
| 🔐 Admin | `https://votre-app.up.railway.app/admin` |
| 🏪 Restaurant | `https://votre-app.up.railway.app/restaurant` |
| 📱 Client | `https://votre-app.up.railway.app/client` |
| 🛵 Livreur | `https://votre-app.up.railway.app/livreur` |

---

## ⚠️ Notes importantes

- **Base de données** : SQLite stocke les données dans le container Railway. Pour persister entre redéploiements, utiliser Railway Volumes (plan payant) ou migrer vers PostgreSQL.
- **SMS en production** : remplacer l'OTP `1234` par un vrai service SMS dans `backend/src/routes/client.js` et `livreur.js`
- **Sécurité** : changer `JWT_SECRET` et les mots de passe par défaut avant de partager les URLs

---

## Plan Railway gratuit
- ✅ 500 heures/mois de compute (suffisant pour tester)
- ✅ 1 GB RAM, 1 GB disk
- ❌ Pas de volumes persistants (données perdues au redéploiement)
→ Pour la production : Railway Starter ($5/mois) avec volumes

## Alternative gratuite : Render.com
1. render.com → New Web Service → Connect GitHub
2. Build Command : `echo "no build"`
3. Start Command : `node --experimental-sqlite src/index.js`
4. Ajouter les mêmes variables d'environnement
