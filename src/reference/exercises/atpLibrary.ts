import type { BodyZone, Equipment, Exercise, ExerciseCategory, ImpactLevel } from '../../types/reference'

/*
 * Exercices de la méthode ATP Prépa Physique (programme d'intersaison « Beast Off-Season », source `atp-beast-off-season`).
 * Consignes reformulées depuis l'analyse du programme (aidd_docs/tasks/2026_10/2026_10_02_methode-atp/atp-methode.md),
 * sans reprendre le texte du PDF ni ses liens vidéo. Zones, impacts et matériel sont des jugements de conception (relecture kiné
 * recommandée, comme pour le reste de la bibliothèque). Identifiants stables : ne jamais les renommer.
 */

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
const JUMP: BodyZone[] = [QUAD, GEN, CHEV, MOLL]

interface Def {
  id: string
  name: string
  instructions: string
  zones: BodyZone[]
  impact: ImpactLevel
  equipment: Equipment[]
  axial?: boolean
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
  }))
}

const FORCE_BAS = category('force-bas', [
  { id: 'deadlift', name: 'Soulevé de terre', instructions: 'Barre au-dessus du milieu du pied, dos plat, pousse le sol et verrouille les hanches en haut sans te cambrer. Repose la barre avec contrôle.', zones: [DOS, ISCH, QUAD, GEN, MAIN], impact: 'faible', equipment: ['barre'], axial: true },
  { id: 'atg-lunge', name: 'Fente profonde chargée (ATG)', instructions: 'Grand pas, descends le plus bas possible en gardant le genou avant aligné sur le pied. Charge lourde, jamais la barre à vide, plus lourd que la semaine d’avant.', zones: [QUAD, GEN, CHEV], impact: 'faible', equipment: ['halteres'] },
  { id: 'back-rack-lunge', name: 'Fente barre sur le dos', instructions: 'Barre sur les trapèzes, fente arrière contrôlée, buste droit, remonte en poussant le talon avant. Charge lourde mais stable.', zones: [DOS, QUAD, GEN, CHEV], impact: 'faible', equipment: ['barre', 'rack'], axial: true },
  { id: 'zombie-squat', name: 'Zombie squat', instructions: 'Barre posée sur l’avant des épaules, bras tendus devant sans la tenir. Squat lent et profond, buste droit, pour la mobilité et la posture.', zones: [QUAD, GEN, DOS, CHEV], impact: 'faible', equipment: ['barre'] },
  { id: 'rdl-barbell-row', name: 'Soulevé roumain + rowing barre', instructions: 'Descends en soulevé roumain, garde la position penchée et fais un rowing, puis remonte. Lourd, dos plat.', zones: [DOS, ISCH, MAIN, EPA], impact: 'faible', equipment: ['barre'], axial: true },
  { id: 'waiter-squat', name: 'Squat du serveur', instructions: 'Haltère ou kettlebell tenu bras tendu au-dessus de la tête, squat lent sans perdre l’alignement du bras.', zones: [EPA, QUAD, GEN], impact: 'faible', equipment: ['kettlebell'] },
])

const FORCE_HAUT = category('force-haut', [
  { id: 'bench-warmup-grips', name: 'Développé couché léger, 3 prises', instructions: 'Barre légère : 4 répétitions prise serrée, 4 prise moyenne, 4 prise large. Échauffement des épaules, sans fatigue.', zones: [EPA, MAIN], impact: 'faible', equipment: ['barre', 'banc'] },
  { id: 'step-push-up', name: 'Pompe avec montée et descente de marche', instructions: 'En position de pompe, monte une main puis l’autre sur un step, redescends, fais une pompe. Gainage serré.', zones: [EPA, MAIN], impact: 'faible', equipment: ['box'] },
  { id: 'kb-curl-front-raise', name: 'Curl + élévation frontale en squat tenu', instructions: 'En squat isométrique, fais un curl à la kettlebell puis une élévation frontale, sans te relever.', zones: [EPA, MAIN, QUAD], impact: 'faible', equipment: ['kettlebell'] },
  { id: 'push-up-tripod', name: 'Pompe + trépied en quadrupédie', instructions: 'Une pompe, puis en quadrupédie genoux décollés, lève une main et le pied opposé en restant stable.', zones: [EPA, MAIN], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'kb-bottom-up-press', name: 'Développé kettlebell à l’envers en fente', instructions: 'En fente basse, kettlebell tenue la base en l’air, développé lent au-dessus de la tête sans la laisser basculer.', zones: [EPA, MAIN], impact: 'faible', equipment: ['kettlebell'] },
  { id: 'banded-alternating-row', name: 'Rowing alterné dynamique à l’élastique', instructions: 'Élastique résistant, tire un bras puis l’autre avec vitesse, omoplates serrées, buste fixe.', zones: [EPA, MAIN], impact: 'faible', equipment: ['elastique'] },
  { id: 'quadruped-row', name: 'Rowing en quadrupédie', instructions: 'En appui sur un genou et une main (entre deux bancs possible), tire un haltère lourd sans tourner le buste.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres', 'banc'] },
  { id: 'quadruped-row-drop-catch', name: 'Rowing en quadrupédie, lâcher-rattraper', instructions: 'Rowing en quadrupédie : en haut, lâche l’haltère et rattrape-le aussitôt, puis redescends contrôlé.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres', 'banc'] },
  { id: 'single-arm-bench-one-foot', name: 'Développé couché 1 bras, 1 pied décollé', instructions: 'Allongé sur le banc, un pied levé, développé à un bras lourd. Le gainage empêche le corps de tourner.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres', 'banc'] },
  { id: 'curl-javelin-press', name: 'Curl + développé javelot', instructions: 'Curl à un bras, puis poussée au-dessus de la tête en fente, comme un lancer de javelot. Charge contrôlée.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres'] },
  { id: 'rotational-one-arm-row', name: 'Rowing 1 bras avec rotation', instructions: 'Rowing unilatéral debout, laisse le buste tourner en fin de tirage. Travaille les obliques et l’équilibre.', zones: [EPA, MAIN, DOS], impact: 'faible', equipment: ['halteres'] },
  { id: 'incline-dumbbell-press', name: 'Développé incliné', instructions: 'Banc incliné, haltères ou barre, descends au contact de la poitrine haute et pousse fort. Lourd.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres', 'banc'] },
  { id: 'upright-row', name: 'Rowing menton', instructions: 'Barre ou kettlebell près du corps, tire jusqu’au bas de la poitrine, coudes plus hauts que les mains, sans douleur d’épaule.', zones: [EPA, MAIN], impact: 'faible', equipment: ['barre'] },
  { id: 'incline-fly', name: 'Écarté incliné aux haltères', instructions: 'Banc incliné, bras légèrement fléchis, ouvre en contrôlant l’étirement puis referme.', zones: [EPA], impact: 'faible', equipment: ['halteres', 'banc'] },
  { id: 'kneeling-cross-fly', name: 'Écarté croisé à genoux', instructions: 'À genoux face à la poulie ou à l’élastique, croise les bras devant toi, contrôle le retour.', zones: [EPA], impact: 'faible', equipment: ['poulie'] },
  { id: 'glute-bridge-floor-press', name: 'Développé au sol en pont fessier', instructions: 'Allongé au sol, bassin levé en pont, développé avec deux haltères en gardant les hanches hautes.', zones: [EPA, MAIN, ISCH], impact: 'faible', equipment: ['halteres'] },
  { id: 'eccentric-barbell-curl', name: 'Curl barre, descente en 5 s', instructions: 'Curl lourd, puis descente vraiment lente : 5 secondes, pas 3.', zones: [MAIN], impact: 'faible', equipment: ['barre'] },
  { id: 'superman-banded-row', name: 'Tirage à l’élastique en superman', instructions: 'Allongé sur le ventre, poitrine décollée, tire l’élastique en serrant les omoplates.', zones: [EPA, DOS], impact: 'faible', equipment: ['elastique'] },
  { id: 'band-deadlift-row', name: 'Soulevé à l’élastique + rowing 1 bras', instructions: 'Soulevé de terre à l’élastique, puis rowing d’un bras en position penchée. Échauffement de la chaîne postérieure.', zones: [DOS, EPA, MAIN], impact: 'faible', equipment: ['elastique'] },
  { id: 'arnold-z-press', name: 'Développé Arnold 1 bras assis au sol', instructions: 'Assis jambes tendues, haltère à une main, développé avec rotation du poignet, sans t’aider du dos.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres'] },
  { id: 'bird-dog-row', name: 'Rowing en bird dog', instructions: 'En quadrupédie, une jambe tendue derrière, rowing de la main opposée. Lourd mais stable.', zones: [EPA, MAIN, DOS], impact: 'faible', equipment: ['kettlebell'] },
  { id: 'weighted-push-up-dumbbells', name: 'Pompe lestée sur haltères', instructions: 'Mains sur les haltères, disque sur le dos, descends bas et pousse fort.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres'] },
  { id: 'muscle-clean-press', name: 'Muscle clean + développé', instructions: 'Barre légère tirée jusqu’aux épaules sans flexion des jambes, puis développé au-dessus de la tête.', zones: [EPA, MAIN, DOS], impact: 'faible', equipment: ['barre'] },
  { id: 'barbell-front-raise', name: 'Élévation frontale à la barre', instructions: 'Barre légère, bras presque tendus, monte à hauteur d’yeux, redescends lentement.', zones: [EPA], impact: 'faible', equipment: ['barre'] },
  { id: 'rear-delt-fly', name: 'Oiseau', instructions: 'Buste penché, haltères légers, ouvre les bras sur les côtés en serrant l’arrière des épaules.', zones: [EPA], impact: 'faible', equipment: ['halteres'] },
  { id: 'triceps-extension', name: 'Extension des triceps', instructions: 'Haltère ou élastique, coudes fixes, tends les bras complètement puis reviens lentement.', zones: [MAIN, EPA], impact: 'faible', equipment: ['halteres'] },
  { id: 'unilateral-floor-press', name: 'Développé au sol 1 bras', instructions: 'Allongé au sol, un haltère, coude qui touche le sol puis pousse, sans tourner le buste.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres'] },
  { id: 'hammer-curl', name: 'Curl marteau', instructions: 'Deux haltères, paumes face à face, monte sans balancer le buste.', zones: [MAIN], impact: 'faible', equipment: ['halteres'] },
  { id: 'paused-one-arm-row', name: 'Rowing 1 bras avec pause', instructions: 'Rowing unilatéral, marque 1 à 2 secondes de pause omoplate serrée en haut.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres', 'banc'] },
  { id: 'band-clean-press', name: 'Rowing menton + clean & press à l’élastique', instructions: 'Élastique sous les pieds : un rowing menton puis un épaulé-développé. Léger, propre.', zones: [EPA, MAIN], impact: 'faible', equipment: ['elastique'] },
])

const PUISSANCE = category('puissance', [
  { id: 'push-press', name: 'Push press', instructions: 'Barre sur l’avant des épaules, petite flexion des jambes et poussée explosive au-dessus de la tête. Lourd, plus que la semaine d’avant.', zones: [EPA, MAIN, DOS, QUAD, GEN], impact: 'moyen', equipment: ['barre', 'rack'], axial: true },
  { id: 'drop-lunge-jump', name: 'Drop lunge, amorti puis saut', instructions: 'Laisse-toi tomber en fente, amortis net, puis saute le plus haut possible en restant gainé et aligné.', zones: JUMP, impact: 'fort', equipment: ['poids-du-corps'] },
  { id: 'drop-lunge-split-jump', name: 'Drop lunge + double fente sautée', instructions: 'Chute en fente, amorti, puis deux fentes sautées enchaînées avec des appuis toniques.', zones: JUMP, impact: 'fort', equipment: ['poids-du-corps'] },
  { id: 'drop-jump-broad-jump', name: 'Drop jump, pas latéral et broad jump', instructions: 'Saut en contrebas, rebond vertical, pas latéral puis saut en longueur. Réceptions stables.', zones: JUMP, impact: 'fort', equipment: ['box'] },
  { id: 'loaded-stato-dynamic-lunge', name: 'Fente stato-dynamique chargée', instructions: 'Fente avec charge, pause marquée en bas, remontée explosive. La charge doit laisser de la vitesse.', zones: [QUAD, GEN, CHEV], impact: 'moyen', equipment: ['halteres'] },
  { id: 'banded-lateral-bound', name: 'Pas latéral explosif avec élastique', instructions: 'Élastique à la taille, pousse fort latéralement, réception stable sur une jambe.', zones: JUMP, impact: 'moyen', equipment: ['elastique'] },
  { id: 'clean-rotation-fend', name: 'Épaulé + rotation + raffût', instructions: 'Épaulé, rotation du buste puis poussée d’un bras comme un raffût, vitesse maximale. Avants : lourd. Arrières : léger et explosif.', zones: [EPA, MAIN, DOS, QUAD, GEN], impact: 'moyen', equipment: ['halteres'] },
  { id: 'clean-fend-split-jump', name: 'Épaulé, raffût et double fente sautée', instructions: 'Épaulé, rotation et raffût, puis deux fentes sautées. Appuis toniques.', zones: [EPA, MAIN, DOS, QUAD, GEN, CHEV], impact: 'fort', equipment: ['halteres'] },
  { id: 'landmine-lateral-step', name: 'Pas latéral au landmine', instructions: 'Barre en landmine tenue devant toi, pas latéral explosif et poussée de la barre. Un haltère peut la remplacer.', zones: [EPA, MAIN, QUAD, GEN], impact: 'moyen', equipment: ['barre'] },
  { id: 'sumo-deadlift-high-pull', name: 'Tirage haut sumo (SDHP)', instructions: 'Pieds larges, explose avec les jambes et tire la barre ou la kettlebell jusqu’au menton, coudes hauts.', zones: [DOS, EPA, MAIN, QUAD], impact: 'moyen', equipment: ['barre'], axial: true },
  { id: 'banded-broad-jump', name: 'Broad jump avec élastique', instructions: 'Élastique à la taille qui retient, saute le plus loin possible, réception stable.', zones: JUMP, impact: 'fort', equipment: ['elastique'] },
  { id: 'drop-jump-landing', name: 'Drop jump + amorti', instructions: 'Tombe d’une petite hauteur et fige la réception : genoux alignés, hanches en arrière.', zones: JUMP, impact: 'moyen', equipment: ['box'] },
  { id: 'tuck-lateral-broad-jump', name: 'Saut groupé, double pas latéral, broad jump', instructions: 'Saut groupé, deux pas latéraux rapides puis saut en longueur, un côté puis l’autre.', zones: JUMP, impact: 'fort', equipment: ['poids-du-corps'] },
  { id: 'vertical-double-broad-jump', name: 'Saut vertical + double broad jump', instructions: 'Saut vertical, réception, puis deux sauts en longueur enchaînés.', zones: JUMP, impact: 'fort', equipment: ['poids-du-corps'] },
  { id: 'tackle-bag-complex', name: 'Complexe avec plaquage sur sac', instructions: 'Enchaînement d’appuis puis plaquage sur sac, relevé rapide. Sans sac, une accélération de 2 à 3 m.', zones: [EPA, COU, QUAD, GEN, CHEV], impact: 'fort', equipment: ['sac-de-plaquage'] },
  { id: 'lateral-pogo', name: 'Pogo latéral', instructions: 'Petits rebonds latéraux sur l’avant du pied, chevilles raides, contacts courts.', zones: [CHEV, MOLL], impact: 'moyen', equipment: ['poids-du-corps'] },
  { id: 'single-leg-hop', name: 'Sauts sur une jambe', instructions: 'Petits sauts rythmés sur une jambe (ou corde à sauter sur un pied), genou stable.', zones: [CHEV, MOLL, GEN], impact: 'moyen', equipment: ['poids-du-corps'] },
  { id: 'split-squat-jump', name: 'Fente sautée alternée', instructions: 'Fente basse, saute et change de jambe en l’air, réception amortie.', zones: JUMP, impact: 'fort', equipment: ['poids-du-corps'] },
])

const VITESSE = category('vitesse', [
  { id: 'in-out-lateral-steps', name: 'Pas latéraux in & out', instructions: 'Pas latéraux rapides en dedans et en dehors d’une ligne, plante tes appuis dans le sol.', zones: [QUAD, GEN, CHEV], impact: 'moyen', equipment: ['plots'] },
  { id: 'accel-decel', name: 'Accélération-décélération', instructions: 'Accélère sur quelques mètres puis freine en abaissant le centre de gravité, de plus en plus vite.', zones: LEGS_RUN, impact: 'moyen', equipment: ['plots'] },
  { id: 'lateral-sprint', name: 'Sprint latéral', instructions: 'Pas chassés rapides sur 5 m, buste face à l’avant, appuis toniques.', zones: [QUAD, GEN, CHEV], impact: 'moyen', equipment: ['plots'] },
  { id: 'zigzag-footwork', name: 'Appuis en zigzag', instructions: 'Aller-retour de 4 m en zigzag, appuis courts et rapides, regard devant.', zones: [QUAD, GEN, CHEV], impact: 'moyen', equipment: ['plots'] },
  { id: 'lateral-steps-accel', name: 'Pas latéraux + accélération', instructions: 'Deux pas latéraux in & out puis accélération de 5 m dès la réception.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'lateral-step-sprint', name: 'Pas latéral + sprint de 10-15 m', instructions: 'Aller-retour en pas latéral puis sprint de 10 à 15 m, en changeant de côté à chaque passage.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'short-accel-decel', name: 'Accélérations-freinages très courts', instructions: 'Allers-retours d’accélération et de freinage sur 2 à 3 m, appuis toniques.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'triangle-cod', name: 'Triangle de changements de direction', instructions: 'Trois plots à 5-10 m, touche chaque plot trois fois le plus vite possible. Arrières : demi-tour complet ; avants : avant puis arrière.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'cod-course', name: 'Parcours explosivité et changements de direction', instructions: 'Parcours de plots à 4-7 m, un passage par côté, freinages et relances nets.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'linear-sprint-ladder', name: 'Sprints linéaires 15, 20 et 25 m', instructions: '5 × 15 m, 4 × 20 m, 3 × 25 m, départ arrêté. 1 min entre les sprints, 3 min entre les blocs. Première fois : retire 5 m à chaque distance.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'multidirectional-sprint-45-90', name: 'Sprint multidirectionnel 45° et 90°', instructions: '5 m en pas chassés, 5-10 m tout droit, deux virages à 45°, un à 90° puis 10-15 m. Accélère, freine, réaccélère. 30 s à 1 min puis l’autre côté.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'multidirectional-sprint-90', name: 'Sprint avec virages à 90°', instructions: '5-7 m tout droit, trois virages à 90°, 5-7 m d’accélération puis 5-7 m de freinage progressif. Changements d’appuis efficaces.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'lateral-hop-test', name: 'Test : saut latéral sur une jambe', instructions: 'Départ sur une jambe, saute le plus loin possible sur le côté et tiens la réception. 5 essais par jambe, 1 min 30 à 2 min entre les essais. Note le meilleur en cm, jambe gauche et jambe droite.', zones: JUMP, impact: 'fort', equipment: ['poids-du-corps'] },
  { id: 't-test-drill', name: 'Test : T-test', instructions: '10 m en avant, 5 m à gauche, 10 m à droite, 5 m à gauche, 10 m en arrière. 3 essais, récupération libre, note le meilleur temps.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'broad-jump-test', name: 'Test : broad jump', instructions: 'Saut en longueur sans élan, pieds joints, réception tenue. 5 essais, 1 min 30 à 2 min de repos, note le meilleur en cm.', zones: JUMP, impact: 'fort', equipment: ['poids-du-corps'] },
])

const CONDITIONNEMENT = category('conditionnement', [
  { id: 'burpee', name: 'Burpee', instructions: 'Poitrine au sol puis relevé rapide et saut, comme un relevé après un plaquage.', zones: [EPA, MAIN, QUAD, GEN], impact: 'moyen', equipment: ['poids-du-corps'] },
  { id: 'progressive-shuttles', name: 'Navettes de montée en régime', instructions: 'Navettes 0-20, 0-40 puis 0-60 m à allure croissante, deux fois, avant le bloc principal.', zones: LEGS_RUN, impact: 'moyen', equipment: ['plots'] },
  { id: 'shuttle-burpee-pyramid', name: 'Pyramide navettes + burpees', instructions: 'Trois parties par série : navettes 10/22/40 m, puis 20/40/60/40/20 m, puis 40/22/10 m, un burpee à chaque extrémité. 1 puis 2 min entre les parties, 3 min entre les séries.', zones: [...LEGS_RUN, EPA, MAIN], impact: 'fort', equipment: ['plots'] },
  { id: 'every-30s-shuttles', name: 'Départ toutes les 30 s', instructions: 'À chaque départ : burpee + 5 m, burpee + 5 m retour, burpee + 22 m, demi-tour + 22 m. Plus tu vas vite, plus tu récupères. 5 départs par série, 2 min 30 entre les séries.', zones: [...LEGS_RUN, EPA, MAIN], impact: 'fort', equipment: ['plots'] },
  { id: 'amrap-shuttles-burpees', name: 'AMRAP navettes et passages au sol', instructions: 'Le plus de tours possible dans le temps : on alterne un circuit au sol (burpees, fentes sautées, chenilles) et un circuit de navettes. Intensité maximale.', zones: [...LEGS_RUN, EPA, MAIN], impact: 'fort', equipment: ['plots'] },
  { id: 'bronco-test', name: 'Test : Bronco', instructions: '5 tours le plus vite possible de navettes 0-20-0, 0-40-0 et 0-60-0 m (1 200 m). Échauffe-toi sur les mêmes distances. Note ton temps.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'run-burpee-intervals', name: 'Intervalles course + burpees', instructions: '30 s de course en distance maximale, 15-30 s de repos, 30 s de burpees, 15-30 s de repos. 6 à 10 passages.', zones: [...LEGS_RUN, EPA, MAIN], impact: 'fort', equipment: ['plots'] },
  { id: 'max-distance-30-15', name: 'Courses 30 s / 15 s', instructions: '10 courses de 30 s en distance maximale, 15 s de repos entre chaque. Deux blocs, 3 min entre les blocs.', zones: LEGS_RUN, impact: 'fort', equipment: ['plots'] },
  { id: 'field-circuit-20-10', name: 'Circuit 20 s / 10 s', instructions: '9 tours de 20 s d’effort et 10 s de repos sur 4 exercices : navette latérale 0-5-0-10-0-15, burpees, fentes sautées, climbers. 2 min entre les tours.', zones: [...LEGS_RUN, EPA, MAIN], impact: 'fort', equipment: ['plots'] },
  { id: 'atp-gym-finisher', name: 'Finisher crosstraining', instructions: 'Circuit de fin de séance au format de la semaine (intervalles, tours chronométrés ou échelle). Toujours facultatif : garde de l’énergie pour le terrain.', zones: [QUAD, GEN, EPA, MAIN, DOS], impact: 'moyen', equipment: ['halteres', 'kettlebell'] },
  { id: 'atp-field-finisher', name: 'Finisher terrain', instructions: '3 à 5 séries de pliométrie légère, d’unilatéral et de gainage, 1 à 3 min de repos. Seulement s’il reste de l’énergie dans les jambes.', zones: JUMP, impact: 'moyen', equipment: ['poids-du-corps'] },
  { id: 'duck-walk', name: 'Marche du canard', instructions: 'Marche accroupie, buste droit, petits pas, sur une vingtaine de mètres.', zones: [QUAD, GEN], impact: 'faible', equipment: ['poids-du-corps'] },
])

const MOBILITE = category('mobilite-recuperation', [
  { id: 'lower-mobility-flow', name: 'Mobilité du bas du corps', instructions: '3 à 5 min de mobilité guidée des hanches, chevilles et dos avant la séance.', zones: [QUAD], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'upper-self-massage', name: 'Automassage du haut du corps', instructions: '3 à 5 min au rouleau ou à la balle : dos, pectoraux, épaules.', zones: [EPA], impact: 'faible', equipment: ['rouleau'] },
  { id: 'butterfly-hip', name: 'Papillon', instructions: 'Assis, plantes de pieds collées, ouvre et ferme les genoux de façon active.', zones: [QUAD], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'adductor-stretch-rotation', name: 'Étirement des adducteurs avec rotation', instructions: 'En appui sur un genou, jambe tendue sur le côté, bascule le bassin et tourne la hanche vers l’extérieur puis l’intérieur.', zones: [QUAD], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'cossack-squat', name: 'Cossack squat', instructions: 'Pieds très écartés, descends sur une jambe en gardant l’autre tendue, talon au sol. Alterne.', zones: [QUAD, GEN, CHEV], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'hip-rotation-band', name: 'Rotation de hanche avec élastique', instructions: 'Mini-band ou élastique : rotations externes debout, puis internes assis, lentes et contrôlées.', zones: [QUAD], impact: 'faible', equipment: ['elastique'] },
  { id: 'overhead-squat-mobility', name: 'Squat bras au-dessus de la tête', instructions: 'Bâton, élastique ou barre à vide tenu bras tendus au-dessus de la tête, squat dans l’amplitude maîtrisée.', zones: [EPA, QUAD, GEN, DOS], impact: 'faible', equipment: ['barre'] },
  { id: 'airplane', name: 'Avion', instructions: 'Sur une jambe, buste penché, ouvre puis ferme le bassin lentement en gardant l’équilibre.', zones: [QUAD, CHEV], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'hip-flexor-drill', name: 'Fléchisseurs de hanche', instructions: 'Montées de genou contrôlées ou fente basse étirée, pour ouvrir l’avant de la hanche.', zones: [QUAD], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'seated-l-fly', name: 'Ouvertures en L assis', instructions: 'Assis, coude à 90° posé sur le genou, rotation externe lente avec un haltère léger.', zones: [EPA], impact: 'faible', equipment: ['halteres'] },
  { id: 'jefferson-curl', name: 'Jefferson curl', instructions: 'Debout sur un step, charge légère, enroule le dos vertèbre par vertèbre vers le bas puis remonte lentement.', zones: [DOS, ISCH], impact: 'faible', equipment: ['halteres', 'box'] },
  { id: 'ballistic-kick-rdl', name: 'Kick balistique + soulevé roumain', instructions: 'Lance une jambe tendue devant toi, puis enchaîne un soulevé roumain sur une jambe.', zones: [ISCH, QUAD], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'iso-t', name: 'T isométrique', instructions: 'Penché en avant, bras tendus sur les côtés en T, tiens 20 à 30 s en serrant les omoplates.', zones: [EPA], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'band-rotator-iso', name: 'Coiffe des rotateurs en isométrie', instructions: 'Assis, élastique tenu coude au corps, tiens la rotation externe 30 s sans bouger.', zones: [EPA], impact: 'faible', equipment: ['elastique'] },
])

const TRONC = category('tronc', [
  { id: 'unilateral-oblique', name: 'Obliques unilatéraux', instructions: 'Landmine ou haltère d’un côté, flexion et rotation du buste sur toute l’amplitude, contrôlée.', zones: [DOS], impact: 'faible', equipment: ['halteres'] },
  { id: 'superman-hold', name: 'Superman tenu avec élastique', instructions: 'Allongé sur le ventre, bras et jambes levés, élastique tendu entre les mains. Tiens la position.', zones: [DOS], impact: 'faible', equipment: ['elastique'] },
  { id: 'swissball-stir', name: 'Gainage dynamique sur swissball', instructions: 'Avant-bras sur le ballon, corps gainé, dessine de petits cercles sans creuser le dos.', zones: [EPA, DOS], impact: 'faible', equipment: ['medecine-ball'] },
  { id: 'get-up', name: 'Relevé (get-up)', instructions: 'Allongé, relève-toi jusqu’à debout puis redescends, le plus fluide possible, sans les mains si tu peux.', zones: [EPA, MAIN, QUAD, GEN], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'kb-filly-walk', name: 'Marche avec kettlebell tenue', instructions: 'Kettlebell tenue d’un côté, marche 10 m en restant droit, sans pencher. Change de côté.', zones: [MAIN, EPA], impact: 'faible', equipment: ['kettlebell'] },
  { id: 'overhead-band-lateral-walk', name: 'Marche latérale élastique au-dessus de la tête', instructions: 'Élastique aux genoux, un autre tendu bras levés, pas latéraux sans perdre la tension.', zones: [EPA, QUAD], impact: 'faible', equipment: ['elastique'] },
  { id: 'iso-lunge-rotation', name: 'Fente isométrique avec rotation du buste', instructions: 'En fente tenue, tourne le buste avec une charge légère. Tu dois sentir les obliques.', zones: [QUAD, DOS], impact: 'faible', equipment: ['halteres'] },
  { id: 'russian-twist-unilateral', name: 'Russian twist unilatéral', instructions: 'Assis, buste incliné, rotations d’un seul côté avec un poids, 40 s, puis l’autre côté.', zones: [DOS], impact: 'faible', equipment: ['medecine-ball'] },
  { id: 'quadruped-band-rotation', name: 'Déplacement rotatif en quadrupédie', instructions: 'En quadrupédie genoux décollés, élastique qui tire sur le côté, avance sans laisser le buste tourner.', zones: [EPA, MAIN], impact: 'faible', equipment: ['elastique'] },
  { id: 'band-torso-rotation', name: 'Rotation du buste à l’élastique', instructions: 'Élastique fixé sur le côté, bras tendus, tourne le buste de façon contrôlée.', zones: [DOS], impact: 'faible', equipment: ['elastique'] },
  { id: 'hollow-hold', name: 'Position creuse (hollow)', instructions: 'Allongé sur le dos, bas du dos plaqué, jambes et épaules décollées. Tiens.', zones: [DOS], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'dynamic-side-plank', name: 'Planche latérale dynamique', instructions: 'En planche latérale, descends le bassin et remonte de façon contrôlée.', zones: [EPA], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'glute-bridge-walkout', name: 'Pont fessier, pas en avant et en arrière', instructions: 'En pont, avance les pieds à petits pas puis reviens, bassin haut.', zones: [ISCH], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'dumbbell-bear-crawl', name: 'Quadrupédie avec haltères', instructions: 'En quadrupédie genoux décollés, mains sur deux haltères, avance puis recule de 10 m.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres'] },
  { id: 'shoulder-tap-quadruped', name: 'Touches d’épaule en quadrupédie', instructions: 'En quadrupédie genoux décollés, touche l’épaule opposée sans bouger le bassin.', zones: [EPA, MAIN], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'quadruped-transfer', name: 'Transfert d’haltère en quadrupédie', instructions: 'En quadrupédie, fais passer un haltère d’un côté à l’autre sous le corps sans tourner le bassin.', zones: [EPA, MAIN], impact: 'faible', equipment: ['halteres'] },
  { id: 'suitcase-hold', name: 'Valise tenue lourde', instructions: 'Charge lourde d’un côté, tiens debout sans te pencher, 30 s par côté.', zones: [MAIN, DOS], impact: 'faible', equipment: ['halteres'] },
  { id: 'tripod-plank', name: 'Planche sur trois appuis', instructions: 'En planche, lève un bras ou une jambe et tiens 30 s sans bouger le bassin.', zones: [EPA], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'med-ball-plank-row', name: 'Planche sur médecine-ball + rowing', instructions: 'Une main sur le médecine-ball, rowing élastique de l’autre, corps gainé.', zones: [EPA, MAIN], impact: 'faible', equipment: ['medecine-ball', 'elastique'] },
  { id: 'weighted-plank', name: 'Planche lestée', instructions: 'Planche sur les coudes, disques sur le dos. Si tu tiens plus de 40 s d’affilée, c’est trop léger.', zones: [EPA, DOS], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'v-up', name: 'V-up', instructions: 'Allongé, monte jambes et buste en même temps pour former un V, redescends contrôlé.', zones: [DOS], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'weighted-hollow', name: 'Position creuse lestée', instructions: 'Hollow avec un poids tenu bras tendus, 20 à 40 s.', zones: [DOS], impact: 'faible', equipment: ['halteres'] },
  { id: 'unilateral-bar-hold', name: 'Maintien de barre à une main', instructions: 'Barre tenue au milieu d’une main, bras tendu, 30 s sans la laisser pencher.', zones: [MAIN], impact: 'faible', equipment: ['barre'] },
  { id: 'kneeling-split-rotation', name: 'Rotation à genoux en position bulgare', instructions: 'Un genou au sol, pied arrière surélevé, rotation du buste avec un poids.', zones: [QUAD, DOS], impact: 'faible', equipment: ['halteres'] },
])

const COU_EX = category('cou', [
  { id: 'neck-iso-row', name: 'Cou en isométrie + rowing', instructions: 'Tête tenue fixe contre une résistance (élastique ou main), rowing lourd en même temps.', zones: [COU, EPA], impact: 'faible', equipment: ['elastique', 'halteres'] },
  { id: 'weighted-neck-curl', name: 'Flexion du cou lestée avec pause', instructions: 'Allongé, disque léger sur le front protégé, flexion lente du cou, pause en haut.', zones: [COU], impact: 'faible', equipment: ['poids-du-corps'] },
])

const ISCHIOS_EX = category('ischios-excentrique', [
  { id: 'single-leg-nordic-plank', name: 'Planche chinoise', instructions: 'Épaules sur un banc, corps tendu à l’horizontale, talons au sol ou sur un pied. Tiens 30 s (40-60 s sur deux pieds).', zones: [ISCH], impact: 'faible', equipment: ['banc'] },
])

const PREVENTION = category('prevention', [
  { id: 'partner-proprioception', name: 'Proprioception à deux', instructions: 'Sur un pied, garde l’équilibre pendant que ton partenaire te pousse doucement. Seul : yeux fermés. 30 s par pied.', zones: [CHEV, GEN], impact: 'faible', equipment: ['partenaire'] },
  { id: 'athletic-lunge', name: 'Fente athlétique', instructions: 'Fente au poids du corps avec coordination des bras, genou arrière qui remonte haut et se stabilise.', zones: [QUAD, GEN, CHEV], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'proprioception-3d', name: 'Proprioception 3D', instructions: 'Sur un pied, touche le sol devant, sur le côté et derrière avec l’autre pied, sans perdre l’équilibre. Avec ballon si possible.', zones: [CHEV, GEN], impact: 'faible', equipment: ['poids-du-corps'] },
  { id: 'band-pull-apart', name: 'Écartés à l’élastique (BPA)', instructions: 'Bras tendus devant, écarte l’élastique jusqu’à la poitrine en serrant les omoplates.', zones: [EPA], impact: 'faible', equipment: ['elastique'] },
  { id: 'cuban-press', name: 'Cuban press', instructions: 'Haltères légers : rowing menton, rotation externe des épaules puis développé. Lent.', zones: [EPA], impact: 'faible', equipment: ['halteres'] },
  { id: 'rhomboid-band', name: 'Tirage des rhomboïdes à l’élastique', instructions: 'Tirage horizontal léger à l’élastique, omoplates serrées à chaque répétition, qualité avant tout.', zones: [EPA], impact: 'faible', equipment: ['elastique'] },
  { id: 'mini-band-proprioception', name: 'Proprioception avec mini-band', instructions: 'Mini-band aux genoux, sur une jambe, pousse le genou vers l’extérieur et tiens l’équilibre 30 s.', zones: [CHEV, GEN, QUAD], impact: 'faible', equipment: ['elastique'] },
  { id: 'loaded-tiptoe-march', name: 'Marche sur pointes genoux hauts, chargé', instructions: 'Charge en main, marche sur la pointe des pieds en montant les genoux, 30 s.', zones: [MOLL, CHEV, MAIN], impact: 'faible', equipment: ['halteres'] },
  { id: 'single-leg-rdl-row', name: 'Soulevé sur une jambe + rowing', instructions: 'Soulevé roumain sur une jambe, rowing en bas, remonte. Équilibre et dos plat.', zones: [ISCH, EPA, CHEV], impact: 'faible', equipment: ['halteres'] },
  { id: 'single-leg-bent-over-bpa', name: 'Écartés élastique penché sur une jambe', instructions: 'Sur une jambe, buste penché, écarte l’élastique bras tendus. Équilibre et omoplates.', zones: [EPA, CHEV], impact: 'faible', equipment: ['elastique'] },
])

export const ATP_EXERCISES: readonly Exercise[] = [
  ...FORCE_BAS,
  ...FORCE_HAUT,
  ...PUISSANCE,
  ...VITESSE,
  ...CONDITIONNEMENT,
  ...MOBILITE,
  ...TRONC,
  ...COU_EX,
  ...ISCHIOS_EX,
  ...PREVENTION,
]
