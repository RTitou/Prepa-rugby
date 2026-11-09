---
status: done
---

# Instruction: Sauvegarde : export, import et rappel

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
.
├── src/
│   ├── data/backup/
│   │   ├── exportData.ts                  ✅ toutes les tables en un fichier JSON versionné
│   │   ├── importData.ts                  ✅ validation puis remplacement complet
│   │   └── backupReminder.ts              ✅ date de dernière sauvegarde, rappel à 14 jours
│   └── screens/
│       ├── profile/                       ✏️ boutons exporter et importer, date de dernière sauvegarde
│       └── home/                          ✏️ bandeau de rappel de sauvegarde
└── tests/data/backup.test.ts              ✅ aller-retour, fichier invalide, rappel
```

## User Journey

```mermaid
flowchart TD
  A[Réglages] --> B[Exporter ma sauvegarde]
  B --> C[Fichier téléchargé ou partagé]
  D[Nouvel appareil ou réinstallation] --> E[Importer ma sauvegarde]
  E --> F{Fichier valide ?}
  F -- oui --> G[Confirmation puis données restaurées à l'identique]
  F -- non --> H[Erreur claire, données actuelles intactes]
  I[Dernière sauvegarde de plus de 14 jours] --> J[Rappel sur l'accueil]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    Base avec profil calendrier records ressentis blessures et séances => données prêtes: 5: system
  section Happy path
    Exporter => fichier JSON contenant toutes les tables et la version: 5: browser
    Importer ce fichier sur une base vide => données identiques et semaine identique: 5: system
    Sauvegarde vieille de 15 jours => ouvrir l'accueil => rappel de sauvegarde visible: 5: browser
  section Edge case - fichier invalide
    Fichier corrompu ou d'une autre appli => importer => erreur claire et données inchangées: 1: system
  section Edge case - ancienne version de fichier
    Fichier d'une version antérieure du schéma => importer => données migrées ou refus explicite: 1: system
  section Teardown
    Vider la base de test => base vide: 5: system
```

## Tasks to do

### `1)` Export

> Un fichier unique qui contient tout.

1. Toutes les tables, y compris les suppressions logiques, avec version du schéma et date.
2. Téléchargement sur ordinateur, partage natif sur téléphone quand disponible.
3. Mémoriser la date de dernière sauvegarde.

### `2)` Import

> Restaurer à l'identique sans risque.

1. Valider format et version avant toute écriture.
2. Confirmation explicite, puis remplacement complet en une transaction.
3. Fichier invalide : erreur claire, aucune donnée modifiée.

### `3)` Rappel

> Filet de sécurité contre l'effacement par Safari.

1. Bandeau sur l'accueil si aucune sauvegarde depuis 14 jours ou jamais.
2. Bandeau masquable jusqu'au lendemain.

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1 | Le fichier exporté contient toutes les données du joueur et la version du schéma |
| 2 | Un import sur un autre appareil restaure profil, records, ressentis, blessures et semaine à l'identique ; un fichier invalide ne modifie rien |
| 3 | Sans sauvegarde depuis plus de 14 jours, l'accueil affiche le rappel |
