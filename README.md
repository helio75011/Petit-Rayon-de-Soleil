# Petit Rayon de Soleil — Mini-projet CDA

Application web de messages bienveillants. Version minimaliste construite en
**JavaScript + SQL**, sans framework lourd, pour démontrer la validation de
**tous les critères du cahier des charges** de la présentation CDA.

## Stack (volontairement minimale)

| Couche | Techno | Pourquoi |
|--------|--------|----------|
| Serveur / API | Node.js + Express | JavaScript pur, simple à lire |
| Base de données | SQLite (`node:sqlite` natif) | SQL standard, **aucune installation** (un seul fichier `soleil.db`) |
| Mots de passe | bcryptjs | Hachage sécurisé |
| Front | HTML / CSS / JS vanilla | Pas de framework, accessible et responsive |
| Tests | `node:test` (natif) | Aucune dépendance de test |

## Démarrage en 3 commandes

```bash
npm install        # installe express et bcryptjs (SQLite est natif à Node)
npm run init-db    # crée et remplit la base (admin + user + messages)
npm start          # lance le serveur sur http://localhost:3000
```

Puis ouvre **http://localhost:3000** dans ton navigateur.

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@soleil.fr` | `admin123` |
| Utilisateur | `user@soleil.fr` | `user1234` |

## Lancer les tests

```bash
npm test
```

Les tests vérifient : message aléatoire, inscription/connexion, refus des
accès non autorisés, parcours proposition → approbation admin, et suppression
RGPD du compte.

---

## Couverture des critères du cahier des charges

### Exigences fonctionnelles
- ✅ **Inscription / connexion** — `POST /api/register`, `POST /api/login`
- ✅ **Gestion des infos personnelles** — `GET/PUT /api/me`
- ✅ **Afficher des messages bienveillants** — `GET /api/messages`, `/api/messages/random`
- ✅ **Mettre en favoris** — `GET/POST/DELETE /api/favoris`
- ✅ **Proposer un message** — `POST /api/messages` (`approved = 0`)
- ✅ **Approbation par un admin** — `GET /api/admin/pending`, `POST /api/admin/approve/:id`

### Exigences non fonctionnelles
- ✅ **Authentification sécurisée** — bcrypt + tokens de session
- ✅ **Protection des données (RGPD)** — `DELETE /api/me` (suppression totale), mots de passe jamais en clair
- ✅ **Anti-injection SQL** — requêtes paramétrées partout
- ✅ **Anti-XSS** — affichage via `textContent` (pas d'injection HTML)
- ✅ **Responsive** — CSS adaptatif (mobile / desktop)
- ✅ **Accessibilité** — HTML sémantique, ARIA (`aria-live`, `aria-label`), focus visible, contraste

---

## Documentation de l'API (style Swagger)

Authentification : envoyer l'en-tête `Authorization: Bearer <token>`
(le token est retourné par `/api/login` et `/api/register`).

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/register` | — | Inscription. Body : `{ name, email, password }` |
| POST | `/api/login` | — | Connexion. Body : `{ email, password }` |
| POST | `/api/logout` | user | Déconnexion |
| GET | `/api/me` | user | Mes infos |
| PUT | `/api/me` | user | Modifier mon nom. Body : `{ name }` |
| DELETE | `/api/me` | user | Supprimer mon compte (RGPD) |
| GET | `/api/messages` | — | Liste des messages approuvés |
| GET | `/api/messages/random` | — | Un message au hasard |
| POST | `/api/messages` | user | Proposer un message. Body : `{ content }` |
| GET | `/api/favoris` | user | Mes favoris |
| POST | `/api/favoris` | user | Ajouter un favori. Body : `{ message_id }` |
| DELETE | `/api/favoris/:id` | user | Retirer un favori |
| GET | `/api/admin/pending` | admin | Messages en attente |
| POST | `/api/admin/approve/:id` | admin | Approuver un message |
| DELETE | `/api/admin/reject/:id` | admin | Refuser un message |

---

## Modélisation (rappel)

Trois tables principales, fidèles au MCD/MLD de la présentation
(la dénormalisation `NameUser` a été remplacée par une vraie clé étrangère) :

- **users** : `id, name, email, password_hash, role`
- **messages** : `id, content, approved, propose_par (→ users.id)`
- **favoris** : table de liaison `(user_id, message_id)` — relation N,N

## Structure du projet

```
Projet/
├── server.js        # serveur Express + routes API
├── auth.js          # authentification (bcrypt, sessions, middlewares)
├── db.js            # connexion SQLite, schéma, données de départ
├── package.json
├── public/          # front (HTML/CSS/JS vanilla)
│   ├── index.html
│   ├── style.css
│   └── app.js
└── tests/
    └── api.test.js  # tests automatisés
```

