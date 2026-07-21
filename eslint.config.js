/**
 * eslint.config.js — Configuration ESLint (format "flat", ESLint 9).
 *
 * ESLint analyse le code pour détecter les erreurs et les mauvaises pratiques
 * (variables inutilisées, oublis, etc.). Prettier, lui, s'occupe du formatage.
 * On charge `eslint-config-prettier` en dernier pour désactiver les règles de
 * style qui entreraient en conflit avec Prettier : chaque outil son rôle.
 */

const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');

module.exports = [
  // Fichiers/dossiers ignorés par l'analyse.
  {
    ignores: ['node_modules/**', 'soleil.db*', 'docs/**', '.vercel/**'],
  },

  // Règles recommandées d'ESLint pour tout le JavaScript.
  js.configs.recommended,

  // Code SERVEUR (Node.js, CommonJS) : tout sauf le dossier public/.
  {
    files: ['**/*.js'],
    ignores: ['public/**'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        // Globals fournis par l'environnement Node.js.
        process: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      // On tolère les variables préfixées _ et les args non utilisés en fin
      // de signature (utile pour le middleware d'erreurs Express (err,req,res,next)).
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$|^req$|^res$' }],
    },
  },

  // Code NAVIGATEUR (front) : dossier public/, globals du DOM.
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // Doit rester en DERNIER : neutralise les règles de style vs Prettier.
  prettier,
];
