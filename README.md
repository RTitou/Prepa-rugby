# Prépa Rugby (nom provisoire)

Appli de préparation physique pour rugbymen et rugbywomen adultes. 100 % navigateur, installable (PWA), hors connexion, données gardées sur l'appareil. Contexte produit et technique : `aidd_docs/`.

## Prérequis

Node.js 22 (testé avec 22.19) et npm.

## Commandes

```bash
npm install        # dépendances
npm run dev        # serveur de développement
npm test           # tests (Vitest, jsdom, fake-indexeddb)
npm run lint       # ESLint
npm run build      # vérification TypeScript puis build dans dist/
npm run preview    # sert dist/ pour tester l'installation et le mode hors connexion
npm run icons      # régénère les PNG de public/icons depuis public/icon.svg
```

Le service worker n'est actif qu'en build : pour tester l'installation et le hors connexion, faire `npm run build` puis `npm run preview`, ouvrir la page, couper le réseau (outils de développement, onglet Réseau) et recharger.

### Build pour un sous-dossier (GitHub Pages)

La base de Vite est lue dans la variable `BASE_PATH` (repli `/`) :

```powershell
$env:BASE_PATH = "/nom-du-depot/"; npm run build
```

Sous Git Bash sur Windows, ajouter `MSYS_NO_PATHCONV=1` devant la commande, sinon `/nom-du-depot/` est converti en chemin Windows.

## Choix techniques et versions

- Navigation par **HashRouter** (`/#/semaine`...) : fonctionne sur GitHub Pages sans repli `404.html` et sans dépendre du serveur, y compris hors connexion.
- Service worker en mode « prompt » : une bannière « Nouvelle version disponible » propose la mise à jour.
- Versions exactes figées dans `package.json`. Écarts par rapport aux dernières versions npm, à cause de la compatibilité avec Node 22.19 et l'outillage :
  - **react-router 7.18.4** et non 8.4.0 (8.4.0 exige Node >= 22.22) ;
  - **jsdom 29.1.1** et non 30.x (30.x exige Node >= 22.22.2) ;
  - **TypeScript 6.0.3** et non 7.0.2 (typescript-eslint 8.71 n'accepte que TypeScript < 6.1) ;
  - Vite 8.3.2, vite-plugin-pwa 1.3.0, @vitejs/plugin-react 6.1.1, Vitest 5.0.3, React 19.3.0, Dexie 4.4.6 : versions courantes, compatibles.
- Quand le poste passera à Node >= 22.22, react-router 8 et jsdom 30 pourront être adoptés.

## Installer sur téléphone

- **iPhone (Safari)** : ouvrir le lien, toucher Partager, puis « Sur l'écran d'accueil ». Installer l'appli réduit le risque d'effacement des données par Safari.
- **Android (Chrome)** : ouvrir le lien, menu, « Installer l'application » (ou toucher « Installer » dans la bannière).

Puis couper le réseau et vérifier que l'appli s'ouvre toujours.

## Publier sur GitHub Pages (étapes manuelles de l'auteur)

Rien n'est poussé automatiquement et aucun dépôt Git n'a été créé.

1. Créer le dépôt public sur le compte Git de l'école, puis y pousser le projet quand tu le décides.
2. Dans les réglages du dépôt, Pages, source : « GitHub Actions ».
3. Le workflow `.github/workflows/deploy.yml` s'exécute à chaque mise à jour de la branche `main` : lint, tests, build avec `BASE_PATH=/<nom-du-dépôt>/`, puis publication.
4. Partager le lien `https://<compte>.github.io/<nom-du-dépôt>/` avec les coéquipiers.
