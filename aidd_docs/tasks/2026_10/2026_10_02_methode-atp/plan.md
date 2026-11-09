---
objective: "Le joueur peut passer en intersaison et suivre 9 semaines bâties sur la méthode ATP Prépa Physique (semaine type, vagues de force, conditioning, terrain, tests S1/S9), et ses séances en saison suivent la structure de séance ATP et sa progression par vagues, sans perdre le placement club/match ni la décharge."
status: implemented
---

# Plan: Méthode ATP Prépa Physique dans le moteur de séances

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Intégrer la méthode ATP (programme « Beast Off-Season 9 semaines ») : un mode intersaison qui suit la semaine type ATP, et la structure de séance et la progression de force ATP en saison |
| **Source** | Demande de l'auteur du 2026-10-02, PDF `BEAST-OFF-SEASON-9-SEMAINES-0j0wox.pdf` (racine du projet), analyse reformulée [atp-methode.md](./atp-methode.md), choix validés : intégration « les deux », décharge conservée en saison seulement |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Modèle de séance par blocs, référentiel ATP, exercices et tests | [`phase-1.md`](./phase-1.md) |
| 2   | Moteur intersaison : 9 semaines ATP | [`phase-2.md`](./phase-2.md) |
| 3   | Moteur en saison : structure ATP et vagues de force | [`phase-3.md`](./phase-3.md) |
| 4   | Écrans : phase de saison, séance par blocs, tests et bilan | [`phase-4.md`](./phase-4.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| `BEAST-OFF-SEASON-9-SEMAINES-0j0wox.pdf` (ATP Prépa Physique, lu en entier le 2026-10-02) | Semaine type J1-J7, blocs A à F, progression de force S1-S9, conditioning, terrain, tests, différences avants / arrières : voir [atp-methode.md](./atp-methode.md) |
| https://www.instagram.com/atpprepaphysique/ | Inaccessible sans compte (page vide) : aucune donnée reprise. L'auteur peut fournir des captures plus tard |

## Decisions

| Decision | Why |
| -------- | --- |
| On reprend la **méthode** ATP reformulée (structure, schémas, pourcentages, formats), jamais le texte, les liens vidéo ni la promo de compléments | Programme payant et appli destinée à être publiée sur GitHub Pages ; ATP est cité comme source (niveau C, pratique d'expert) |
| La phase de saison est un champ facultatif du profil (`trainingPhase`), sans nouvelle version de schéma Dexie | Champ non indexé : aucune migration ; il entre dans l'empreinte de la semaine via `PlanProfile` |
| Intersaison = semaine type ATP fixe du lundi au dimanche, 9 semaines à partir d'un lundi choisi, sans décharge ; retour automatique en saison après la S9 | Fidèle à la méthode ATP (choix de l'auteur) ; une semaine qui contient un match repasse en logique saison |
| En saison, les séances de musculation gardent leur nombre (2 ou 3) et leur placement MD-x, mais adoptent les blocs ATP (A échauffement Activate, B puissance, C force, D/E supersets, F finisher facultatif) et une vague de force sur le cycle de 5 semaines dont la 5ᵉ reste la décharge | Choix de l'auteur : la décharge 1 semaine sur 5 est conservée en saison (cumul club + matchs) |
| Les charges du bloc force sont prescrites en % du 1RM (avec RPE plafond), et le kg conseillé en découle directement ; 1RM depuis un 3RM = /0,90, depuis un 5RM = /0,84 (repères ATP) | Les vagues ATP sont exprimées en % ; le calcul Epley reste pour les autres exercices |
| L'échauffement A garde le programme Activate (World Rugby) validé le 2026-10-01, complété par les 3 tours d'activation ATP propres à la séance | Ne pas perdre la prévention validée ; ATP ajoute la mobilité spécifique |
| `ENGINE_VERSION` passe à 3 | Les semaines à venir sont régénérées avec les nouvelles règles ; passé et séances faites restent intacts |
