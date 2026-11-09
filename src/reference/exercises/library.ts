import type { BodyZone, Equipment, Exercise, ExerciseCategory, ImpactLevel } from '../../types/reference'
import { ATP_EXERCISES } from './atpLibrary'

/*
 * Bibliothèque d'exercices. Les consignes sont courtes et génériques ; la prescription (séries,
 * répétitions, RPE) vient du moteur, pas d'ici. Les zones listent les articulations/régions
 * significativement chargées : elles servent à exclure un exercice quand la zone est blessée
 * (veille §8.4, principe de précaution, pratique de terrain, niveau C).
 * Les identifiants sont stables : ne jamais les renommer.
 * Relecture kiné recommandée (voir PHYSIO_REVIEW).
 */
export const PHYSIO_REVIEW = {
  reviewedByPhysio: false,
  note: 'Relecture kiné recommandée : zones sollicitées et impacts sont des jugements de conception.',
} as const

// Alias de zones, pour la lisibilité.
const TETE: BodyZone = 'tete'
const COU: BodyZone = 'cou'
const EPA: BodyZone = 'epaule'
const MAIN: BodyZone = 'coude-poignet-main'
const DOS: BodyZone = 'bas-du-dos'
const ISCH: BodyZone = 'ischios'
const QUAD: BodyZone = 'quadriceps-adducteurs-aine'
const GEN: BodyZone = 'genou'
const CHEV: BodyZone = 'cheville-pied'
const MOLL: BodyZone = 'mollet-achille'

const LEGS_RUN: BodyZone[] = [ISCH, QUAD, GEN, CHEV, MOLL]

interface Def {
  id: string
  name: string
  instructions: string
  zones: BodyZone[]
  impact: ImpactLevel
  equipment: Equipment[]
  axial?: boolean
  peak?: boolean
  note?: string
}

function category(cat: ExerciseCategory, defs: Def[]): Exercise[] {
  return defs.map((d) => ({
    id: d.id,
    name: d.name,
    instructions: d.instructions,
    category: cat,
    zones: d.zones,
    impact: d.impact,
    axialLoad: d.axial ?? false,
    equipment: d.equipment,
    ...(d.peak ? { peakCalibrated: true } : {}),
    ...(d.note ? { evidenceNote: d.note } : {}),
  }))
}

const FORCE_BAS = category('force-bas', [
  { id: 'back-squat', name: 'Squat arrière', instructions: 'Barre sur les trapèzes, descends contrôlé à une profondeur maîtrisée, remonte en poussant le sol. Charge au RPE ou RIR prescrit.', zones: [DOS, QUAD, GEN, CHEV], impact: 'faible', equipment: ['barre', 'rack'], axial: true },
  { id: 'front-squat', name: 'Squat avant', instructions: 'Barre sur l’avant des épaules, coudes hauts, buste droit. Descends contrôlé puis remonte.', zones: [DOS, QUAD, GEN, CHEV, MAIN], impact: 'faible', equipment: ['barre', 'rack'], axial: true },
  { id: 'safety-bar-squat', name: 'Squat à la barre de sécurité (safety bar)', instructions: 'Barre à poignées posée sur le haut du dos, buste plus vertical. Descends contrôlé, remonte sans cambrer.', zones: [DOS, QUAD, GEN, CHEV], impact: 'faible', equipment: ['barre', 'rack'], axial: true },
  { id: 'belt-squat', name: 'Squat à la ceinture (belt squat)', instructions: 'Charge accrochée à la ceinture, colonne non chargée. Descends contrôlé, remonte en poussant les pieds.', zones: [QUAD, GEN, CHEV], impact: 'faible', equipment: ['machine'] },
  { id: 'trap-bar-deadlift', name: 'Soulevé de terre à la barre hexagonale', instructions: 'Dos plat, pousse le sol, verrouille les hanches en haut sans te cambrer. Repose la barre avec contrôle.', zones: [DOS, ISCH, QUAD, GEN, MAIN], impact: 'faible', equipment: ['barre'], axial: true },
  { id: 'romanian-deadlift', name: 'Soulevé de terre jambes tendues (roumain)', instructions: 'Genoux légèrement fléchis, bascule du bassin vers l’arrière, barre près des jambes, dos plat. Remonte en serrant les fessiers.', zones: [DOS, ISCH, MAIN], impact: 'faible', equipment: ['barre'], axial: true },
  { id: 'good-morning', name: 'Good morning', instructions: 'Barre sur le haut du dos, bascule du bassin vers l’arrière, dos plat, remonte en poussant les hanches.', zones: [DOS, ISCH], impact: 'faible', equipment: ['barre', 'rack'], axial: true },
  { id: 'leg-press', name: 'Presse à cuisses', instructions: 'Pieds à largeur d’épaules, descends jusqu’à l’amplitude sans décoller le bassin, pousse sans verrouiller les genoux.', zones: [QUAD, GEN], impact: 'faible', equipment: ['machine'] },
  { id: 'hack-squat', name: 'Hack squat', instructions: 'Dos calé, pieds à largeur d’épaules, descends contrôlé en charge modérée, remonte sans verrouiller.', zones: [QUAD, GEN], impact: 'faible', equipment: ['machine'] },
  { id: 'bulgarian-split-squat', name: 'Squat bulgare', instructions: 'Pied arrière surélevé, haltères en mains, descends à la verticale du pied avant, remonte en poussant le talon.', zones: [QUAD, GEN, CHEV], impact: 'faible', equipment: ['halteres', 'banc'] },
  { id: 'walking-lunge', name: 'Fentes marchées amples', instructions: 'Grands pas, genou avant aligné sur le pied, buste droit. Alterne les jambes à chaque pas.', zones: [QUAD, GEN, ISCH, CHEV], impact: 'moyen', equipment: ['halteres'] },
  { id: 'step-up', name: 'Montée sur box', instructions: 'Pose tout le pied sur la box, monte en poussant avec la jambe d’appui, redescends lentement.', zones: [QUAD, GEN, CHEV], impact: 'faible', equipment: ['box', 'halteres'] },
  { id: 'split-squat-bodyweight', name: 'Fente statique au poids du corps', instructions: 'Un pied devant, descends le genou arrière vers le sol sans toucher, remonte. Travaille un côté puis l’autre.', zones: [QUAD, GEN, CHEV], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'hip-thrust', name: 'Hip thrust', instructions: 'Dos appuyé sur un banc, barre sur le bassin, pousse les hanches vers le haut et serre les fessiers en haut.', zones: [ISCH], impact: 'faible', equipment: ['barre', 'banc'] },
  { id: 'glute-bridge', name: 'Pont fessier', instructions: 'Allongé sur le dos, pieds au sol, monte le bassin en serrant les fessiers, tiens une seconde, redescends.', zones: [ISCH], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'leg-extension', name: 'Extension de jambes (machine)', instructions: 'Assis, étends les jambes sans à-coup, marque une pause en haut, redescends contrôlé.', zones: [QUAD, GEN], impact: 'faible', equipment: ['machine'] },
  { id: 'seated-leg-curl', name: 'Curl ischios assis (machine)', instructions: 'Assis, fléchis les jambes en contrôlant, redescends lentement sur 2 à 3 secondes.', zones: [ISCH, GEN], impact: 'faible', equipment: ['machine'] },
  { id: 'calf-raise', name: 'Montées sur pointes (mollets)', instructions: 'Monte sur la pointe des pieds, pause en haut, redescends lentement jusqu’à l’étirement.', zones: [MOLL, CHEV], impact: 'faible', equipment: ['halteres', 'box'] },
])

const FORCE_HAUT = category('force-haut', [
  { id: 'bench-press', name: 'Développé couché', instructions: 'Omoplates serrées, barre au bas de la poitrine, pousse sans décoller le bassin. Charge au RPE ou RIR prescrit.', zones: [EPA, MAIN], impact: 'faible', equipment: ['barre', 'banc', 'rack'] },
  { id: 'dumbbell-bench-press', name: 'Développé couché aux haltères', instructions: 'Haltères au niveau de la poitrine, pousse en gardant les avant-bras verticaux, redescends contrôlé.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres', 'banc'] },
  { id: 'overhead-press', name: 'Développé militaire', instructions: 'Debout, gainé, pousse la barre au-dessus de la tête sans cambrer, redescends sur le haut de la poitrine.', zones: [EPA, MAIN, DOS], impact: 'faible', equipment: ['barre', 'rack'], axial: true },
  { id: 'pull-up-weighted', name: 'Traction (lestée si possible)', instructions: 'Départ bras tendus, tire le menton au-dessus de la barre sans élan, redescends contrôlé.', zones: [EPA, MAIN], impact: 'faible', equipment: ['barre-de-traction'] },
  { id: 'bent-over-row', name: 'Rowing barre buste penché', instructions: 'Buste incliné, dos plat, tire la barre vers le bas du ventre, coudes près du corps.', zones: [DOS, EPA, MAIN], impact: 'faible', equipment: ['barre'], axial: true },
  { id: 'chest-supported-row', name: 'Rowing buste appuyé', instructions: 'Poitrine calée sur le banc, tire les coudes vers l’arrière, serre les omoplates, redescends contrôlé.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres', 'banc'] },
  { id: 'lat-pulldown', name: 'Tirage vertical assis', instructions: 'Assis cuisses calées, tire la barre vers le haut de la poitrine en abaissant les coudes, remonte contrôlé.', zones: [EPA, MAIN], impact: 'faible', equipment: ['poulie'] },
  { id: 'dips', name: 'Dips', instructions: 'Bras tendus, descends jusqu’à ce que l’amplitude reste confortable pour l’épaule, remonte sans balancer.', zones: [EPA, MAIN], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'push-up', name: 'Pompes', instructions: 'Corps aligné de la tête aux talons, descends la poitrine près du sol, repousse sans creuser le dos.', zones: [EPA, MAIN], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'biceps-curl', name: 'Curl biceps', instructions: 'Coudes fixes le long du corps, fléchis sans balancer le buste, redescends lentement.', zones: [MAIN], impact: 'faible', equipment: ['halteres'] },
  { id: 'triceps-pushdown', name: 'Extension triceps à la poulie', instructions: 'Coudes collés au corps, étends les bras complètement, remonte contrôlé.', zones: [MAIN], impact: 'faible', equipment: ['poulie'] },
  { id: 'pec-deck', name: 'Écarté sur machine à appuis avant-bras', instructions: 'Avant-bras posés sur les coussins, rapproche les coudes devant toi, reviens contrôlé.', zones: [EPA], impact: 'faible', equipment: ['machine'] },
  { id: 'reverse-pec-deck', name: 'Oiseau sur machine (arrière d’épaule)', instructions: 'Assis face au dossier, ouvre les bras vers l’arrière en serrant les omoplates, reviens contrôlé.', zones: [EPA], impact: 'faible', equipment: ['machine'] },
  { id: 'lateral-raise', name: 'Élévations latérales', instructions: 'Légers haltères, monte les bras sur les côtés jusqu’à l’horizontale, coudes légèrement fléchis, redescends lentement.', zones: [EPA], impact: 'faible', equipment: ['halteres'] },
  { id: 'face-pull', name: 'Face pull', instructions: 'Poulie haute, tire la corde vers le visage en écartant les coudes, serre les omoplates.', zones: [EPA], impact: 'faible', equipment: ['poulie'] },
  { id: 'farmer-carry', name: 'Marche du fermier', instructions: 'Un haltère lourd dans chaque main, marche droit, épaules basses, abdominaux gainés.', zones: [MAIN, DOS], impact: 'faible', equipment: ['halteres'], axial: true },
])

const PUISSANCE = category('puissance', [
  { id: 'power-clean', name: 'Épaulé', instructions: 'Tire la barre explosivement depuis le sol, récupère-la sur les épaules en amortissant. Intention maximale, séries courtes.', zones: [DOS, ISCH, QUAD, GEN, CHEV, EPA, MAIN], impact: 'moyen', equipment: ['barre'], axial: true },
  { id: 'hang-power-clean', name: 'Épaulé suspendu', instructions: 'Barre à hauteur de genoux, extension explosive des hanches, réception sur les épaules en amortissant.', zones: [DOS, ISCH, QUAD, GEN, CHEV, EPA, MAIN], impact: 'moyen', equipment: ['barre'], axial: true },
  { id: 'kettlebell-swing', name: 'Balancé de kettlebell', instructions: 'Bascule du bassin, projette la kettlebell avec les hanches (pas les bras) jusqu’à la hauteur de poitrine.', zones: [DOS, ISCH, MAIN], impact: 'faible', equipment: ['kettlebell'] },
  { id: 'jump-squat', name: 'Squat sauté', instructions: 'Descends vite à mi-profondeur, saute le plus haut possible, amortis la réception genoux alignés.', zones: [QUAD, GEN, CHEV, MOLL], impact: 'fort', equipment: ['poids-du-corps'] },
  { id: 'countermovement-jump', name: 'Saut vertical (CMJ)', instructions: 'Flexion rapide, saut vertical maximal, réception amortie sur les deux pieds.', zones: [QUAD, GEN, CHEV, MOLL], impact: 'moyen', equipment: ['poids-du-corps'] },
  { id: 'box-jump', name: 'Saut sur box', instructions: 'Saute sur une box à hauteur raisonnable, réceptionne en douceur, redescends en marchant.', zones: [QUAD, GEN, CHEV, MOLL], impact: 'moyen', equipment: ['box'] },
  { id: 'broad-jump', name: 'Saut en longueur sans élan', instructions: 'Balance les bras, saute le plus loin possible, amortis la réception, arrête-toi avant de recommencer.', zones: [ISCH, QUAD, GEN, CHEV, MOLL], impact: 'fort', equipment: ['poids-du-corps'] },
  { id: 'bounding', name: 'Foulées bondissantes', instructions: 'Bonds amples et alternés, poussée vers l’avant, pose du pied active. Courtes séries qualitatives.', zones: LEGS_RUN, impact: 'fort', equipment: ['poids-du-corps'] },
  { id: 'pogo-jumps', name: 'Sauts de cheville (pogos)', instructions: 'Petits rebonds rapides sur l’avant-pied, genoux quasi tendus, contact au sol très bref.', zones: [CHEV, MOLL], impact: 'moyen', equipment: ['poids-du-corps'] },
  { id: 'med-ball-chest-throw', name: 'Lancer de médecine-ball à la poitrine', instructions: 'Pousse le ballon explosivement devant toi (mur ou partenaire), récupère, enchaîne en séries courtes.', zones: [EPA, MAIN], impact: 'faible', equipment: ['medecine-ball'] },
  { id: 'med-ball-slam', name: 'Slam de médecine-ball', instructions: 'Monte le ballon au-dessus de la tête, écrase-le au sol avec force en gardant le dos gainé.', zones: [EPA, DOS], impact: 'moyen', equipment: ['medecine-ball'] },
  { id: 'med-ball-rotational-throw', name: 'Lancer rotatif de médecine-ball', instructions: 'De profil au mur, tourne les hanches puis lance le ballon avec le tronc. Change de côté.', zones: [DOS, EPA], impact: 'faible', equipment: ['medecine-ball'] },
  { id: 'plyo-push-up', name: 'Pompes pliométriques', instructions: 'Descends, repousse assez fort pour décoller les mains, réceptionne les coudes fléchis.', zones: [EPA, MAIN], impact: 'moyen', equipment: ['poids-du-corps'] },
])

const VITESSE = category('vitesse', [
  { id: 'sprint-10m', name: 'Sprint 10 m départ arrêté', instructions: 'Départ fléchi, première accélération en poussant le sol, 10 m à fond. Récupération complète entre les répétitions.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'sprint-fly-30m', name: 'Sprint lancé 30 m', instructions: 'Accélération progressive puis 30 m à vitesse proche du maximum. Récupération complète entre les répétitions.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'sled-sprint-light', name: 'Sprint avec traîneau léger', instructions: 'Charge légère, penché en avant, accélère sur 10 à 20 m en poussant fort contre le sol.', zones: LEGS_RUN, impact: 'moyen', equipment: ['traineau'] },
  { id: 'change-of-direction', name: 'Changements de direction', instructions: 'Parcours en plots (type 5-10-5), ralentis en freinant bas, relance immédiatement.', zones: [QUAD, GEN, CHEV, MOLL], impact: 'fort', equipment: ['plots'] },
  { id: 'running-drills', name: 'Gammes de course', instructions: 'Montées de genoux, talons-fesses et skips, posture haute, rythme rapide sur 15 à 20 m.', zones: [QUAD, GEN, CHEV, MOLL], impact: 'moyen', equipment: ['poids-du-corps'] },
  { id: 'foot-fire', name: 'Appuis rapides sur place', instructions: 'Petits appuis très rapides sur l’avant-pied, buste légèrement penché, bras actifs.', zones: [CHEV, MOLL], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'wall-drill', name: 'Accélération contre un mur', instructions: 'Appui des mains au mur, corps incliné, alterne les genoux hauts avec poussée rapide du pied.', zones: [QUAD, CHEV, MOLL], impact: 'moyen', equipment: ['poids-du-corps'] },
  { id: 'bike-sprint', name: 'Sprint sur vélo', instructions: 'Sprint court maximal sur vélo, récupération complète entre les répétitions.', zones: [QUAD, GEN], impact: 'faible', equipment: ['velo'] },
  { id: 'skierg-sprint', name: 'Sprint sur ski-erg', instructions: 'Sprint court maximal, tirage puissant avec les bras et le tronc, récupération complète.', zones: [EPA, MAIN, DOS], impact: 'faible', equipment: ['ski-erg'] },
  { id: 'rower-sprint', name: 'Sprint sur rameur', instructions: 'Sprint court maximal, jambes puis dos puis bras, récupération complète entre les répétitions.', zones: [QUAD, GEN, DOS, EPA], impact: 'faible', equipment: ['rameur'] },
  { id: 'arm-drive', name: 'Mouvement de bras de sprint à l’élastique', instructions: 'Élastique tendu, mime le mouvement de bras de course rapidement et avec amplitude.', zones: [EPA], impact: 'faible', equipment: ['elastique'] },
])

const CONDITIONNEMENT = category('conditionnement', [
  { id: 'peak-blocks-run', name: 'Blocs de course aux pics du poste', instructions: 'Blocs de 1 à 5 minutes à l’allure des pics de match du poste (voir repères Read 2018), récupération entre les blocs.', zones: LEGS_RUN, impact: 'moyen', equipment: ['plots'], peak: true },
  { id: 'intermittent-15-15', name: 'Intermittent 15 s / 15 s', instructions: 'Alterne 15 s de course rapide et 15 s de récupération, vitesse calibrée sur ton test de référence (VMA ou 30-15 IFT).', zones: LEGS_RUN, impact: 'moyen', equipment: ['plots'] },
  { id: 'intermittent-30-30', name: 'Intermittent 30 s / 30 s', instructions: 'Alterne 30 s de course rapide et 30 s de récupération, vitesse calibrée sur ton test de référence.', zones: LEGS_RUN, impact: 'moyen', equipment: ['plots'] },
  { id: 'repeated-sprints', name: 'Sprints répétés', instructions: 'Séries de sprints courts avec récupération incomplète, qualité maintenue à chaque répétition.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'bike-intermittent', name: 'Vélo intermittent', instructions: 'Efforts intenses courts alternés avec récupération active sur vélo.', zones: [QUAD, GEN], impact: 'faible', equipment: ['velo'] },
  { id: 'rower-intermittent', name: 'Rameur intermittent', instructions: 'Efforts intenses courts alternés avec récupération active sur rameur, technique conservée.', zones: [QUAD, GEN, DOS, EPA], impact: 'faible', equipment: ['rameur'] },
  { id: 'skierg-intermittent', name: 'Ski-erg intermittent', instructions: 'Efforts intenses courts alternés avec récupération active sur ski-erg.', zones: [EPA, MAIN, DOS], impact: 'faible', equipment: ['ski-erg'] },
  { id: 'sled-push-conditioning', name: 'Poussée de traîneau intensive', instructions: 'Pousse un traîneau chargé sur 10 à 20 m, corps incliné, bras tendus, récupération entre les passages.', zones: [QUAD, GEN, CHEV, MOLL, ISCH, DOS, EPA], impact: 'moyen', equipment: ['traineau'] },
  { id: 'battle-ropes', name: 'Cordes ondulatoires', instructions: 'Ondulations rapides en alternant ou ensemble, intervalles courts, gainage maintenu.', zones: [EPA, MAIN], impact: 'faible', equipment: ['cordes'] },
  { id: 'arm-ergometer-intermittent', name: 'Ergomètre à bras intermittent', instructions: 'Efforts intenses courts alternés avec récupération active sur ergomètre à bras.', zones: [EPA, MAIN], impact: 'faible', equipment: ['ergometre-a-bras'] },
  { id: 'burpee-ground-get-ups', name: 'Relevés du sol enchaînés (burpees)', instructions: 'Descends au sol, relève-toi vite, saute légèrement, enchaîne pendant l’intervalle prescrit.', zones: [EPA, MAIN, QUAD, GEN, DOS], impact: 'moyen', equipment: ['poids-du-corps'] },
  { id: 'contact-circuit', name: 'Circuit de contacts simulés', instructions: 'Enchaîne poussées, plaquages sur sac et relevés au sol à intensité contrôlée, avec partenaire ou sac.', zones: [TETE, COU, EPA, DOS, QUAD, GEN], impact: 'fort', equipment: ['sac-de-plaquage', 'partenaire'], note: 'Réservé aux avants selon RC-2.4 de la veille (contacts simulés) ; intensité à encadrer.' },
  { id: 'scrum-push-simulated', name: 'Poussée de mêlée simulée', instructions: 'Poussée en position de mêlée contre un sac ou une machine, dos gainé, séries courtes.', zones: [TETE, COU, EPA, DOS, QUAD, GEN, CHEV], impact: 'fort', equipment: ['sac-de-plaquage', 'partenaire'], axial: true, note: 'Réservé aux avants (RC-2.4) ; intensité à encadrer.' },
])

const AEROBIE_LEGER = category('aerobie-leger', [
  { id: 'easy-bike', name: 'Vélo léger', instructions: 'Pédalage régulier à faible intensité, conversation possible.', zones: [QUAD, GEN], impact: 'faible', equipment: ['velo'] },
  { id: 'brisk-walk', name: 'Marche rapide', instructions: 'Marche soutenue en terrain plat, respiration confortable.', zones: [CHEV, MOLL], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'easy-jog', name: 'Footing très léger', instructions: 'Course lente et régulière, conversation possible, terrain souple si possible.', zones: [ISCH, QUAD, GEN, CHEV, MOLL], impact: 'moyen', equipment: ['poids-du-corps'] },
  { id: 'easy-rower', name: 'Rameur léger', instructions: 'Coups réguliers à faible intensité, technique propre, dos gainé.', zones: [QUAD, GEN, DOS, EPA], impact: 'faible', equipment: ['rameur'] },
  { id: 'easy-skierg', name: 'Ski-erg léger', instructions: 'Tirage régulier à faible intensité, respiration confortable.', zones: [EPA, MAIN, DOS], impact: 'faible', equipment: ['ski-erg'] },
  { id: 'pull-buoy-swim', name: 'Natation avec pull-buoy', instructions: 'Nage en crawl, bouée entre les cuisses pour immobiliser les jambes, allure facile.', zones: [EPA], impact: 'faible', equipment: ['piscine'] },
  { id: 'arm-ergometer-easy', name: 'Ergomètre à bras léger', instructions: 'Pédalage des bras à faible intensité, régulier.', zones: [EPA, MAIN], impact: 'faible', equipment: ['ergometre-a-bras'] },
  { id: 'rower-upper-body', name: 'Rameur haut du corps (jambes tendues)', instructions: 'Jambes tendues et calées, tire avec le dos et les bras à faible intensité.', zones: [EPA, MAIN, DOS], impact: 'faible', equipment: ['rameur'] },
])

const MOBILITE = category('mobilite-recuperation', [
  { id: 'hip-mobility', name: 'Mobilité des hanches', instructions: 'Cercles de hanches, fente basse et rotations lentes, sans douleur.', zones: [QUAD], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'thoracic-mobility', name: 'Mobilité thoracique', instructions: 'À quatre pattes ou allongé sur le côté, ouvre la cage thoracique en rotation lente.', zones: [], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'shoulder-mobility', name: 'Mobilité des épaules', instructions: 'Cercles de bras et passages de bâton ou d’élastique devant-derrière, sans douleur.', zones: [EPA], impact: 'faible', equipment: ['elastique'] },
  { id: 'ankle-mobility', name: 'Mobilité des chevilles', instructions: 'Genou vers l’avant au-dessus des orteils, talon au sol, mouvement lent.', zones: [CHEV, MOLL], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'hamstring-stretch', name: 'Étirement doux des ischios', instructions: 'Jambe tendue sur un support, penche-toi doucement jusqu’à une tension légère, sans rebond.', zones: [ISCH], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'foam-rolling', name: 'Rouleau de massage', instructions: 'Roule lentement sur les muscles tendus, ralentis sur les zones sensibles sans chercher la douleur vive.', zones: [], impact: 'faible', equipment: ['rouleau'] },
  { id: 'diaphragmatic-breathing', name: 'Respiration diaphragmatique', instructions: 'Allongé, inspire par le nez en gonflant le ventre, expire lentement. Quelques minutes au calme.', zones: [], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'recovery-walk', name: 'Marche de récupération', instructions: 'Marche tranquille de 20 à 30 minutes, sans objectif d’allure.', zones: [CHEV, MOLL], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'cat-camel', name: 'Chat-vache', instructions: 'À quatre pattes, alterne dos rond et dos creux lentement, au rythme de la respiration.', zones: [DOS], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'cervical-mobility', name: 'Mobilité cervicale douce', instructions: 'Rotations et inclinaisons lentes de la tête, amplitude confortable, sans forcer.', zones: [COU], impact: 'faible', equipment: ['poids-du-corps'] },
])

const TRONC = category('tronc', [
  { id: 'plank', name: 'Planche', instructions: 'Sur les avant-bras, corps aligné, abdominaux et fessiers serrés, respire normalement.', zones: [EPA, MAIN], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'side-plank', name: 'Planche latérale', instructions: 'Appui sur un avant-bras, bassin haut et aligné, tiens la position puis change de côté.', zones: [EPA], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'dead-bug', name: 'Dead bug', instructions: 'Sur le dos, bras et jambes en l’air, étends bras et jambe opposés sans décoller le bas du dos.', zones: [], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'bird-dog', name: 'Bird dog', instructions: 'À quatre pattes, étends un bras et la jambe opposée, dos stable, alterne les côtés.', zones: [EPA, GEN], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'pallof-press', name: 'Pallof press', instructions: 'De profil à une poulie ou un élastique, pousse les mains devant toi sans te laisser tourner.', zones: [EPA], impact: 'faible', equipment: ['poulie', 'elastique'] },
  { id: 'leg-raise', name: 'Relevés de jambes allongé', instructions: 'Allongé, bas du dos au sol, monte les jambes puis redescends lentement sans cambrer.', zones: [], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'reverse-crunch', name: 'Crunch inversé', instructions: 'Allongé, ramène les genoux vers la poitrine en enroulant le bassin, redescends contrôlé.', zones: [], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'cable-woodchop', name: 'Bûcheron à la poulie', instructions: 'Tire la poulie en diagonale en tournant le tronc et les hanches, bras tendus, contrôle le retour.', zones: [EPA, DOS], impact: 'faible', equipment: ['poulie'] },
  { id: 'ab-wheel', name: 'Roulette abdominale', instructions: 'À genoux, déroule la roue devant toi sans creuser le dos, reviens en contractant les abdominaux.', zones: [EPA, DOS], impact: 'faible', equipment: ['poids-du-corps'] },
])

const COU_EX = category('cou', [
  { id: 'neck-isometric', name: 'Cou en isométrique (4 directions)', instructions: 'Main ou partenaire en résistance, pousse la tête sans bouger en flexion, extension et côtés. Quelques secondes par direction.', zones: [COU], impact: 'faible', equipment: ['partenaire'] },
  { id: 'neck-band', name: 'Cou à l’élastique', instructions: 'Élastique fixé, tiens la position de la tête et résiste doucement dans chaque direction, mouvement lent.', zones: [COU], impact: 'faible', equipment: ['elastique'] },
  { id: 'neck-harness', name: 'Cou avec harnais et charge légère', instructions: 'Charge très légère, mouvement lent et contrôlé en flexion, extension et inclinaisons, sans à-coup.', zones: [COU], impact: 'faible', equipment: ['halteres'], note: 'Charge très légère uniquement ; à encadrer.' },
  { id: 'shrug-dumbbell', name: 'Haussements d’épaules', instructions: 'Haltères le long du corps, monte les épaules vers les oreilles, pause, redescends lentement.', zones: [COU, EPA, MAIN], impact: 'faible', equipment: ['halteres'] },
])

const ISCHIOS_EX = category('ischios-excentrique', [
  { id: 'nordic-curl', name: 'Nordic (descente des ischios)', instructions: 'À genoux, chevilles calées, descends le buste vers l’avant le plus lentement possible en gardant les hanches alignées, rattrape-toi avec les mains.', zones: [ISCH, GEN], impact: 'moyen', equipment: ['partenaire', 'poids-du-corps'], note: 'Preuves débattues : réduction des lésions d’environ 51 % selon van Dyk 2019, effet jugé incertain par Impellizzeri 2021.' },
  { id: 'nordic-assisted', name: 'Nordic assisté à l’élastique', instructions: 'Même mouvement avec un élastique qui réduit la charge, descente lente, remontée aidée.', zones: [ISCH, GEN], impact: 'faible', equipment: ['elastique', 'partenaire'], note: 'Preuves débattues (voir Nordic).' },
  { id: 'slider-leg-curl', name: 'Curl ischios sur glissières', instructions: 'Allongé, pieds sur des glissières, monte le bassin, étends les jambes lentement puis ramène-les.', zones: [ISCH, GEN], impact: 'faible', equipment: ['glissieres'] },
  { id: 'hip-extension-45', name: 'Extension de hanche à 45°', instructions: 'Sur banc incliné, penche le buste lentement, remonte en serrant les fessiers, dos plat.', zones: [DOS, ISCH], impact: 'faible', equipment: ['machine'] },
  { id: 'slow-romanian-deadlift', name: 'Soulevé de terre jambes tendues lent', instructions: 'Charge modérée, descente sur 3 à 4 secondes, dos plat, remonte en poussant les hanches.', zones: [DOS, ISCH, MAIN], impact: 'faible', equipment: ['barre'], axial: true },
  { id: 'single-leg-rdl', name: 'Soulevé de terre jambes tendues unilatéral', instructions: 'Sur une jambe, bascule le buste en reculant l’autre jambe, dos plat, remonte lentement.', zones: [DOS, ISCH, CHEV], impact: 'faible', equipment: ['halteres'] },
])

const PREVENTION = category('prevention', [
  { id: 'single-leg-balance', name: 'Équilibre sur une jambe', instructions: 'Tiens-toi sur une jambe, genou souple, bassin à niveau. Complique avec des mouvements de bras ou les yeux fermés.', zones: [CHEV, GEN], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'controlled-landing', name: 'Réception de saut contrôlée', instructions: 'Petit saut, réception amortie sur deux pieds, genoux alignés sur les pieds, tiens la position une seconde.', zones: [QUAD, GEN, CHEV], impact: 'moyen', equipment: ['poids-du-corps'] },
  { id: 'bodyweight-squat-control', name: 'Squat contrôlé au poids du corps', instructions: 'Pieds à largeur d’épaules, descends en gardant les genoux dans l’axe des pieds, remonte lentement.', zones: [QUAD, GEN, CHEV], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'lunge-control', name: 'Fente contrôlée', instructions: 'Grand pas, genou avant dans l’axe du pied, buste droit, reviens en poussant le talon.', zones: [QUAD, GEN, CHEV], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'controlled-side-step', name: 'Changement d’appui contrôlé', instructions: 'Pas latéral avec freinage, genou stable au-dessus du pied, relance contrôlée, vitesse progressive.', zones: [QUAD, GEN, CHEV], impact: 'moyen', equipment: ['plots'] },
  { id: 'copenhagen', name: 'Planche Copenhague (adducteurs)', instructions: 'En appui latéral sur l’avant-bras, jambe du dessus sur un banc, monte le bassin et tiens la position.', zones: [QUAD], impact: 'faible', equipment: ['banc'] },
  { id: 'lateral-band-walk', name: 'Marche latérale avec élastique', instructions: 'Élastique autour des cuisses ou des chevilles, pas latéraux en gardant la tension et le bassin stable.', zones: [QUAD], impact: 'faible', equipment: ['elastique'] },
  { id: 'scapular-stability', name: 'Stabilité d’épaule (Y-T-W)', instructions: 'Penché en avant, bras légers formant un Y, un T puis un W, omoplates serrées, mouvement lent.', zones: [EPA], impact: 'faible', equipment: ['halteres'] },
  { id: 'bridge-march', name: 'Pont fessier alterné', instructions: 'En position de pont, lève un pied puis l’autre sans que le bassin ne bascule.', zones: [ISCH], impact: 'faible', equipment: ['poids-du-corps'] },
])

export const EXERCISES: readonly Exercise[] = [
  ...FORCE_BAS,
  ...FORCE_HAUT,
  ...PUISSANCE,
  ...VITESSE,
  ...CONDITIONNEMENT,
  ...AEROBIE_LEGER,
  ...MOBILITE,
  ...TRONC,
  ...COU_EX,
  ...ISCHIOS_EX,
  ...PREVENTION,
  // Méthode ATP (intersaison et structure de séance) : voir atpLibrary.ts.
  ...ATP_EXERCISES,
]

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]))

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id)
}

export function exercisesOfCategory(category: ExerciseCategory): Exercise[] {
  return EXERCISES.filter((e) => e.category === category)
}

/** Exercices (d'une catégorie si précisée) qui ne sollicitent aucune des zones données. */
export function exercisesWithout(zones: readonly BodyZone[], category?: ExerciseCategory): Exercise[] {
  return EXERCISES.filter((e) => (category === undefined || e.category === category) && !e.zones.some((z) => zones.includes(z)))
}
