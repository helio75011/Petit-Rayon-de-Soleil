/**
 * db.js — Couche d'accès à la base de données (SQLite / libSQL).
 *
 * En local  : un simple fichier SQLite (soleil.db).
 * En ligne  : une base Turso (libSQL) — SQLite hébergé, compatible serverless
 *             (indispensable sur Vercel, où le système de fichiers est éphémère).
 *
 * Le choix entre les deux se fait par variables d'environnement :
 *   - TURSO_DATABASE_URL (ex: libsql://mon-projet.turso.io)
 *   - TURSO_AUTH_TOKEN
 * Si elles sont absentes, on retombe sur le fichier local file:soleil.db.
 *
 * SÉCURITÉ : toutes les requêtes utilisent des paramètres préparés (?),
 * ce qui protège contre les injections SQL (exigence non fonctionnelle).
 */

const path = require('path');
const { createClient } = require('@libsql/client');

// Connexion : Turso si configuré, sinon fichier SQLite local.
const client = createClient(
  process.env.TURSO_DATABASE_URL
    ? {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : { url: 'file:' + path.join(__dirname, 'soleil.db') }
);

// libSQL renvoie les entiers (id, lastInsertRowid…) en BigInt, que JSON.stringify
// ne sait pas sérialiser. On les reconvertit en Number, comme le faisait node:sqlite.
function normalize(value) {
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = normalize(value[k]);
    return out;
  }
  return value;
}

/**
 * Adaptateur : reproduit l'interface familière `db.prepare(sql).get/run/all(...)`
 * de node:sqlite, mais en ASYNCHRONE (libSQL renvoie des promesses).
 *
 * Ainsi le code SQL reste identique ; seuls les appels deviennent `await`.
 *   - .get(...args)  -> première ligne (objet) ou undefined
 *   - .all(...args)  -> tableau de lignes (objets)
 *   - .run(...args)  -> { lastInsertRowid, changes } comme node:sqlite
 */
function prepare(sql) {
  return {
    async get(...args) {
      const res = await client.execute({ sql, args });
      return res.rows[0] ? normalize(res.rows[0]) : undefined;
    },
    async all(...args) {
      const res = await client.execute({ sql, args });
      return normalize(res.rows);
    },
    async run(...args) {
      const res = await client.execute({ sql, args });
      return {
        lastInsertRowid: normalize(res.lastInsertRowid),
        changes: normalize(res.rowsAffected),
      };
    },
  };
}

// On expose un objet `db` avec les mêmes méthodes qu'avant (prepare, exec).
const db = {
  prepare,
  async exec(sql) {
    // libSQL exécute plusieurs instructions via executeMultiple.
    await client.executeMultiple(sql);
  },
};

/**
 * Crée les tables si elles n'existent pas.
 * Modélisation issue du MCD/MLD :
 *   - users    : les utilisateurs (avec rôle admin)
 *   - messages : les messages bienveillants (approuvés ou en attente)
 *   - favoris  : table de liaison user <-> message (relation N,N)
 *
 * NB : contrairement au MLD de la présentation, on ne stocke PAS le nom
 * de l'utilisateur dans la table message (pas de "NameUser" dénormalisé).
 * On garde une clé étrangère propose_par et on récupère le nom par jointure.
 */
async function init() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'user',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      content     TEXT    NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
      propose_par INTEGER,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (propose_par) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS favoris (
      user_id    INTEGER NOT NULL,
      message_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, message_id),
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT    PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

/**
 * Insère le jeu d'essai complet (base de test restaurable).
 * Couvre tous les cas de figure attendus :
 *   - 1 compte admin + 2 comptes utilisateurs
 *   - des messages VALIDÉS (status = 'approved'), visibles publiquement
 *   - des messages EN ATTENTE (status = 'pending'), à modérer
 *   - des messages REJETÉS (status = 'rejected'), conservés mais non publiés
 *   - des FAVORIS reliant un utilisateur à des messages validés
 *
 * Idempotent : si des utilisateurs existent déjà, on ne réinsère rien
 * (permet de relancer init-db sans dupliquer les données).
 */
async function seed() {
  const bcrypt = require('bcryptjs');
  const count = await db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (count && count.n > 0) return; // déjà initialisé, on ne refait pas le seed

  // --- Utilisateurs ------------------------------------------------------
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  // Mots de passe hachés (jamais stockés en clair).
  await insertUser.run('Admin', 'admin@soleil.fr', bcrypt.hashSync('admin123', 10), 'admin');
  const user1 = await insertUser.run(
    'Utilisateur Démo',
    'user@soleil.fr',
    bcrypt.hashSync('user1234', 10),
    'user'
  );
  const user2 = await insertUser.run(
    'Camille Martin',
    'camille@soleil.fr',
    bcrypt.hashSync('camille1', 10),
    'user'
  );

  // --- Messages VALIDÉS (approved) : visibles de tous --------------------
  const insertApproved = db.prepare(
    "INSERT INTO messages (content, status, propose_par) VALUES (?, 'approved', ?)"
  );
  const valides = [
    'Ne sois pas trop dur(e) envers toi-même. La bienveillance commence par soi.',
    "Tu mérites tout l'amour et le respect que tu offres si généreusement aux autres.",
    'Chaque petit pas compte. Sois fier(e) du chemin déjà parcouru.',
    "Prends le temps de respirer. Tu fais de ton mieux, et c'est déjà beaucoup.",
    "Ta présence rend le monde un peu plus doux. Merci d'être toi.",
  ];
  const idsValides = [];
  for (const c of valides) {
    const info = await insertApproved.run(c, null);
    idsValides.push(info.lastInsertRowid);
  }

  // --- Messages EN ATTENTE (pending) : proposés, à modérer ---------------
  const insertPending = db.prepare(
    "INSERT INTO messages (content, status, propose_par) VALUES (?, 'pending', ?)"
  );
  await insertPending.run(
    "Tu es capable de bien plus que tu ne l'imagines.",
    user1.lastInsertRowid
  );
  await insertPending.run(
    "Ce petit rayon de soleil, c'est toi aujourd'hui.",
    user2.lastInsertRowid
  );

  // --- Messages REJETÉS (rejected) : conservés mais non publiés ----------
  const insertRejected = db.prepare(
    "INSERT INTO messages (content, status, propose_par) VALUES (?, 'rejected', ?)"
  );
  await insertRejected.run('Message hors sujet refusé par la modération.', user2.lastInsertRowid);

  // --- Favoris : l'utilisateur de démo aime deux messages validés --------
  const insertFav = db.prepare('INSERT INTO favoris (user_id, message_id) VALUES (?, ?)');
  await insertFav.run(user1.lastInsertRowid, idsValides[0]);
  await insertFav.run(user1.lastInsertRowid, idsValides[2]);

  console.log("Jeu d'essai inséré :");
  console.log('  Comptes  : 1 admin + 2 utilisateurs');
  console.log('  Messages : 5 validés, 2 en attente, 1 rejeté');
  console.log('  Favoris  : 2 (utilisateur de démo)');
  console.log('  Admin : admin@soleil.fr / admin123');
  console.log('  User  : user@soleil.fr  / user1234');
}

// Permet de lancer `node db.js --init` pour créer + remplir la base.
if (require.main === module && process.argv.includes('--init')) {
  (async () => {
    await init();
    await seed();
    console.log('OK : base de données prête.');
    process.exit(0);
  })();
}

// On exporte aussi init() pour que les tests puissent créer les tables.
module.exports = { db, init, seed };
