# CLAUDE.md

Dossier de **révision pour la soutenance du titre professionnel CDA** (Concepteur Développeur d'Applications) de Hélio de Breyne. Ce n'est pas un dépôt de code : c'est un ensemble de **supports de révision et d'annexes** portant sur un projet réalisé, « Petit Rayon de Soleil ».

## Le projet documenté : « Petit Rayon de Soleil »

Application web de partage de messages bienveillants (lire, proposer, mettre en favori, modérer).

| Aspect | Choix |
|---|---|
| Back | Node.js + Express |
| Base | SQLite en local (`soleil.db`) · Turso / libSQL (`@libsql/client`) en prod |
| Front | HTML / CSS / JS natifs, ~15 Ko, sans framework ni bundler |
| Auth | bcryptjs + tokens de session en base, middlewares `requireAuth` / `requireAdmin` |
| Tests | module natif `node:test` (aucune dépendance de test) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Déploiement | Vercel serverless (`api/index.js`, `vercel.json`) |

Fichiers du projet cités dans les annexes : `server.js`, `auth.js`, `db.js`, `api/index.js`, `vercel.json`, `scripts/reset-db.js`, `tests/auth.unit.test.js`, `tests/api.test.js`.

Rôles : `user` et `admin`. Statuts de message : `approved`, `pending`, `rejected`.

## Contenu de [support/](support/)

### Annexes HTML (12 fiches autonomes)

Chaque fiche est un fichier HTML **autonome** (CSS inline dans `<style>`, aucune ressource externe), en français, thème clair/sombre, structure identique : bandeau `.eyebrow` → `h1` → sous-titre → `.meta` → sections numérotées.

| Fichier | Sujet |
|---|---|
| [matrice-moscow.html](support/matrice-moscow.html) | Priorisation MoSCoW, chaque exigence reliée à un endpoint réel |
| [extraits-de-code.html](support/extraits-de-code.html) | 6 extraits commentés (auth, RBAC, SQL paramétré, RGPD, favoris) |
| [cas-exception.html](support/cas-exception.html) | 7 cas d'exception, validation côté serveur, codes HTTP 400/401/403/409/500 |
| [plan-de-tests.html](support/plan-de-tests.html) | 4 niveaux de test (unitaire, intégration, système, acceptation) |
| [jeu-d-essai.html](support/jeu-d-essai.html) | Jeu de données de test + restauration `npm run db:reset` |
| [qualite-code.html](support/qualite-code.html) | ESLint, Prettier, conventions de nommage, commits, revue |
| [environnements.html](support/environnements.html) | dev / test / prod — un seul code, trois configurations |
| [ci-cd.html](support/ci-cd.html) | Pipeline GitHub Actions : automatisé / manuel / à venir |
| [deploiement-vercel.html](support/deploiement-vercel.html) | Mise en ligne Vercel + Turso pas à pas |
| [scripts-de-deploiement.html](support/scripts-de-deploiement.html) | Scripts npm, du clonage au redéploiement |
| [veille.html](support/veille.html) | Veille techno + sécurité (OWASP, Dependabot, `npm audit`) |
| [eco-conception.html](support/eco-conception.html) | 6 leviers de sobriété numérique |

### Diagrammes (PNG)

[MCD](support/MCD.png) · [MLD](support/MLD.png) · [MPD](support/MPD.png) · [cas d'utilisation](support/Diagramme-de-cas-d'utilisation.png) · [séquence](support/diagram-de-sequence.png) · [espace multicouche](support/espace-multicouche.png) · [espace utilisateur](support/espace-utilisateur.png) · [capture de tests terminal](support/Capture-test-terminal.PNG)

### PDF

- `Dossier_professionnel_Helio_DE_BREYNE-CDA.pdf` — dossier professionnel
- `dossier_projet_petit_rayon_de_soleil.pdf` — dossier de projet
- `presentation_petit_rayon_de_soleil_soutenance.pdf`, `presentation_cda_conception_deploiement.pdf` — supports de présentation
- `notes_orales_petit_rayon_de_soleil.pdf`, `fiches_orales_conception_deploiement_ci_cd.pdf` — notes d'oral

## Commandes du projet (référencées, non exécutables ici)

```bash
npm run setup      # install + init-db
npm run init-db    # crée les tables + seed
npm run db:reset   # supprime, recrée, seed, vérifie (4 étapes)
npm test           # node --test
npm run lint       # ESLint
npm run format     # Prettier (format:check pour vérifier)
npm run deploy     # vercel --prod (hook predeploy = npm test)
```

Le code source du projet n'est **pas** dans ce dossier : ces commandes ne peuvent pas être lancées ici.

## Conventions du projet (à respecter dans tout exemple de code)

- `camelCase` pour variables/fonctions, `UPPER_CASE` pour constantes globales
- `snake_case` pour tables et colonnes SQL (`password_hash`, `message_id`)
- Routes REST en minuscules, préfixe `/api/`, pluriel (`/api/messages`, `/api/favoris`)
- Fichiers en minuscules, rôle explicite (`reset-db.js`, `*.test.js`)
- Argument inutilisé préfixé `_` (`_next`)
- Métier et messages en **français**, termes techniques en anglais (`token`, `hash`, `status`)

## Travailler sur ce dossier

- **Langue : tout est en français**, y compris les titres, commentaires et messages d'erreur cités.
- **Cohérence factuelle avant tout.** Ces fiches sont présentées à un jury : chaque chiffre doit correspondre au code réel. Ne jamais inventer un chiffre, un numéro de ligne ou une sortie de terminal.
- **En modifiant une fiche HTML**, respecter la charte existante : variables CSS `--ground/--panel/--ink/--accent`, gestion `prefers-color-scheme` **et** `:root[data-theme]`, sections numérotées, pied de page récapitulatif. Ne pas introduire de dépendance externe (police, CDN, script) : les fiches doivent rester autonomes.
- **Un chiffre modifié doit l'être partout.** Le nombre de tests, de dépendances ou de messages apparaît dans plusieurs fiches à la fois.

## ⚠️ Valeurs de référence (arbitrées)

Le dossier contient des écarts de version entre documents. Les valeurs ci-dessous ont été arbitrées par croisement des 26 fichiers — analyse détaillée dans [ANALYSE-COMPLETE.md](ANALYSE-COMPLETE.md). **Toujours utiliser ces valeurs**, jamais celles des fiches non corrigées :

| Donnée | Valeur retenue | Source d'autorité |
|---|---|---|
| Nombre de tests | **15** ⚠️ non prouvé | Dossier Professionnel (signé) |
| Schéma messages | **`approved`** booléen, `DEFAULT 0` | MCD + MLD + MPD + séquence |
| Dépendances runtime | **3** (express, bcryptjs, @libsql/client) | veille + dossier projet |
| ESLint/Prettier en CI | **oui** (YAML de ci-cd périmé) | Dossier Professionnel (signé) |
| Jeu d'essai | **3 comptes**, 5 approved + 2 pending + 1 rejected, 2 favoris | Dossier Professionnel (signé) |
| Moteur SQLite | **`@libsql/client`** (async) | dossier projet §14.3 |
| Table favoris | **`favoris`** (pas `favorites`) | MLD + MPD |

**Ordre d'autorité des sources** : Dossier Professionnel (signé sur l'honneur) > MCD/MLD/MPD > dossier de projet > fiches HTML > présentations.

**Trois points restent à vérifier sur le code** (absent de ce dossier) :
1. Le total réel de `npm test` — aucune capture ne montre 15 (le PNG montre 7, plan-de-tests montre 14).
2. `approved` booléen vs `status` — un booléen ne peut pas porter les trois états (`pending`/`approved`/`rejected`) revendiqués partout.
3. Le contenu réel de `.github/workflows/ci.yml`.

**Documents contenant des sections jamais alignées sur le code** (à ne pas utiliser comme référence) : le contrat d'API du dossier de projet (§11.3 et annexe C — routes `/api/auth/*`, `/api/favorites`, `/api/account` qui n'existent pas) et ses extraits de l'annexe F (`ensureAdmin`, `sanitizeMessage`, `canBePublished` — fonctions inexistantes).
