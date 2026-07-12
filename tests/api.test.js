/**
 * tests/api.test.js — Tests automatisés de l'API.
 *
 * Utilise le module natif node:test (aucune dépendance de test à installer).
 * Lancer avec : npm test
 *
 * Les tests couvrent les parcours critiques du cahier des charges :
 * inscription, connexion, sécurité des routes, proposition + approbation admin.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Base de test isolée : on supprime l'éventuel fichier avant de commencer.
const dbFile = path.join(__dirname, '..', 'soleil.db');
process.env.PORT = '3999';

let server;
const BASE = 'http://localhost:3999';

before(async () => {
  // Repart d'une base propre, puis l'initialise avec le seed.
  for (const f of [dbFile, dbFile + '-wal', dbFile + '-shm']) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  const { init, seed } = require('../db');
  init();
  seed();
  const app = require('../server');
  await new Promise((resolve) => (server = app.listen(3999, resolve)));
});

after(() => {
  if (server) server.close();
});

// Petit helper fetch.
async function call(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

test('GET /api/messages/random renvoie un message', async () => {
  const { status, data } = await call('GET', '/api/messages/random');
  assert.strictEqual(status, 200);
  assert.ok(data.message.content.length > 0);
});

test('inscription puis connexion fonctionnent', async () => {
  const reg = await call('POST', '/api/register', {
    name: 'Test',
    email: 'test@soleil.fr',
    password: 'secret123',
  });
  assert.strictEqual(reg.status, 201);
  assert.ok(reg.data.token);

  const login = await call('POST', '/api/login', {
    email: 'test@soleil.fr',
    password: 'secret123',
  });
  assert.strictEqual(login.status, 200);
  assert.ok(login.data.token);
});

test('connexion avec mauvais mot de passe est refusée', async () => {
  const { status } = await call('POST', '/api/login', {
    email: 'test@soleil.fr',
    password: 'mauvais',
  });
  assert.strictEqual(status, 401);
});

test('proposer un message sans être connecté est refusé (401)', async () => {
  const { status } = await call('POST', '/api/messages', { content: 'Un joli message' });
  assert.strictEqual(status, 401);
});

test('un utilisateur normal ne peut pas accéder à l’admin (403)', async () => {
  const login = await call('POST', '/api/login', {
    email: 'user@soleil.fr',
    password: 'user1234',
  });
  const { status } = await call('GET', '/api/admin/pending', null, login.data.token);
  assert.strictEqual(status, 403);
});

test('parcours complet : proposition -> approbation admin', async () => {
  // 1. L'utilisateur de démo propose un message
  const user = await call('POST', '/api/login', {
    email: 'user@soleil.fr',
    password: 'user1234',
  });
  const prop = await call(
    'POST',
    '/api/messages',
    { content: 'Tu es capable de grandes choses.' },
    user.data.token
  );
  assert.strictEqual(prop.status, 201);

  // 2. Le message n'est pas encore visible publiquement
  const avant = await call('GET', '/api/messages');
  const trouveAvant = avant.data.messages.some((m) => m.content.includes('grandes choses'));
  assert.strictEqual(trouveAvant, false);

  // 3. L'admin l'approuve
  const admin = await call('POST', '/api/login', {
    email: 'admin@soleil.fr',
    password: 'admin123',
  });
  const approve = await call('POST', '/api/admin/approve/' + prop.data.id, null, admin.data.token);
  assert.strictEqual(approve.status, 200);

  // 4. Maintenant il est visible
  const apres = await call('GET', '/api/messages');
  const trouveApres = apres.data.messages.some((m) => m.content.includes('grandes choses'));
  assert.strictEqual(trouveApres, true);
});

test('suppression de compte (RGPD) efface l’utilisateur', async () => {
  const reg = await call('POST', '/api/register', {
    name: 'AeffacerEnsuite',
    email: 'rgpd@soleil.fr',
    password: 'secret123',
  });
  const del = await call('DELETE', '/api/me', null, reg.data.token);
  assert.strictEqual(del.status, 200);

  // On ne peut plus se connecter avec ce compte
  const login = await call('POST', '/api/login', {
    email: 'rgpd@soleil.fr',
    password: 'secret123',
  });
  assert.strictEqual(login.status, 401);
});
