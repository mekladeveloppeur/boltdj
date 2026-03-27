# 🚀 BoltDj — Plateforme de livraison de nourriture Djibouti

Application complète de commande et livraison de nourriture — style Swiggy/Zomato.

## ✅ Stack technique
- **Backend** : Node.js 22 (zéro dépendance npm — SQLite et crypto intégrés)
- **Base de données** : SQLite (fichier `backend/data/boltdj.db`)
- **Auth** : JWT maison (HMAC-SHA256) + PBKDF2 pour les mots de passe
- **Frontends** : HTML/CSS/JS vanilla (3 interfaces séparées)

## 🏗️ Structure
```
boltdj/
├── backend/
│   ├── src/
│   │   ├── index.js          ← Serveur HTTP (routeur maison)
│   │   ├── config/
│   │   │   ├── database.js   ← SQLite Node 22 natif
│   │   │   ├── crypto.js     ← JWT + hash (zéro deps)
│   │   │   └── seed.js       ← Données de démo
│   │   ├── middleware/
│   │   │   └── auth.js       ← Vérification JWT + rôles
│   │   └── routes/
│   │       ├── admin.js      ← API admin (CRUD restaurants, stats)
│   │       ├── restaurant.js ← API partenaire (menu, commandes)
│   │       ├── client.js     ← API client (OTP, commandes, adresses)
│   │       └── public.js     ← API publique (liste restaurants)
│   ├── data/
│   │   └── boltdj.db         ← Base SQLite (créée auto)
│   └── .env
└── frontend/
    ├── admin/index.html      ← Dashboard Admin
    ├── restaurant/index.html ← Dashboard Restaurant
    └── client/index.html     ← App Client
```

## 🚀 Démarrer
```bash
# Première fois — réinitialiser la base
./reset-db.sh

# Démarrer le serveur
./start.sh
# ou
node --experimental-sqlite backend/src/index.js
```

## 🌐 URLs
| Interface | URL | Identifiants |
|-----------|-----|-------------|
| Page d'accueil | http://localhost:4000 | — |
| Admin | http://localhost:4000/admin | admin@boltdj.dj / Admin2026! |
| Restaurant | http://localhost:4000/restaurant | REST001 / Restaurant2026! |
| Client | http://localhost:4000/client | +25377112233 → OTP: 1234 |
| API REST | http://localhost:4000/api | — |

## 📡 API Endpoints

### Public (sans auth)
| Méthode | Endpoint | Description |
|---------|---------|-------------|
| GET | /api/restaurants | Liste des restaurants actifs |
| GET | /api/restaurants/:id | Détail + menu complet |
| GET | /api/categories | Catégories disponibles |

### Admin (Bearer token admin)
| Méthode | Endpoint | Description |
|---------|---------|-------------|
| POST | /api/admin/login | Connexion admin |
| GET | /api/admin/stats | Statistiques globales |
| GET | /api/admin/restaurants | Tous les restaurants |
| POST | /api/admin/restaurants | Créer un restaurant |
| PATCH | /api/admin/restaurants/:id/status | Valider/Suspendre |
| GET | /api/admin/orders | Toutes les commandes |
| GET | /api/admin/clients | Tous les clients |
| GET | /api/admin/livreurs | Tous les livreurs |
| POST | /api/admin/livreurs | Ajouter un livreur |

### Restaurant (Bearer token restaurant)
| Méthode | Endpoint | Description |
|---------|---------|-------------|
| POST | /api/restaurant/login | Connexion restaurant |
| GET | /api/restaurant/me | Profil restaurant |
| PATCH | /api/restaurant/me | Modifier profil |
| PATCH | /api/restaurant/toggle-open | Ouvrir/Fermer |
| GET | /api/restaurant/menu | Menu complet |
| POST | /api/restaurant/menu/categories | Nouvelle catégorie |
| POST | /api/restaurant/menu/items | Nouveau plat |
| PATCH | /api/restaurant/menu/items/:id | Modifier/Dispo plat |
| DELETE | /api/restaurant/menu/items/:id | Supprimer plat |
| GET | /api/restaurant/orders | Commandes reçues |
| PATCH | /api/restaurant/orders/:id/status | Accepter/Préparer/Prêt |
| GET | /api/restaurant/stats | Statistiques |

### Client (Bearer token client)
| Méthode | Endpoint | Description |
|---------|---------|-------------|
| POST | /api/client/request-otp | Demander SMS OTP |
| POST | /api/client/verify-otp | Vérifier OTP → token |
| GET | /api/client/profile | Profil + adresses |
| PATCH | /api/client/profile | Modifier profil |
| POST | /api/client/addresses | Ajouter adresse |
| DELETE | /api/client/addresses/:id | Supprimer adresse |
| GET | /api/client/orders | Historique commandes |
| POST | /api/client/orders | Passer une commande |

## 🔧 Configuration (.env)
```env
PORT=4000
JWT_SECRET=changer_en_production
DB_PATH=./data/boltdj.db
NODE_ENV=development

# SMS — décommenter pour la production
# SMS_PROVIDER=twilio
# TWILIO_ACCOUNT_SID=ACxxxxxxx
# TWILIO_AUTH_TOKEN=xxxxxxx
# TWILIO_FROM=+1234567890
```

## 📱 SMS en production
En mode DEV, l'OTP est toujours `1234` et affiché en console.
Pour la production, brancher **Africa's Talking** (recommandé pour Djibouti) ou **Twilio** :

```javascript
// Dans backend/src/routes/client.js, remplacer sendOtp() par :
const Africastalking = require('africastalking');
const sms = Africastalking({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME }).SMS;
await sms.send({ to: [phone], message: `BoltDj - Code: ${otp}` });
```

## 🗄️ Base de données
Tables : `admins`, `restaurants`, `menu_categories`, `menu_items`, `clients`, `addresses`, `orders`, `order_items`, `livreurs`

```bash
# Accès direct à la DB
sqlite3 backend/data/boltdj.db
.tables
SELECT name, status FROM restaurants;
SELECT order_number, total, status FROM orders;
```

## 🚀 Passer en production
1. Changer `JWT_SECRET` dans `.env`
2. Brancher un vrai fournisseur SMS
3. Mettre `NODE_ENV=production` (masque les OTP en clair)
4. Déployer sur VPS (Ubuntu) avec `pm2 start start.sh`
5. Configurer Nginx en reverse proxy sur le port 4000
6. Activer HTTPS avec Certbot/Let's Encrypt
