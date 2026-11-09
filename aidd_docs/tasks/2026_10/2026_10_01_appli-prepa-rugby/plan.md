---
objective: "Un joueur majeur installe l'appli depuis un lien, renseigne profil et calendrier club, reçoit une semaine adaptée à sa charge, ses records et ses blessures, le tout hors connexion et sauvegardable."
status: implemented
---

# Plan: Appli prépa rugby — première version

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Livrer la V1 100 % navigateur (PWA hors connexion, données locales Dexie, publiée sur GitHub Pages) décrite dans le PRD |
| **Source** | [prd.md](./prd.md), [../../../INSTALL.md](../../../INSTALL.md), règles candidates de [etat-de-l-art-prepa-rugby.md](./etat-de-l-art-prepa-rugby.md) |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Socle PWA installable et hors connexion | [`phase-1.md`](./phase-1.md) |
| 2   | Données locales, premier lancement et calendrier club | [`phase-2.md`](./phase-2.md) |
| 3   | Référentiels sourcés : repères, exercices, substitutions, Activate | [`phase-3.md`](./phase-3.md) |
| 4   | Moteur de semaine, écrans accueil, semaine et séance | [`phase-4.md`](./phase-4.md) |
| 5   | Ressenti, charge, minutes jouées et allègement | [`phase-5.md`](./phase-5.md) |
| 6   | Records, progression et faiblesses | [`phase-6.md`](./phase-6.md) |
| 7   | Blessures : exclusion, substitution, commotion | [`phase-7.md`](./phase-7.md) |
| 8   | Sauvegarde : export, import et rappel | [`phase-8.md`](./phase-8.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| `npm view vite-plugin-pwa peerDependencies` (2026-10-01) | vite-plugin-pwa 1.3.0 accepte Vite `^8.0.0` : l'incompatibilité de mars 2026 (vite-pwa #923) est résolue |
| `npm view vite engines` (2026-10-01) | Vite 8.3.2 exige Node `^20.19.0 \|\| >=22.12.0` ; le poste a Node 22.19.0 |
| `npm view` dexie, react, vitest, fake-indexeddb, @vitejs/plugin-react | Versions courantes : Dexie 4.4.6, React 19.3.0, Vitest 5.0.3 (compatible Vite 8), fake-indexeddb 6.2.5, @vitejs/plugin-react 6.1.1 (exige Vite 8) |
| https://vite-pwa-org.netlify.app/ | Manifeste, `registerType`, précache Workbox pour une SPA |
| https://web.dev/storage-for-the-web | `navigator.storage.persist()` et règle d'effacement Safari 7 jours hors PWA installée |
| https://vite.dev/guide/static-deploy#github-pages | `base` = nom du dépôt et workflow Actions pour GitHub Pages |

## Decisions

| Decision | Why |
| -------- | --- |
| Code à la racine du dossier `Appli/`, à côté de `aidd_docs/` | Un seul dépôt pour la doc et le code, poussé plus tard sur le compte Git de l'école |
| Moteur de programme en fonctions pures (`src/engine/`), sans accès à Dexie ni à React | Toutes les règles de la veille se testent unitairement ; le moteur restera valable quand la synchro arrivera |
| Référentiels en fichiers de données typés avec leur source (`src/reference/`) | Corrigeables après relecture kiné ou revérification des tableaux sans toucher au moteur |
| Chaque enregistrement Dexie porte `id` (UUID), `updatedAt`, `deletedAt` | Prépare la synchronisation Supabase future (last-write-wins) sans réécriture |
| Seuils et constantes du moteur centralisés dans `src/engine/config.ts` | Les seuils d'alerte (question ouverte du PRD) restent ajustables pour les amateurs |
| Direction artistique rouge et noir, un seul thème sombre (2026-10-02) | Demande de l'auteur ; remplace le thème clair/sombre de la phase 1. Couleurs en variables dans `src/styles/base.css`, manifeste et icônes alignés |
| Charge conseillée en kg calculée depuis les max du joueur (2026-10-02) | Demande de l'auteur, en plus du RPE. Max du journal sur 8 semaines, sinon record de squat ou de développé couché × rapport entre exercices ; % du max par Epley inversé (reps + réserve 10 − RPE). Code dans `src/engine/progression/suggestedLoad.ts`, constantes dans `src/engine/config.ts` |
| Aucune commande Git exécutée par l'implémentation | Le dépôt sera créé et poussé par l'auteur sur son compte école, à sa demande |
