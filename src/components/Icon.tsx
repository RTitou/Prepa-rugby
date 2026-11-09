/*
 * Icônes au trait, reprises de Tabler Icons (licence MIT, https://tabler.io/icons).
 * En SVG dans le code : aucune police d'icônes à charger, l'appli reste légère hors ligne.
 */
const PATHS = {
  home: ['M5 12l-2 0l9 -9l9 9l-2 0', 'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7', 'M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6'],
  calendar: ['M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z', 'M16 3v4', 'M8 3v4', 'M4 11h16', 'M11 15h1', 'M12 15v3'],
  trophy: [
    'M8 21l8 0',
    'M12 17l0 4',
    'M7 4l10 0',
    'M17 4v8a5 5 0 0 1 -10 0v-8',
    'M3 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    'M17 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  ],
  settings: [
    'M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z',
    'M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
  ],
  clock: ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0', 'M12 7v5l3 3'],
  arrowLeft: ['M5 12l14 0', 'M5 12l6 6', 'M5 12l6 -6'],
  chevronLeft: ['M15 6l-6 6l6 6'],
  chevronRight: ['M9 6l6 6l-6 6'],
  flame: [
    'M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.621 -2.333 5.588c0 3.704 3.134 6.706 7 6.706s7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235',
  ],
  barbell: [
    'M2 12h1',
    'M6 8h-2a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h2',
    'M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1z',
    'M9 12h6',
    'M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1z',
    'M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2',
    'M22 12h-1',
  ],
  bandage: ['M14 12l0 .01', 'M10 12l0 .01', 'M12 10l0 .01', 'M12 14l0 .01', 'M4.5 12.5l8 -8a4.94 4.94 0 0 1 7 7l-8 8a4.94 4.94 0 0 1 -7 -7'],
} as const

export type IconName = keyof typeof PATHS

/** Icône décorative : le texte voisin (visible ou masqué) porte le sens. */
export default function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
