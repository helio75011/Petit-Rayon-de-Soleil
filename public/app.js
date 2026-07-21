/* app.js — Logique front-end (JavaScript vanilla, sans framework).
   Communique avec l'API REST du serveur via fetch(). */

// État de connexion stocké côté navigateur.
let token = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let dernierMessageId = null; // id du message affiché (pour le bouton favori)

/* ---------- Helpers ---------- */

// Appel API avec le token d'authentification si présent.
async function api(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// Affiche un message temporaire (accessible via aria-live).
function flash(msg) {
  const el = document.getElementById('flash');
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, 3500);
}

// Affiche une seule "vue" (section) et met à jour la navigation.
function montrerVue(nom) {
  document.querySelectorAll('main section').forEach((s) => (s.hidden = true));
  document.getElementById('vue-' + nom).hidden = false;
}

// Met à jour la barre de navigation selon l'état de connexion.
function majNavigation() {
  const connecte = !!currentUser;
  const admin = currentUser && currentUser.role === 'admin';
  document.getElementById('nav-favoris').hidden = !connecte;
  document.getElementById('nav-proposer').hidden = !connecte;
  document.getElementById('nav-profil').hidden = !connecte;
  document.getElementById('nav-logout').hidden = !connecte;
  document.getElementById('nav-connexion').hidden = connecte;
  document.getElementById('nav-admin').hidden = !admin;
}

function sauverSession(data) {
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(currentUser));
  majNavigation();
}

function effacerSession() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  majNavigation();
}

/* ---------- Accueil : message aléatoire ---------- */

document.getElementById('btn-nouveau-message').addEventListener('click', async () => {
  try {
    const { message } = await api('GET', '/api/messages/random');
    document.getElementById('message-affiche').textContent = message.content;
    dernierMessageId = message.id;
    // Le bouton favori n'apparaît que pour les utilisateurs connectés.
    document.getElementById('btn-favori').hidden = !currentUser;
  } catch (e) {
    flash(e.message);
  }
});

document.getElementById('btn-favori').addEventListener('click', async () => {
  if (!dernierMessageId) return;
  try {
    await api('POST', '/api/favoris', { message_id: dernierMessageId });
    flash('Ajouté à tes favoris ♥');
  } catch (e) {
    flash(e.message);
  }
});

/* ---------- Navigation ---------- */

document.getElementById('nav-accueil').addEventListener('click', () => montrerVue('accueil'));
document.getElementById('nav-connexion').addEventListener('click', () => montrerVue('connexion'));

document.getElementById('nav-favoris').addEventListener('click', async () => {
  montrerVue('favoris');
  const { favoris } = await api('GET', '/api/favoris');
  const ul = document.getElementById('liste-favoris');
  ul.innerHTML = '';
  if (favoris.length === 0) ul.innerHTML = '<li>Aucun favori pour le moment.</li>';
  favoris.forEach((f) => {
    const li = document.createElement('li');
    li.append(document.createTextNode(f.content)); // textContent : pas d'injection HTML (anti-XSS)
    const btn = document.createElement('button');
    btn.className = 'btn-secondary';
    btn.textContent = 'Retirer';
    btn.addEventListener('click', async () => {
      await api('DELETE', '/api/favoris/' + f.id);
      li.remove();
    });
    li.append(btn);
    ul.append(li);
  });
});

document.getElementById('nav-proposer').addEventListener('click', () => montrerVue('proposer'));

document.getElementById('nav-profil').addEventListener('click', () => {
  montrerVue('profil');
  document.getElementById('profil-name').value = currentUser.name;
});

document.getElementById('nav-admin').addEventListener('click', async () => {
  montrerVue('admin');
  const { pending } = await api('GET', '/api/admin/pending');
  const ul = document.getElementById('liste-pending');
  ul.innerHTML = '';
  if (pending.length === 0) ul.innerHTML = '<li>Aucune proposition en attente.</li>';
  pending.forEach((p) => {
    const li = document.createElement('li');
    li.append(document.createTextNode(`${p.content} — par ${p.auteur || 'inconnu'}`));
    const ok = document.createElement('button');
    ok.className = 'btn-primary';
    ok.textContent = 'Approuver';
    ok.addEventListener('click', async () => {
      await api('POST', '/api/admin/approve/' + p.id);
      li.remove();
      flash('Message approuvé.');
    });
    const no = document.createElement('button');
    no.className = 'btn-danger';
    no.textContent = 'Refuser';
    no.addEventListener('click', async () => {
      await api('DELETE', '/api/admin/reject/' + p.id);
      li.remove();
    });
    li.append(ok, no);
    ul.append(li);
  });
});

document.getElementById('nav-logout').addEventListener('click', async () => {
  // On tente d'invalider la session côté serveur, mais même si l'appel échoue
  // (token déjà expiré, réseau…), on déconnecte l'utilisateur localement.
  try {
    await api('POST', '/api/logout');
  } catch {
    /* déconnexion locale quoi qu'il arrive */
  }
  effacerSession();
  montrerVue('accueil');
  flash('À bientôt !');
});

/* ---------- Formulaires ---------- */

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('POST', '/api/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value,
    });
    sauverSession(data);
    montrerVue('accueil');
    flash('Connecté ! Bienvenue ' + data.user.name);
  } catch (err) {
    flash(err.message);
  }
});

document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('POST', '/api/register', {
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value,
    });
    sauverSession(data);
    montrerVue('accueil');
    flash('Compte créé ! Bienvenue ' + data.user.name);
  } catch (err) {
    flash(err.message);
  }
});

document.getElementById('form-proposer').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const { message } = await api('POST', '/api/messages', {
      content: document.getElementById('prop-content').value,
    });
    document.getElementById('prop-content').value = '';
    flash(message);
  } catch (err) {
    flash(err.message);
  }
});

document.getElementById('form-profil').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('PUT', '/api/me', {
      name: document.getElementById('profil-name').value,
    });
    currentUser = data.user;
    localStorage.setItem('user', JSON.stringify(currentUser));
    flash('Profil mis à jour.');
  } catch (err) {
    flash(err.message);
  }
});

document.getElementById('btn-supprimer-compte').addEventListener('click', async () => {
  if (!confirm('Supprimer définitivement ton compte et toutes tes données ?')) return;
  try {
    await api('DELETE', '/api/me');
    effacerSession();
    montrerVue('accueil');
    flash('Compte supprimé. Tes données ont été effacées.');
  } catch (err) {
    flash(err.message);
  }
});

/* ---------- Initialisation ---------- */
majNavigation();
montrerVue('accueil');
