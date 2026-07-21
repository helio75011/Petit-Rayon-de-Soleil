/**
 * scripts/reset-db.js — Restauration / réinitialisation de la base.
 *
 * Remet l'application dans un état propre et connu, en une seule commande :
 *   npm run db:reset
 *
 * Étapes :
 *   1. Suppression de la base locale (soleil.db + fichiers WAL/SHM).
 *   2. Relance du script d'initialisation (création des tables).
 *   3. Réinjection du jeu d'essai / données de démonstration (seed).
 *   4. Vérification automatique des comptes de test et du volume de données.
 *
 * Le script s'arrête avec un code d'erreur (exit 1) si la vérification échoue,
 * ce qui le rend utilisable aussi bien à la main qu'en intégration continue.
 *
 * NB : ce script agit sur la base LOCALE (fichier soleil.db). Il refuse de
 * s'exécuter si une base Turso distante est configurée, pour éviter de vider
 * par erreur la base de production.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_FILES = ['soleil.db', 'soleil.db-wal', 'soleil.db-shm'];

// Comptes que le jeu d'essai DOIT contenir après restauration.
const COMPTES_ATTENDUS = [
  { email: 'admin@soleil.fr', role: 'admin' },
  { email: 'user@soleil.fr', role: 'user' },
  { email: 'camille@soleil.fr', role: 'user' },
];

// Volumes attendus (cohérents avec seed() dans db.js).
const VOLUMES_ATTENDUS = { approved: 5, pending: 2, rejected: 1, favoris: 2 };

function log(step, msg) {
  console.log(`${step}  ${msg}`);
}

async function main() {
  // Garde-fou : ne jamais réinitialiser une base de production distante.
  if (process.env.TURSO_DATABASE_URL) {
    console.error(
      'ABANDON : TURSO_DATABASE_URL est défini. Ce script ne réinitialise que ' +
        "la base LOCALE. Retire la variable d'environnement pour continuer."
    );
    process.exit(1);
  }

  // --- Étape 1 : suppression de la base locale --------------------------
  let supprimes = 0;
  for (const f of DB_FILES) {
    const full = path.join(ROOT, f);
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
      supprimes++;
    }
  }
  log('[1/4]', `Suppression de la base locale... OK (${supprimes} fichier(s) retiré(s))`);

  // --- Étape 2 & 3 : (ré)initialisation + réinjection du jeu d'essai ----
  // On charge db.js APRÈS la suppression pour repartir d'un fichier neuf.
  const { db, init, seed } = require('../db');
  await init();
  log('[2/4]', 'Création des tables (init)... OK');
  await seed();
  log('[3/4]', 'Réinjection des données de démonstration (seed)... OK');

  // --- Étape 4 : vérification des comptes de test et des volumes --------
  console.log('[4/4]  Vérification :');
  let ok = true;

  // 4a. Chaque compte de test attendu est présent avec le bon rôle.
  for (const attendu of COMPTES_ATTENDUS) {
    const row = await db
      .prepare('SELECT email, role FROM users WHERE email = ?')
      .get(attendu.email);
    if (row && row.role === attendu.role) {
      console.log(`       ✓ ${attendu.email}  (${row.role})`);
    } else {
      console.log(`       ✗ ${attendu.email}  MANQUANT ou rôle incorrect`);
      ok = false;
    }
  }

  // 4b. Les volumes de messages et favoris correspondent au seed.
  const compter = async (sql, ...args) => (await db.prepare(sql).get(...args)).n;
  const approved = await compter("SELECT COUNT(*) AS n FROM messages WHERE status = 'approved'");
  const pending = await compter("SELECT COUNT(*) AS n FROM messages WHERE status = 'pending'");
  const rejected = await compter("SELECT COUNT(*) AS n FROM messages WHERE status = 'rejected'");
  const favoris = await compter('SELECT COUNT(*) AS n FROM favoris');

  const check = (label, obtenu, attendu) => {
    const marque = obtenu === attendu ? '✓' : '✗';
    console.log(`       ${marque} ${label} : ${obtenu} (attendu ${attendu})`);
    if (obtenu !== attendu) ok = false;
  };
  check('messages validés ', approved, VOLUMES_ATTENDUS.approved);
  check('messages en attente', pending, VOLUMES_ATTENDUS.pending);
  check('messages rejetés ', rejected, VOLUMES_ATTENDUS.rejected);
  check('favoris          ', favoris, VOLUMES_ATTENDUS.favoris);

  console.log('');
  if (ok) {
    console.log('Base restaurée avec succès. Tous les comptes et volumes sont conformes.');
    process.exit(0);
  } else {
    console.error("ÉCHEC : la base restaurée ne correspond pas à l'état attendu.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Erreur pendant la restauration :', err);
  process.exit(1);
});
