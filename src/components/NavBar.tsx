import { NavLink } from 'react-router'
import Icon, { type IconName } from './Icon'

const items: { to: string; label: string; icon: IconName; end: boolean }[] = [
  { to: '/', label: 'Accueil', icon: 'home', end: true },
  { to: '/semaine', label: 'Semaine', icon: 'calendar', end: false },
  { to: '/records', label: 'Records', icon: 'trophy', end: false },
  { to: '/profil', label: 'Réglages', icon: 'settings', end: false },
]

export default function NavBar() {
  return (
    <nav className="navbar" aria-label="Navigation principale">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? 'navbar__link navbar__link--active' : 'navbar__link')}
        >
          <Icon name={item.icon} />
          {/* Masqué sur mobile (icônes seules), affiché dans la barre latérale sur grand écran. */}
          <span className="navbar__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
