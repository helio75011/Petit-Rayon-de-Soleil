/**
 * tests/auth.unit.test.js — Tests UNITAIRES du module d'authentification.
 *
 * Contrairement à api.test.js (tests d'intégration qui lancent le serveur et
 * la base), ces tests vérifient des fonctions PURES et ISOLÉES de auth.js :
 * hachage de mot de passe, génération de token, extraction de l'en-tête.
 * Aucune base de données ni serveur n'est nécessaire.
 *
 * Lancer avec : npm test
 */

const { test } = require('node:test');
const assert = require('node:assert');
const auth = require('../auth');

// --- hashPassword / checkPassword ---------------------------------------

test('[unitaire] hashPassword ne renvoie jamais le mot de passe en clair', () => {
  const hash = auth.hashPassword('secret123');
  assert.notStrictEqual(hash, 'secret123');
  assert.ok(hash.length > 20, 'le hash bcrypt doit être long');
  assert.ok(hash.startsWith('$2'), 'un hash bcrypt commence par $2');
});

test('[unitaire] checkPassword accepte le bon mot de passe', () => {
  const hash = auth.hashPassword('monMotDePasse');
  assert.strictEqual(auth.checkPassword('monMotDePasse', hash), true);
});

test('[unitaire] checkPassword refuse un mauvais mot de passe', () => {
  const hash = auth.hashPassword('monMotDePasse');
  assert.strictEqual(auth.checkPassword('mauvais', hash), false);
});

test('[unitaire] deux hachages du même mot de passe sont différents (sel aléatoire)', () => {
  const h1 = auth.hashPassword('identique');
  const h2 = auth.hashPassword('identique');
  assert.notStrictEqual(h1, h2, 'bcrypt utilise un sel aléatoire à chaque appel');
});

// --- tokenFromReq --------------------------------------------------------

test('[unitaire] tokenFromReq extrait le token d’un en-tête Bearer', () => {
  const req = { headers: { authorization: 'Bearer abc123' } };
  assert.strictEqual(auth.tokenFromReq(req), 'abc123');
});

test('[unitaire] tokenFromReq renvoie null sans en-tête Authorization', () => {
  const req = { headers: {} };
  assert.strictEqual(auth.tokenFromReq(req), null);
});

test('[unitaire] tokenFromReq ignore un schéma non-Bearer', () => {
  const req = { headers: { authorization: 'Basic abc123' } };
  assert.strictEqual(auth.tokenFromReq(req), null);
});
