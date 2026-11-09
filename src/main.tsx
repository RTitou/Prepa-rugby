import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import App from './App'
import { registerAdaptation } from './data/adaptation'
import { registerInjuries } from './data/injuries'
import { registerRecordsOrientation } from './data/orientation'
import { registerPwa } from './pwa/registerPwa'
// Police des titres embarquée (latin seul) : disponible hors connexion, sans appel à Google Fonts.
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-800.css'
import './styles/base.css'

// HashRouter : les routes vivent après le « # », aucun repli 404.html nécessaire sur GitHub Pages
// et la navigation reste fiable hors connexion.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

// Ressenti, charge et minutes jouées adaptent le plan : le fournisseur de contexte est branché une fois au démarrage.
registerAdaptation()
// Les records (point faible détecté) orientent les séances à venir.
registerRecordsOrientation()
// Les blessures actives excluent et remplacent des exercices, ou suspendent le plan (commotion, signe grave).
registerInjuries()
registerPwa()
