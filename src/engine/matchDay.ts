import type { WeekFlag } from '../types/plan'
import { addDays, diffDays, hoursOf } from './dates'
import {
  DEFAULT_MATCH_HOUR,
  MD_LABEL_WINDOW_DAYS,
  MD_PLUS_LABEL_DAYS,
  MIN_HOURS_BETWEEN_MATCHES,
} from './config'

/** Match tel que lu par le moteur : date locale et heure facultative. */
export interface MatchLite {
  date: string
  time: string | null
}

export interface MatchDistance {
  /** Jours depuis le match le plus récent strictement avant la date ; null s'il n'y en a pas. */
  sincePrev: number | null
  /** Jours jusqu'au prochain match strictement après la date ; null s'il n'y en a pas. */
  toNext: number | null
  isMatchDay: boolean
}

function sortedDates(matches: readonly MatchLite[]): string[] {
  return [...new Set(matches.map((m) => m.date))].sort()
}

export function matchDistance(date: string, matches: readonly MatchLite[]): MatchDistance {
  const dates = sortedDates(matches)
  let prev: string | null = null
  let next: string | null = null
  for (const d of dates) {
    if (d < date) prev = d
    else if (d > date && next === null) next = d
  }
  return {
    sincePrev: prev === null ? null : diffDays(prev, date),
    toNext: next === null ? null : diffDays(date, next),
    isMatchDay: dates.includes(date),
  }
}

/**
 * Décalage MD du jour : 0 le jour du match, -n avant, +n après ; null hors de toute fenêtre de match.
 * Convention du microcycle (§4.3) : les deux jours qui suivent un match sont MD+1, MD+2 ; ensuite les jours
 * sont comptés vers le prochain match (mardi = MD-4 pour un match le samedi). Sans prochain match connu,
 * MD+n se poursuit jusqu'à la fenêtre.
 */
export function mdOffset(date: string, matches: readonly MatchLite[]): number | null {
  const { sincePrev, toNext, isMatchDay } = matchDistance(date, matches)
  if (isMatchDay) return 0
  if (sincePrev !== null && sincePrev <= MD_PLUS_LABEL_DAYS) return sincePrev
  if (toNext !== null && toNext <= MD_LABEL_WINDOW_DAYS) return -toNext
  if (sincePrev !== null && sincePrev <= MD_LABEL_WINDOW_DAYS) return sincePrev
  return null
}

export function mdLabel(offset: number | null): string | null {
  if (offset === null) return null
  if (offset === 0) return 'MD'
  return offset > 0 ? `MD+${offset}` : `MD${offset}`
}

/** Vrai si la semaine du lundi donné contient un match (« semaine sans match » sinon). */
export function weekHasMatch(weekStart: string, matches: readonly MatchLite[]): boolean {
  const end = addDays(weekStart, 6)
  return matches.some((m) => m.date >= weekStart && m.date <= end)
}

/** Écart en heures entre deux matchs ; une heure absente est supposée à DEFAULT_MATCH_HOUR. */
export function hoursBetween(a: MatchLite, b: MatchLite): number {
  const ha = a.time === null ? DEFAULT_MATCH_HOUR : hoursOf(a.time)
  const hb = b.time === null ? DEFAULT_MATCH_HOUR : hoursOf(b.time)
  return diffDays(a.date, b.date) * 24 + (hb - ha)
}

export interface CloseMatches {
  first: MatchLite
  second: MatchLite
  hours: number
}

/** Paires de matchs consécutifs séparées de moins de 72 h (RC-4.5). L'adaptation du plan est en phase 5. */
export function findCloseMatches(matches: readonly MatchLite[]): CloseMatches[] {
  const ordered = [...matches].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  const out: CloseMatches[] = []
  for (let i = 1; i < ordered.length; i++) {
    const hours = hoursBetween(ordered[i - 1]!, ordered[i]!)
    if (hours < MIN_HOURS_BETWEEN_MATCHES) out.push({ first: ordered[i - 1]!, second: ordered[i]!, hours })
  }
  return out
}

/** Signalements de la semaine pour les paires dont au moins un match tombe dans la semaine. */
export function closeMatchFlags(weekStart: string, matches: readonly MatchLite[]): WeekFlag[] {
  const end = addDays(weekStart, 6)
  const inWeek = (d: string) => d >= weekStart && d <= end
  return findCloseMatches(matches)
    .filter((c) => inWeek(c.first.date) || inWeek(c.second.date))
    .map((c) => ({
      code: 'matchs-rapproches',
      source: 'moteur' as const,
      text: `Deux matchs à ${Math.round(c.hours)} h d'écart (moins de ${MIN_HOURS_BETWEEN_MATCHES} h).`,
      dates: [c.first.date, c.second.date],
    }))
}
