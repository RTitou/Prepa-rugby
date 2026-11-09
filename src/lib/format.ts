import type { DayKind, PrescribedSet } from '../types/plan'

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function utcDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!))
}

/** « Lun. » */
export function weekdayShort(date: string): string {
  return capitalize(new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(utcDate(date)))
}

/** « Lundi 6 octobre » */
export function dateLong(date: string): string {
  return capitalize(new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(utcDate(date)))
}

/** « 6 oct. » */
export function dayMonthShort(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(utcDate(date))
}

function num(n: number): string {
  return String(n).replace('.', ',')
}

/** Fourchette de pourcentages : « 80-85 % », « 70 % ». */
export function formatPct(range: [number, number]): string {
  const a = Math.round(range[0] * 100)
  const b = Math.round(range[1] * 100)
  return a === b ? `${a} %` : `${a}-${b} %`
}

/** Récupération : « 2-3 min », « 1 min 30-2 min », « 45 s ». */
export function formatRest(range: [number, number]): string {
  const one = (s: number): string => {
    if (s < 60) return `${s} s`
    const m = Math.floor(s / 60)
    const r = s % 60
    return r === 0 ? `${m} min` : `${m} min ${r}`
  }
  if (range[0] === range[1]) return one(range[0])
  if (range[0] % 60 === 0 && range[1] % 60 === 0) return `${range[0] / 60}-${range[1] / 60} min`
  return `${one(range[0])}-${one(range[1])}`
}

/**
 * « 4×5 @ RPE 8 », « 3×8-10 @ RPE 7 », « 3×30 s », « 1×15 min @ RPE 2 ».
 * Méthode ATP : « 4×5/côté », « 5×5 @ RPE 9 · 80-85 % », « vague 6-4-2-4-6 @ RPE 9 ».
 */
export function formatPrescription(p: PrescribedSet): string {
  const rpe = p.targetRpe === null ? '' : ` @ RPE ${num(p.targetRpe)}`
  if (p.waves && p.waves.length > 0) return `vague ${p.waves.map((w) => w.reps).join('-')}${rpe}`
  const reps = p.repsMax !== undefined ? `${p.reps}-${p.repsMax}` : String(p.reps)
  const unit = p.unit === 'reps' ? '' : p.unit === 's' ? ' s' : ' min'
  const side = p.perSide ? '/côté' : ''
  const pct = p.pctOneRm ? ` · ${formatPct(p.pctOneRm)}` : ''
  return `${p.sets}×${reps}${unit}${side}${rpe}${pct}`
}

/** Famille de couleur d'un jour (frise de l'accueil, écran Semaine) : match (rouge), séance (clair), club (gris), repos (sombre). */
export function dayTone(kind: DayKind): 'match' | 'club' | 'seance' | 'repos' {
  if (kind === 'match') return 'match'
  if (kind.startsWith('club')) return 'club'
  if (kind === 'repos') return 'repos'
  return 'seance'
}

export const DAY_KIND_LABEL: Record<DayKind, string> = {
  match: 'Match',
  'club-lourd': 'Club (lourd)',
  'club-normal': 'Club',
  seance: 'Séance',
  recuperation: 'Récupération',
  activation: 'Activation légère',
  repos: 'Repos',
}
