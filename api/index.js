/**
 * api/index.js — Point d'entrée pour Vercel (fonction serverless).
 *
 * Vercel exécute chaque requête via ce handler. On réutilise l'application
 * Express existante (server.js), qui exporte `app` sans appeler listen().
 * Aucune logique dupliquée : c'est le même serveur qu'en local.
 */
module.exports = require('../server');
