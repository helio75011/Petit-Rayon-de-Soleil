# Dossier de projet — Titre professionnel CDA
## « Petit Rayon de Soleil » — application web de messages bienveillants

> **Squelette conforme au RE CDA (millésime 04, JO 13/05/2023), structure narrative
> inspirée d'un dossier CDA validé (par couche technique).**
> Mono-projet : « Petit Rayon de Soleil » porte à lui seul les 8 compétences obligatoires.
> Cible : **40 à 60 pages** hors page de garde/sommaire/annexes. **Annexes : 40 p. max.**
>
> Légende : 📌 à rédiger · 🖼️ artefact à insérer · 💻 matière dans ton code ·
> ⚠️ à créer (absent) · 🇬🇧 trace d'anglais (compétence transversale).

---

## Page de garde  *(hors décompte)*
Nom, prénom, titre visé, date, éventuellement un visuel. Modalité : Parcours de formation.

## Sommaire  *(hors décompte)*
Paginé, généré à la fin.

---

# 1. À propos de moi
📌 Court paragraphe de présentation (parcours, objectifs).
🇬🇧 **Astuce du dossier de référence : rédige cette section EN ANGLAIS.** Elle alimente
directement la compétence transversale « Communiquer en français et en anglais » (niveau B1).

# 2. Contexte de la formation / entreprise
📌 Présente le centre de formation (projet réalisé en formation).
Si tu rattaches à un stage/entreprise : présentation + ton rôle.

# 3. Compétences couvertes
📌 Liste à puces des compétences du REAC couvertes par le projet. Les 8 obligatoires :
- Analyser les besoins et **maquetter** une application
- Définir l'**architecture logicielle**
- Concevoir et mettre en place une **base de données relationnelle**
- Développer des composants **d'accès aux données SQL et NoSQL**
- Développer des **interfaces utilisateur**
- Développer des **composants métier**
- Contribuer à la **gestion d'un projet informatique**
- Préparer et exécuter les **plans de tests**

---

# 4. Projet « Petit Rayon de Soleil »

## 4.1 Contexte et expression des besoins
📌 Projet en formation → tu **formules toi-même** l'expression des besoins.
- **But** : diffuser des messages bienveillants, avec modération communautaire.
- **Acteurs / rôles** (💻 confirmés par le code) :
  - *Visiteur* : voit les messages, le message aléatoire.
  - *Utilisateur inscrit* : favoris, propose un message, gère/supprime son compte.
  - *Administrateur* : modère les propositions (approuve / rejette).
- 📌 **Priorisation MoSCoW** (comme le dossier de référence) :
  - *Must* : inscription/connexion, afficher messages, proposer, modérer.
  - *Should* : favoris, gestion du compte, suppression RGPD.
  - *Could* : message aléatoire, recherche/filtre.
  - *Won't* : notifications, rôles avancés.
- 🖼️ **Diagramme de cas d'utilisation** (3 acteurs). ⚠️ à créer.

## 4.2 Gestion de projet  ⚠️
📌 Méthode (agile/cycle en V — justifier pour un projet solo), outil de suivi (Trello/GitHub Projects).
🖼️ Planning (Gantt ou tableau des tâches). 💻 Le versionnement Git existe déjà (`git log`).
📌 Objectifs de qualité : conventions de nommage, commentaires, critères "done".

## 4.3 Environnement de développement
📌 Stack et **justification** de chaque choix :
- **Node.js + Express** (serveur/API REST) · **SQLite natif `node:sqlite`** (BDD) ·
  **bcryptjs** (hachage) · **HTML/CSS/JS vanilla** (front) · **`node:test`** (tests).
💻 Base : `package.json`, `README.md`.
🖼️ Capture de l'IDE (VS Code) et du dépôt GitHub.
⚠️ **À corriger avant impression** : le commentaire de `db.js` (ligne 5) dit « better-sqlite3 »
alors que le code utilise `node:sqlite` (ligne 13). Incohérence visible.

## 4.4 Maquettage  ⚠️
📌 Étape clé, obligatoire. Explique la démarche (charte graphique → wireframes → maquettes).
🖼️ **Wireframes** puis **maquettes** (Figma) des écrans : Accueil, Connexion/Inscription,
Liste des messages, Favoris, Espace admin, Mon compte — **formats mobile ET desktop**.
🖼️ **Schéma d'enchaînement** des écrans.

## 4.5 Conception et modélisation de la base de données
📌 Ordre logique **MCD → MLD → MPD** (le dossier de référence les inverse — ne fais pas ça).
🖼️ **MCD** : entités `users`, `messages`, `favoris`, `sessions` + cardinalités.
🖼️ **MLD** : entités et clés étrangères.
🖼️ **MPD** : 💻 déduit de `db.js` (types, PK, FK, `ON DELETE CASCADE/SET NULL`).
💻 **Script de création** : le `CREATE TABLE` de `db.js` (lignes 32-66).
📌 Points forts à valoriser : `PRAGMA foreign_keys = ON`, table de liaison N,N `favoris`,
choix de **ne pas dénormaliser** (FK `propose_par` + jointure).

## 4.6 Front-End (Interfaces utilisateur)
📌 Démarche : structure `public/`, navbar/footer, dynamisme JS.
💻 Extraits significatifs de `public/app.js` + captures d'écran des IHM.
📌 Valoriser : **responsive** (media-queries), **accessibilité** (ARIA `aria-live`,
`aria-label`, focus visible, contraste), **anti-XSS** via `textContent`.
🖼️ Aperçus mobile ET desktop.

## 4.7 Back-End (Composants métier + accès aux données)
📌 Reprends la pédagogie du dossier de référence : **explique chaque étape**.
- **Connexion BDD** : 💻 `db.js` (ouverture SQLite, PRAGMA).
- **Le CRUD**, illustré sur des fonctionnalités concrètes :
  - **Create** : `POST /api/messages` (proposition, 💻 `server.js` 116-128) ou favori.
  - **Read** : `GET /api/favoris` avec JOIN (💻 `server.js` 135-146).
  - **Update** : `PUT /api/me` (💻 `server.js` 78-83).
  - **Delete** : `DELETE /api/me` (RGPD, cascade — 💻 `server.js` 87-90).
📌 Insister sur les **requêtes paramétrées** (`?`) → anti-injection SQL (💻 partout).
💻 Montrer un **middleware** (`requireAuth`/`requireAdmin`, `auth.js`) comme composant réutilisable.
🇬🇧 Montrer un extrait **commenté en anglais**.

## 4.8 Architecture logicielle  ⚠️
🖼️ **Schéma d'architecture multicouche** (à créer et à situer ici ou en 4.5) :
- **Présentation** : `public/` (navigateur).
- **Contrôleur / métier** : `server.js` (routes) + `auth.js` (middlewares).
- **Accès aux données** : `db.js`.
- **Persistance** : SQLite (`soleil.db`).
📌 Justifie la séparation des responsabilités et la **stratégie de sécurité par couche**
(validation serveur, hachage, tokens, contrôle d'accès par rôle).

## 4.9 Sécurité
📌 **Montre le code, n'affirme pas** (c'est là que tu dépasses le dossier de référence) :
- Mots de passe **hachés bcrypt** (💻 `auth.js` 20-27).
- **Tokens de session** aléatoires (💻 `auth.js` `genToken`).
- Login **générique** (n'indique pas si l'email existe — 💻 `server.js` 54).
- **Anti-injection** : requêtes paramétrées (💻 partout).
- **Anti-XSS** : `textContent` côté front.
- **Contrôle d'accès** par rôle (💻 middlewares).
- **RGPD** : effacement total du compte (💻 `DELETE /api/me`).
📌 Mappe 2-3 items du **Top 10 OWASP** avec ta parade dans le code.
⚠️ Cite honnêtement les limites (sessions sans expiration, pas de rate-limiting) → axes d'amélioration.

## 4.10 Tests
📌 Stratégie de tests + résultats.
💻 `tests/api.test.js` (module natif `node:test`) : 7 tests — nominal, 401/403/404,
parcours complet proposition→approbation, RGPD.
🖼️ Capture du `npm test` au vert.
📌 **Jeu d'essai de la fonctionnalité la plus représentative** (recommandé : proposition→approbation) :
tableau **entrée / attendu / obtenu / écart** (💻 base : test lignes 96-127).
⚠️ Idéal : ajouter un **test de sécurité** explicite (tentative d'injection rejetée).

## 4.11 Déploiement
📌 Décris la procédure (même si local) : prérequis (Node 22+), `npm install`, `init-db`, `start`.
⚠️ Pour valoriser le volet moderne du référentiel : ajouter un **`Dockerfile`** + un
**pipeline CI** (GitHub Actions lançant `npm test`). Optionnel mais fort.
📌 Si tu héberges : hébergeur, transfert, mentions légales/RGPD.

---

# 5. Veille technologique et de sécurité
📌 Décris ta **démarche de veille** pendant le projet (pas juste des noms de sites) :
- Sources (OWASP, ANSSI, bulletins Node.js, MDN…). 🇬🇧 au moins une source anglophone.
- Une vulnérabilité identifiée + la **parade appliquée** dans ton code.

# 6. Conclusion
📌 Bilan des compétences, satisfactions, difficultés, axes d'amélioration
(NoSQL, sessions expirables, HTTPS, conteneurisation/CI, framework front).

---

# Annexes  *(40 pages max — fonctionnalité la plus représentative)*
- Maquettes des interfaces.
- Captures d'écran + code correspondant.
- Code des composants métier significatifs.
- Code des composants d'accès aux données.
- Code des autres composants (middlewares, utilitaires).

---

## ⚠️ Points à traiter en marge du dossier
1. **NoSQL** — seul manque « dur ». Ajouter une brique (Redis/Mongo pour cache, logs ou sessions)
   pour compléter « SQL **et** NoSQL », ou savoir en parler à l'oral.
2. **Mobile** — NON obligatoire dans le dossier. Le dossier de référence l'a ajouté via un 2e projet ;
   en mono-projet tu peux t'en passer, mais prépare une réponse à l'oral.
3. **Cohérence code** — corriger le commentaire « better-sqlite3 » et documenter/limiter les sessions.
4. **Orthographe** — le RE évalue la qualité rédactionnelle. Relire (le dossier de référence en pâtit).
