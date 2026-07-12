/**
 * db.js — Couche d'accès à la base de données (SQLite).
 *
 * On utilise node:sqlite (module natif de Node.js) : une base de données dans
 * un simple fichier (soleil.db), aucune installation de serveur SQL nécessaire.
 *
 * SÉCURITÉ : toutes les requêtes utilisent des paramètres préparés (?),
 * ce qui protège contre les injections SQL (exigence non fonctionnelle).
 */

// SQLite intégré nativement à Node.js (node:sqlite) : aucune dépendance
// externe, aucune compilation. Disponible à partir de Node 22.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'soleil.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON'); // active le respect des clés étrangères

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
function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'user',  -- 'user' ou 'admin'
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      content     TEXT    NOT NULL,
      approved    INTEGER NOT NULL DEFAULT 0,         -- 0 = en attente, 1 = approuvé
      propose_par INTEGER,                            -- clé étrangère vers users.id
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

    -- Table des sessions (token -> utilisateur) pour l'authentification.
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT    PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

/**
 * Insère quelques données de départ : un admin, un utilisateur,
 * et des messages bienveillants d'exemple (approuvés).
 */
function seed() {
  const bcrypt = require('bcryptjs');
  const countUsers = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (countUsers > 0) return; // déjà initialisé, on ne refait pas le seed

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  // Mots de passe hachés (jamais stockés en clair).
  insertUser.run('Admin', 'admin@soleil.fr', bcrypt.hashSync('admin123', 10), 'admin');
  insertUser.run('Utilisateur Démo', 'user@soleil.fr', bcrypt.hashSync('user1234', 10), 'user');

  const insertMsg = db.prepare(
    'INSERT INTO messages (content, approved, propose_par) VALUES (?, 1, NULL)'
  );
  const exemples = [
    "Ne sois pas trop dur(e) envers toi-même. La bienveillance commence par soi.",
    "Tu mérites tout l'amour et le respect que tu offres si généreusement aux autres.",
    "Chaque petit pas compte. Sois fier(e) du chemin déjà parcouru.",
    "Prends le temps de respirer. Tu fais de ton mieux, et c'est déjà beaucoup.",
    "Ta présence rend le monde un peu plus doux. Merci d'être toi.",
  ];
  for (const c of exemples) insertMsg.run(c);

  console.log('Base initialisée avec un admin, un utilisateur et 5 messages.');
  console.log('  Admin : admin@soleil.fr / admin123');
  console.log('  User  : user@soleil.fr / user1234');
}

// Permet de lancer `node db.js --init` pour créer + remplir la base.
if (require.main === module && process.argv.includes('--init')) {
  init();
  seed();
  console.log('OK : base de données prête (soleil.db).');
}

// On exporte aussi init() pour que les tests puissent créer les tables.
module.exports = { db, init, seed };
