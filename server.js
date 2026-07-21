/**
 * server.js — Serveur Express de "Petit Rayon de Soleil".
 *
 * API REST documentée (voir README.md, section "Documentation de l'API").
 *
 * Couverture des critères du cahier des charges :
 *   - Inscription / connexion         -> POST /api/register, POST /api/login
 *   - Gestion des infos personnelles  -> GET/PUT/DELETE /api/me  (DELETE = RGPD)
 *   - Affichage de messages           -> GET /api/messages, GET /api/messages/random
 *   - Favoris                         -> GET/POST/DELETE /api/favoris
 *   - Proposition de message          -> POST /api/messages (status = pending)
 *   - Approbation admin               -> GET /api/admin/pending, POST /api/admin/approve/:id
 */

const path = require('path');
const express = require('express');
const { db, init } = require('./db');
const auth = require('./auth');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// S'assure que les tables existent, une seule fois, avant de traiter les requêtes.
// (utile en serverless : la première requête déclenche l'initialisation)
let ready = null;
function ensureReady() {
  if (!ready) ready = init();
  return ready;
}
app.use(async (req, res, next) => {
  try {
    await ensureReady();
    next();
  } catch (err) {
    next(err);
  }
});

// Petit wrapper : capture les erreurs des handlers asynchrones et les transmet
// au gestionnaire d'erreurs (sinon une exception async laisse la requête sans réponse).
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------------------------------------------------ *
 *  AUTHENTIFICATION
 * ------------------------------------------------------------------ */

// POST /api/register — inscription. Body: { name, email, password }
app.post(
  '/api/register',
  wrap(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nom, email et mot de passe sont requis.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères.' });
    }
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

    const info = await db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, auth.hashPassword(password));

    const token = await auth.createSession(info.lastInsertRowid);
    res.status(201).json({ token, user: { id: info.lastInsertRowid, name, email, role: 'user' } });
  })
);

// POST /api/login — connexion. Body: { email, password }
app.post(
  '/api/login',
  wrap(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    // Message volontairement générique pour ne pas révéler si l'email existe.
    if (!user || !auth.checkPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }
    const token = await auth.createSession(user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  })
);

// POST /api/logout — déconnexion.
app.post(
  '/api/logout',
  auth.requireAuth,
  wrap(async (req, res) => {
    await auth.destroySession(auth.tokenFromReq(req));
    res.json({ ok: true });
  })
);

/* ------------------------------------------------------------------ *
 *  GESTION DES INFORMATIONS PERSONNELLES (+ RGPD)
 * ------------------------------------------------------------------ */

// GET /api/me — informations du compte connecté.
app.get('/api/me', auth.requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/me — modifier son nom. Body: { name }
app.put(
  '/api/me',
  auth.requireAuth,
  wrap(async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Le nom est requis.' });
    await db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
    res.json({ user: { ...req.user, name } });
  })
);

// DELETE /api/me — suppression du compte et de toutes ses données (droit RGPD).
// Les favoris et sessions sont supprimés en cascade (ON DELETE CASCADE).
app.delete(
  '/api/me',
  auth.requireAuth,
  wrap(async (req, res) => {
    await db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    res.json({ ok: true, message: 'Compte et données personnelles supprimés.' });
  })
);

/* ------------------------------------------------------------------ *
 *  MESSAGES
 * ------------------------------------------------------------------ */

// GET /api/messages — liste des messages approuvés.
app.get(
  '/api/messages',
  wrap(async (req, res) => {
    const rows = await db
      .prepare(
        "SELECT id, content, created_at FROM messages WHERE status = 'approved' ORDER BY id DESC"
      )
      .all();
    res.json({ messages: rows });
  })
);

// GET /api/messages/random — un message bienveillant au hasard (page d'accueil).
// ORDER BY RANDOM() LIMIT 1 : tirage côté base, ne charge pas tout en mémoire.
app.get(
  '/api/messages/random',
  wrap(async (req, res) => {
    const row = await db
      .prepare(
        "SELECT id, content FROM messages WHERE status = 'approved' ORDER BY RANDOM() LIMIT 1"
      )
      .get();
    if (!row) return res.status(404).json({ error: 'Aucun message disponible.' });
    res.json({ message: row });
  })
);

// POST /api/messages — proposer un nouveau message (en attente d'approbation).
// Body: { content }
app.post(
  '/api/messages',
  auth.requireAuth,
  wrap(async (req, res) => {
    const { content } = req.body || {};
    if (!content || content.trim().length < 5) {
      return res.status(400).json({ error: 'Le message doit faire au moins 5 caractères.' });
    }
    const info = await db
      .prepare("INSERT INTO messages (content, status, propose_par) VALUES (?, 'pending', ?)")
      .run(content.trim(), req.user.id);
    res.status(201).json({
      id: info.lastInsertRowid,
      message: 'Merci ! Ta proposition sera publiée après validation par un administrateur.',
    });
  })
);

/* ------------------------------------------------------------------ *
 *  FAVORIS
 * ------------------------------------------------------------------ */

// GET /api/favoris — les messages favoris de l'utilisateur connecté.
app.get(
  '/api/favoris',
  auth.requireAuth,
  wrap(async (req, res) => {
    const rows = await db
      .prepare(
        `SELECT m.id, m.content
         FROM favoris f
         JOIN messages m ON m.id = f.message_id
        WHERE f.user_id = ?
        ORDER BY m.id DESC`
      )
      .all(req.user.id);
    res.json({ favoris: rows });
  })
);

// POST /api/favoris — ajouter un message en favori. Body: { message_id }
app.post(
  '/api/favoris',
  auth.requireAuth,
  wrap(async (req, res) => {
    const { message_id } = req.body || {};
    const msg = await db
      .prepare("SELECT id FROM messages WHERE id = ? AND status = 'approved'")
      .get(message_id);
    if (!msg) return res.status(404).json({ error: 'Message introuvable.' });
    // INSERT OR IGNORE : pas d'erreur si le favori existe déjà.
    await db
      .prepare('INSERT OR IGNORE INTO favoris (user_id, message_id) VALUES (?, ?)')
      .run(req.user.id, message_id);
    res.status(201).json({ ok: true });
  })
);

// DELETE /api/favoris/:id — retirer un message des favoris.
app.delete(
  '/api/favoris/:id',
  auth.requireAuth,
  wrap(async (req, res) => {
    await db
      .prepare('DELETE FROM favoris WHERE user_id = ? AND message_id = ?')
      .run(req.user.id, req.params.id);
    res.json({ ok: true });
  })
);

/* ------------------------------------------------------------------ *
 *  ADMINISTRATION (approbation des propositions)
 * ------------------------------------------------------------------ */

// GET /api/admin/pending — messages en attente d'approbation.
app.get(
  '/api/admin/pending',
  auth.requireAdmin,
  wrap(async (req, res) => {
    const rows = await db
      .prepare(
        `SELECT m.id, m.content, m.created_at, u.name AS auteur
         FROM messages m
         LEFT JOIN users u ON u.id = m.propose_par
        WHERE m.status = 'pending'
        ORDER BY m.id ASC`
      )
      .all();
    res.json({ pending: rows });
  })
);

// POST /api/admin/approve/:id — approuver une proposition (status -> approved).
app.post(
  '/api/admin/approve/:id',
  auth.requireAdmin,
  wrap(async (req, res) => {
    const info = await db
      .prepare("UPDATE messages SET status = 'approved' WHERE id = ?")
      .run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Message introuvable.' });
    res.json({ ok: true });
  })
);

// DELETE /api/admin/reject/:id — refuser une proposition.
// On ne supprime pas le message : on le marque 'rejected' (traçabilité de la modération).
app.delete(
  '/api/admin/reject/:id',
  auth.requireAdmin,
  wrap(async (req, res) => {
    await db
      .prepare("UPDATE messages SET status = 'rejected' WHERE id = ? AND status = 'pending'")
      .run(req.params.id);
    res.json({ ok: true });
  })
);

/* ------------------------------------------------------------------ *
 *  GESTION DES ERREURS
 * ------------------------------------------------------------------ */

// Middleware d'erreurs : toute exception (y compris asynchrone via wrap)
// aboutit ici et renvoie une réponse JSON propre plutôt que de laisser
// la requête sans réponse.
// NB : les 4 paramètres (err, req, res, next) sont obligatoires — c'est à leur
// nombre qu'Express reconnaît un middleware de gestion d'erreurs. `next` n'est
// pas utilisé ici mais doit rester présent (préfixé _ pour le signaler).
app.use((err, req, res, _next) => {
  console.error('Erreur serveur :', err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

/* ------------------------------------------------------------------ */

const PORT = process.env.PORT || 3000;
// On n'écoute que si le fichier est lancé directement (local).
// Sur Vercel, c'est le handler api/index.js qui importe `app` sans écouter.
// Les tests importent aussi `app` sans démarrer le serveur.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Petit Rayon de Soleil tourne sur http://localhost:${PORT}`);
  });
}

module.exports = app; // exporté pour les tests et pour le handler Vercel
