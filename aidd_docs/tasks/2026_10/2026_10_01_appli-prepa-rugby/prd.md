# Appli de prépa physique rugby en complément du club

Une appli qui construit et ajuste chaque semaine un programme de musculation, de course et de récupération pour un rugbyman adulte. Elle tient compte de ses entraînements au club, de ses matchs, de son poste, de sa fatigue et de ses blessures.

> Sources : [brainstorm.md](brainstorm.md) (résumé de l'idée validé) et [etat-de-l-art-prepa-rugby.md](etat-de-l-art-prepa-rugby.md) (veille scientifique). Périmètre : première version.

## Contexte

La plupart des rugbymen amateurs et semi-professionnels s'entraînent deux ou trois fois par semaine au club. Ils n'ont pas de préparateur physique personnel. Ceux qui veulent progresser ajoutent des séances seuls, sans savoir les placer par rapport au club et au match, ni les doser selon leur fatigue.

Les outils existants se répartissent en trois familles :

- **Les plateformes pour coachs** (TeamBuildr, TrainHeroic) : elles supposent un encadrement.
- **Les montres connectées** : leurs scores de forme sont opaques et ignorent les contacts.
- **Les applis rugby grand public** (Rugby Prep, RugbyFit) : elles proposent des programmes par poste, mais rien dans leur documentation publique n'indique qu'elles intègrent la charge réelle du club et du match.

Ce qui distingue l'appli est l'**intégration de la charge réelle du club et des matchs** : chaque séance qu'elle propose tient compte de ce que le joueur a déjà fait ou va faire avec son club.

L'appli s'adresse à tout joueur et toute joueuse **majeurs** de rugby à XV, quel que soit leur niveau, qui veulent un programme personnel **en complément** de leur club. Elle s'installe depuis un simple lien sur téléphone, s'ouvre aussi sur ordinateur, fonctionne hors connexion et garde les données du joueur **sur son appareil**. Elle s'appuie sur une veille scientifique sourcée.

## Problème

Un joueur qui s'entraîne seul en plus du club fait face à quatre difficultés :

- **Placer ses séances.** Faire une séance de jambes lourde la veille d'un match, ou le lendemain d'un entraînement de contact, nuit à la performance et augmente le risque de blessure.
- **Doser selon la fatigue réelle.** Les séances du club, les matchs, le travail et le sommeil s'accumulent. Sans suivi, il se surcharge ou s'entraîne trop peu.
- **Savoir quoi travailler.** Il ne sait pas si son vrai manque est la force, la vitesse ou l'endurance par rapport aux joueurs de son poste.
- **Gérer une blessure.** Il arrête tout, ou continue des exercices qui aggravent la blessure.

Résultat : des progrès lents, des blessures évitables et un abandon rapide des programmes génériques.

## Objectifs

- **O1 : démarrage rapide.** Le joueur obtient sa première semaine de programme en moins de 5 minutes après l'inscription.
- **O2 : semaine compatible avec le club.** Chaque semaine générée respecte les jours du club et du match déclarés : aucune séance intense la veille d'un match ni le lendemain, et au moins 48 h entre le match et une séance de jambes lourde.
- **O3 : saisie quotidienne légère.** Le questionnaire du matin prend moins de 30 secondes, et la note après une séance du club ou un match prend moins de 10 secondes.
- **O4 : adaptation visible.** Quand la fatigue ou la charge dépasse le seuil d'alerte, la séance du jour est allégée et le joueur voit pourquoi en une phrase.
- **O5 : progression lisible.** Le joueur voit l'évolution de chacun de ses records et son écart avec les repères du niveau au-dessus du sien.
- **O6 : sécurité.** Toute blessure déclarée retire immédiatement les exercices qui sollicitent la zone et affiche un renvoi vers un médecin ou un kiné. Une commotion suspend le plan.
- **O7 : envie de revenir** *(hypothèse de mesure)* : au moins 60 % des joueurs testeurs remplissent leur ressenti au moins 4 jours sur 7 pendant 4 semaines.
- **O8 : charge du club prise en compte.** 100 % des séances générées tiennent compte des notes de dureté et des minutes jouées que le joueur a déclarées pour la semaine en cours et la précédente.

## Hors périmètre

- **Calcul des besoins énergétiques et nutrition :** prévus pour une version ultérieure.
- **Gestion poussée des faiblesses :** au-delà de la comparaison par ligne, sexe et niveau, également prévue plus tard.
- **Joueurs mineurs.**
- **Rugby à VII et rugby à XIII :** leurs calendriers sont trop différents, avec par exemple des tournois de plusieurs matchs par jour au VII.
- **Entraîneurs, équipes et partage avec un staff :** l'appli s'adresse au joueur seul.
- **Réathlétisation et diagnostic médical :** l'appli ne soigne pas, ne remplace pas un professionnel de santé et ne dit pas quand reprendre le contact.
- **Remplacement des entraînements du club :** l'appli ne programme ni le rugby collectif ni la technique.
- **Montres et GPS :** pas de connexion à des appareils connectés.
- **Comptes et synchronisation entre appareils :** prévus pour une version ultérieure. En première version, chaque appareil a ses propres données.
- **Réseau social, classements entre joueurs et coaching humain.**

## Récits utilisateur

- En tant que joueur, je veux renseigner mon poste, ma taille, mon poids, mon niveau et mon expérience en musculation, pour recevoir un programme qui me correspond.
- En tant que joueuse, je veux indiquer mon sexe, pour être comparée aux repères qui me correspondent.
- En tant que joueur, je veux saisir les records que je connais (squat, développé couché, sprint 10 m et 40 m, Bronco…), sans être obligé de tous les connaître, pour que l'appli parte de mon niveau réel.
- En tant que joueur, je veux indiquer mes jours d'entraînement au club et mes matchs, pour que mes séances soient placées autour.
- En tant que joueur, je veux voir ma semaine d'un coup d'œil, et la séance du jour en premier, pour savoir quoi faire sans réfléchir.
- En tant que joueur, je veux une semaine différente selon que j'ai un match ou non, pour que mon entraînement suive mon calendrier.
- En tant que joueur, je veux répondre en quelques secondes à un ressenti du matin (fatigue, sommeil, douleurs, stress, humeur), pour que l'appli adapte ma séance.
- En tant que joueur, je veux noter la dureté de chaque entraînement du club et de chaque match en un geste, pour que l'appli connaisse ma vraie charge.
- En tant que joueur, je veux indiquer combien de minutes j'ai joué après un match, pour que mon entraînement suive ce que j'ai réellement fait.
- En tant que joueur, je veux comprendre pourquoi une séance a été allégée ou modifiée, pour faire confiance au programme.
- En tant que joueur, je veux enregistrer un nouveau record et voir ma courbe de progression, pour rester motivé.
- En tant que joueur, je veux savoir où je me situe par rapport aux joueurs de ma ligne et du niveau au-dessus du mien, pour savoir ce qui me sépare de l'étape suivante.
- En tant que joueur, je veux que mes séances insistent sur ce qui compte pour mon poste et sur mes faiblesses, pour progresser là où c'est utile.
- En tant que joueur, je veux déclarer une blessure et sa zone, pour que les exercices dangereux soient remplacés et que je sois orienté vers un professionnel.
- En tant que joueur, je veux signaler que ma blessure est guérie, pour retrouver mon programme normal.
- En tant que joueur, je veux installer l'appli depuis un lien partagé et l'utiliser sans réseau, pour m'en servir en salle de musculation.
- En tant que joueur, je veux exporter et réimporter une sauvegarde de mes données, pour ne rien perdre si je change de téléphone ou réinstalle l'appli.

## Critères d'acceptation

**Profil et démarrage**

- Le joueur peut terminer l'inscription sans saisir aucun record. Les records manquants s'affichent « non renseigné » et ne bloquent pas la génération.
- L'inscription refuse un âge inférieur à 18 ans.
- Le profil demande le sexe. Les repères et la comparaison en tiennent compte.
- Le niveau de départ du programme dépend de l'expérience déclarée en musculation et du niveau de jeu déclaré.

**Semaine**

- La semaine affiche chaque jour avec son type (club, match, séance de l'appli, récupération, repos), et la séance du jour en premier.
- **Aucune séance intense** n'est proposée la veille d'un match, ni le jour d'un entraînement du club noté comme lourd.
- **Au moins 48 h** séparent un match d'une séance de jambes lourde.
- En saison avec match, la semaine prévoit **2 séances de musculation** par défaut. Une semaine sans match peut en prévoir une troisième.
- **Changement de calendrier :** modifier un jour du club ou un match régénère les jours restants de la semaine sans effacer les séances déjà faites.
- Un échauffement de prévention de type Activate ouvre chaque séance de l'appli.
- **Charge conseillée :** pour chaque exercice chargé prescrit en répétitions avec un RPE cible, la séance affiche une charge en kg (par main pour les haltères) et le pourcentage du max dont elle vient, en plus du RPE. Le max vient d'abord des séances saisies ces 8 dernières semaines, sinon du record de squat ou de développé couché. Sans max connu, la séance invite à saisir le record utile.

**Ressenti et charge**

- Le questionnaire du matin compte 5 items notés de 1 à 5, plus une douleur localisée facultative avec sa zone.
- Après un entraînement du club ou un match, une note de dureté sur 10 est proposée en un geste.
- Après un match, le joueur indique ses minutes jouées en un geste. L'entraînement des jours suivants s'adapte :
  - **60 minutes ou plus :** récupération, et pas de jambes lourdes avant que le ressenti soit revenu à la normale ;
  - **20 à 59 minutes :** récupération légère et une courte séance de compensation possible ;
  - **moins de 20 minutes ou non joué :** séance de compensation le lendemain, et la semaine est traitée comme une semaine sans match côté musculation.
- Deux matchs en moins de 72 h font passer la semaine en mode récupération.
- **Alerte et allègement :** quand le ressenti ou la charge de la semaine franchit un seuil d'alerte, la séance du jour est allégée (volume réduit, pas d'effort maximal). Un message d'une phrase en donne la raison.
- **Pas de rattrapage :** l'appli n'ajoute jamais de charge pour rattraper une séance manquée.
- **Douleur répétée :** une même zone douloureuse signalée deux jours de suite retire les exercices à fort impact sur cette zone.

**Records et progression**

- Le joueur peut ajouter un record à tout moment. Sa courbe d'évolution est mise à jour aussitôt.
- Pour chaque record avec un repère disponible, le joueur voit son écart avec **le niveau au-dessus du sien**, pour sa ligne et son sexe. Au niveau le plus haut, la comparaison se fait avec son propre niveau.
- Le Bronco s'affiche en progression personnelle uniquement, sans comparaison.
- **Faiblesses :** une faiblesse détectée oriente le contenu des séances suivantes, par exemple plus de force ou plus de vitesse. Le joueur peut voir laquelle et pourquoi.

**Blessures**

- **Déclaration :** déclarer une blessure demande la zone touchée. Les exercices qui la sollicitent sont remplacés dès la séance suivante, et un message recommande de consulter.
- **Commotion :** une commotion, suspectée ou confirmée, suspend tout le plan et affiche un renvoi médical et le délai minimal de World Rugby avant de rejouer.
- **Retour au programme normal :** il ne se fait que lorsque le joueur déclare la blessure guérie.

**Plateformes et ergonomie**

- L'appli s'installe sur l'écran d'accueil depuis un lien, sur iPhone (Safari) et Android, et toutes ses fonctions marchent sans réseau.
- Les données restent sur l'appareil du joueur : rien n'est envoyé à un serveur.
- Le joueur peut exporter toutes ses données dans un fichier et les réimporter à l'identique sur un autre appareil.
- L'appli rappelle de faire une sauvegarde si la dernière date de plus de 14 jours.
- L'écran d'accueil montre au plus trois blocs : la séance du jour, le ressenti du jour et la progression.
- **Direction artistique :** rouge et noir, avec un seul thème sombre. Les textes et les boutons respectent un contraste d'au moins 4,5:1.

## Dépendances

- **Valeurs de référence par ligne et par niveau :** elles viennent de la veille. Deux tableaux (Darrall-Jones 2015, Read 2018) doivent être revérifiés sur les publications originales.
- **Repères pour les joueuses :** la veille ne les couvre pas. Il faut une veille complémentaire. En attendant, les joueuses ne voient que leur progression personnelle, sans comparaison.
- **Table de remplacement des exercices par zone :** issue de la veille, elle doit être relue par un kinésithérapeute ou un médecin du sport avant la mise en service.
- **Bibliothèque d'exercices :** nom, consignes, zones sollicitées et adaptation par poste.
- **Programme Activate :** contenu public de World Rugby, conditions de réutilisation à vérifier.
- **Mentions légales et données de santé :** l'appli stocke des blessures et un ressenti, qui sont des données de santé au sens du RGPD. En première version, elles restent sur l'appareil du joueur, ce qui limite fortement les obligations ; une information claire reste à afficher. L'arrivée de la synchronisation imposera un consentement explicite, un hébergement adapté et une politique de confidentialité.
- **Groupe de joueurs testeurs :** il sert à mesurer O1, O3 et O7.

## Questions ouvertes

- **Rapports entre exercices pour la charge conseillée.** Ils donnent un ordre de grandeur de terrain (par exemple front squat ≈ 0,85 × squat). Faut-il les faire relire par un préparateur physique ?
- **Seuils d'alerte de charge.** Ils viennent d'études sur des pros ou des académies. Faut-il les ajuster aux amateurs, et comment le valider ?
