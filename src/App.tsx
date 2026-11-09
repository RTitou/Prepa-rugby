import { Navigate, Route, Routes, useLocation } from 'react-router'
import { useProfile } from './data/hooks'
import NavBar from './components/NavBar'
import PlaceholderScreen from './components/PlaceholderScreen'
import InstallHint from './pwa/InstallHint'
import StorageNotice from './pwa/StorageNotice'
import UpdatePrompt from './pwa/UpdatePrompt'
import CheckinScreen from './screens/checkin/CheckinScreen'
import HomeScreen from './screens/home/HomeScreen'
import InjuriesScreen from './screens/injuries/InjuriesScreen'
import OnboardingScreen from './screens/onboarding/OnboardingScreen'
import ProfileScreen from './screens/profile/ProfileScreen'
import RecordsScreen from './screens/records/RecordsScreen'
import SessionScreen from './screens/session/SessionScreen'
import WeekScreen from './screens/week/WeekScreen'

export default function App() {
  const profile = useProfile()
  const { pathname } = useLocation()

  // Premier lancement : tant qu'aucun profil n'existe, seul /bienvenue est accessible.
  if (profile === undefined) {
    return (
      <div className="app">
        <p className="muted app__loading">Chargement…</p>
      </div>
    )
  }
  if (profile === null && pathname !== '/bienvenue') return <Navigate to="/bienvenue" replace />
  if (profile !== null && pathname === '/bienvenue') return <Navigate to="/" replace />

  return (
    <div className="app">
      {profile ? <NavBar /> : null}
      <div className="app__content">
        <UpdatePrompt />
        <InstallHint />
        <StorageNotice />
        <main>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/semaine" element={<WeekScreen />} />
            <Route path="/seance/:id" element={<SessionScreen />} />
            <Route path="/ressenti" element={<CheckinScreen />} />
            <Route path="/records" element={<RecordsScreen />} />
            <Route path="/blessures" element={<InjuriesScreen />} />
            <Route path="/profil" element={<ProfileScreen />} />
            <Route path="/bienvenue" element={<OnboardingScreen />} />
            <Route
              path="*"
              element={
                <PlaceholderScreen
                  title="Page introuvable"
                  description="Retourne à l'accueil avec la barre de navigation."
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  )
}
