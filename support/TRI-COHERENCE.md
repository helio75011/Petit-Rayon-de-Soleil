# Tri des documents par cohérence

Classement des **26 documents** de `support/` selon leur conformité au **projet réel** (routes exposées, schéma de données, stack).

**Référence de tri.** Le dossier de projet n'est pas pris comme étalon : il contient lui-même deux sections décorrélées du code (contrat d'API, annexe F). L'étalon retenu est le faisceau concordant **MCD/MLD/MPD + diagramme de séquence + Dossier Professionnel signé**, qui décrit un projet unique et cohérent.

**Valeurs de référence** : routes `/api/register`, `/api/login`, `/api/messages`, `/api/admin/approve/:id`, `/api/favoris`, `/api/me` · `approved` booléen `DEFAULT 0` · `@libsql/client` async · table `favoris` · 3 dépendances runtime.

---

## 🟢 Conformes — utilisables tels quels (14)

Aucune correction nécessaire. Ces documents peuvent être montrés au jury sans réserve.

| Document | Type | Ce qu'il établit |
|---|---|---|
| [MCD.png](support/MCD.png) | Diagramme | `approved`, association N,N favoris |
| [MLD.png](support/MLD.png) | Diagramme | Tables `users`/`messages`/`sessions`/`favoris`, `propose_par` FK |
| [MPD.png](support/MPD.png) | Diagramme | `approved INTEGER DEFAULT 0`, CASCADE, SET NULL |
| [diagram-de-sequence.png](support/diagram-de-sequence.png) | Diagramme | Routes réelles + `approved = 0` → `1` |
| [Diagramme-de-cas-d'utilisation.png](support/Diagramme-de-cas-d'utilisation.png) | Diagramme | 3 acteurs, héritage visiteur → inscrit |
| [espace-utilisateur.png](support/espace-utilisateur.png) | Diagramme | Parcours complet, espaces user/admin |
| `Dossier_professionnel_...pdf` | PDF | Document signé, 3 activités-types |
| `fiches_orales_conception_deploiement_ci_cd.pdf` | PDF | Q/R, checklist, `approved = 0` |
| `notes_orales_petit_rayon_de_soleil.pdf` | PDF | Minutage 40 min, 18 diapositives |
| `presentation_cda_conception_deploiement.pdf` | PDF | UML/Merise, renvois au référentiel |
| [cas-exception.html](support/cas-exception.html) | Fiche | Code async, 7 cas, codes HTTP |
| [environnements.html](support/environnements.html) | Fiche | Bascule `db.js`, 3 environnements |
| [matrice-moscow.html](support/matrice-moscow.html) | Fiche | Routes réelles, `approved = 0` |
| [deploiement-vercel.html](support/deploiement-vercel.html) | Fiche | Migration serverless détaillée |

> ⚠️ Deux réserves mineures dans ce groupe : `deploiement-vercel` mentionne « 7 tests » (chiffre à réviser, mais le reste est juste), et `presentation_cda` place la qualité en CI (correct selon le DP, mais à confirmer sur le YAML).

---

## 🟡 Cohérents sur le fond, chiffres à rafraîchir (5)

Le contenu technique est juste. Seules des valeurs numériques ou une ligne isolée sont périmées.

| Document | À corriger | Ampleur |
|---|---|---|
| [plan-de-tests.html](support/plan-de-tests.html) | 14 → total réel + refaire la capture | 4 occurrences |
| [jeu-d-essai.html](support/jeu-d-essai.html) | `status` → `approved` (si code booléen) | ~6 occurrences |
| [qualite-code.html](support/qualite-code.html) | 15 → total réel | 3 occurrences |
| [veille.html](support/veille.html) | 15 → total réel ; retirer `node:sqlite` | 2 lignes |
| [eco-conception.html](support/eco-conception.html) | 2 → 3 dépendances | 2 occurrences |

**Note sur jeu-d-essai** : c'est le seul document dont la volumétrie (3 comptes, 8 messages) est confirmée par le Dossier Professionnel. Son problème n'est pas le jeu de données mais la notation `status`. Si le code utilise bien `approved`, la distinction pending/rejected qu'il décrit n'est pas représentable — voir la décision de conception ci-dessous.

---

## 🟠 Contradictions à trancher (2)

| Document | Problème | Décision requise |
|---|---|---|
| [ci-cd.html](support/ci-cd.html) | YAML sans ESLint/Prettier, contredit le DP signé et sa propre §2 ; schéma laissant croire au deploy-on-success | Ouvrir `ci.yml`, copier le contenu réel, reformuler la chaîne CD |
| [scripts-de-deploiement.html](support/scripts-de-deploiement.html) | « 7 tests » + sortie seed « 1 user, 5 messages » | Réviser les deux, `db:reset` absent du récap |

---

## 🔴 Non conformes — réécriture nécessaire (5)

Ces documents décrivent un projet qui ne correspond pas au code.

### 1. `dossier_projet_petit_rayon_de_soleil.pdf` — §11.3 et annexes C, F

**La correction la plus urgente du dossier**, parce que c'est le document lu par le jury avant la soutenance.

| Section | Problème |
|---|---|
| §11.3 Contrats d'API | `/api/auth/register`, `/api/auth/login`, `/api/admin/messages/:id/approve`, `/api/favorites`, `/api/account` — aucune n'existe |
| Annexe C | Idem + `/api/messages/mine` inexistante, champs `displayName`, `category`, `reason` inexistants, exemple JSON avec `"status": "pending"` |
| Annexe F | `ensureAdmin`, `sanitizeMessage`, `canBePublished` — fonctions inexistantes ; `CREATE TABLE` avec `author_id`, `status`, `moderated_by`, `validated_at`, `rejected_reason` |
| §6.1 | « Node.js 22 » vs Node 18+ / CI en Node 20 |
| §13.4 | « 7 tests passés sur 7 » |

**Le reste du dossier (§1 à §10, §12, §14, §15, annexes A, B, D, E) est bon** — le registre des risques et le journal de bord sont même des atouts. Ce sont trois sections à réécrire, pas le document entier.

### 2. `presentation_petit_rayon_de_soleil_soutenance.pdf`

Affiche **« 7/7 tests réussis » deux fois en très grand** (diapositives 12 et 15). C'est le chiffre le plus visible de toute la soutenance, et le plus ancien. À reprendre impérativement.

### 3. [extraits-de-code.html](support/extraits-de-code.html)

Version pré-migration : `.meta` annonce `node:sqlite`, le code est **synchrone** alors que les autres fiches montrent le même code en `await`. Les 6 numéros de ligne sont donc probablement faux — et vérifiables en direct par le jury.

### 4. [espace-multicouche.png](support/espace-multicouche.png)

Le bloc base indique « SQLite - soleil.db (node:sqlite) ». À régénérer avec `@libsql/client` / Turso.

### 5. [Capture-test-terminal.PNG](support/Capture-test-terminal.PNG)

Montre `tests 7 · pass 7`. C'est une **preuve d'exécution** : elle ne se corrige pas, elle se **refait** en relançant `npm test`.

---

## Synthèse chiffrée

| Statut | Nombre | Part |
|---|---|---|
| 🟢 Conformes | 14 | 54 % |
| 🟡 Chiffres à rafraîchir | 5 | 19 % |
| 🟠 À trancher | 2 | 8 % |
| 🔴 À réécrire | 5 | 19 % |

**Plus de la moitié du dossier est directement utilisable.** Les 6 diagrammes de conception, les 4 PDF de cadrage et d'oral, et 4 fiches HTML forment un socle cohérent.

Les non-conformités se concentrent sur **deux causes nettes** :
- **Le décalage temporel** (7 → 14 → 15 tests, `node:sqlite` → libSQL) touche extraits-de-code, espace-multicouche, la capture PNG, la présentation générale et les deux fiches de déploiement. Tous ces documents datent d'avant la migration serverless.
- **La rédaction en amont** touche uniquement le dossier de projet : son contrat d'API et son annexe F ont été écrits depuis le besoin, jamais réalignés sur l'implémentation.

---

## Ordre d'exécution recommandé

**Étape 0 — vérifier sur le code (30 min).** Rien ne peut être corrigé avant : total de `npm test`, schéma de `messages`, contenu de `ci.yml`, dépendances de `package.json`, routes de `server.js`.

**Étape 1 — le visible.** Contrat d'API du dossier projet (le jury le lit), puis « 7/7 » de la présentation (le jury le voit), puis nouvelle capture de tests.

**Étape 2 — le vérifiable.** `ci.yml` dans ci-cd, extraits-de-code régénéré avec les vrais numéros de ligne.

**Étape 3 — les chiffres.** Propager le total de tests dans les 7 documents concernés, corriger 2 → 3 dépendances, régénérer le diagramme multicouche.

---

## Une décision de conception, pas une correction

`approved` booléen ne peut pas porter trois états. Or le rejet tracé est revendiqué dans jeu-d-essai, la matrice MoSCoW, le dossier projet §9.2 et le cas test T06.

Ce n'est pas un écart de rédaction à harmoniser : c'est un choix à assumer.

- **Si le code a `approved`** → retirer le message rejeté du jeu d'essai, et présenter la traçabilité du rejet comme une évolution identifiée. Position honnête et défendable.
- **Si le code a `status`** → les trois modèles Merise sont obsolètes et doivent être régénérés. Plus lourd, mais le dossier gagne en richesse fonctionnelle.

À trancher en premier : cette décision conditionne jeu-d-essai, les trois diagrammes Merise et une partie du discours oral.
