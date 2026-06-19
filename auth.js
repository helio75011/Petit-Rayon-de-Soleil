/**
 * auth.js — Authentification sécurisée.
 *
 * - Les mots de passe sont hachés avec bcrypt (jamais stockés en clair).
 * - La connexion crée un token aléatoire stocké en base (table sessions).
 * - Le client renvoie ce token dans l'en-tête "Authorization: Bearer <token>".
 * - Le middleware requireAuth / requireAdmin protège les routes sensibles.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

/** Génère un token de session imprévisible. */
function genToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Hache un mot de passe en clair. */
function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

/** Vérifie un mot de passe en clair contre son hash stocké. */
function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

/** Crée une session pour un utilisateur et renvoie le token. */
function createSession(userId) {
  const token = genToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return token;
}

/** Supprime une session (déconnexion). */
function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/** Retrouve l'utilisateur associé à un token, ou null. */
function userFromToken(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`
    )
    .get(token);
  return row || null;
}

/** Extrait le token de l'en-tête Authorization d'une requête. */
function tokenFromReq(req) {
  const header = req.headers['authorization'] || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Middleware : exige un utilisateur connecté. */
function requireAuth(req, res, next) {
  const user = userFromToken(tokenFromReq(req));
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  req.user = user;
  next();
}

/** Middleware : exige un utilisateur connecté ET administrateur. */
function requireAdmin(req, res, next) {
  const user = userFromToken(tokenFromReq(req));
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé à l’administrateur' });
  req.user = user;
  next();
}

module.exports = {
  hashPassword,
  checkPassword,
  createSession,
  destroySession,
  userFromToken,
  tokenFromReq,
  requireAuth,
  requireAdmin,
};
