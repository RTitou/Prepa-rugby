import { LOAD_PREVIOUS_WEEKS, LOAD_SPIKE_MIN_WEEKS_HISTORY } from '../config'
import { addDays } from '../dates'

/*
 * Charge de séance (RC-6.1) : sRPE = RPE CR-10 × durée en minutes, en unités arbitraires (UA) (Foster et al., 2001).
 * Fonctions pures : elles ne lisent ni la base ni l'horloge.
 */

/** Origine de la charge : séance de l'appli, entraînement club ou match. */
export type LoadSource = 'appli' | 'club' | 'match'

export interface LoadEntry {
  /** AAAA-MM-JJ */
  date: string
  source: LoadSource
  /** RPE CR-10 (0 à 10). */
  rpe: number
  durationMin: number
}

/** sRPE d'une séance : RPE × durée. Une valeur invalide donne 0. */
export function sRpe(rpe: number | null | undefined, durationMin: number | null | undefined): number {
  if (rpe == null || durationMin == null) return 0
  if (!Number.isFinite(rpe) || !Number.isFinite(durationMin) || rpe < 0 || durationMin <= 0) return 0
  return rpe * durationMin
}

export function entryLoad(entry: LoadEntry): number {
  return sRpe(entry.rpe, entry.durationMin)
}

interface LogLike {
  date: string
  status: 'en-cours' | 'terminee'
  sessionRpe: number | null
  durationMin: number | null
}

/** Charges des séances de l'appli terminées (journaux avec RPE et durée). */
export function loadsFromLogs(logs: readonly LogLike[]): LoadEntry[] {
  return logs.flatMap((l) =>
    l.status === 'terminee' && l.sessionRpe !== null && l.durationMin !== null
      ? [{ date: l.date, source: 'appli' as const, rpe: l.sessionRpe, durationMin: l.durationMin }]
      : [],
  )
}

interface RatingLike {
  kind: 'club' | 'match'
  date: string
  rpe: number | null
  durationMin: number | null
}

/** Charges des notes club et match (celles sans RPE ou sans durée sont ignorées). */
export function loadsFromRatings(ratings: readonly RatingLike[]): LoadEntry[] {
  return ratings.flatMap((r) =>
    r.rpe !== null && r.durationMin !== null ? [{ date: r.date, source: r.kind, rpe: r.rpe, durationMin: r.durationMin }] : [],
  )
}

const ALL_SOURCES: readonly LoadSource[] = ['appli', 'club', 'match']

function sum(entries: readonly LoadEntry[], from: string, to: string, sources: readonly LoadSource[]): number {
  return entries
    .filter((e) => e.date >= from && e.date <= to && sources.includes(e.source))
    .reduce((n, e) => n + entryLoad(e), 0)
}

/** Charge cumulée d'un jour. */
export function dailyLoad(entries: readonly LoadEntry[], date: string, sources: readonly LoadSource[] = ALL_SOURCES): number {
  return sum(entries, date, date, sources)
}

/** Charge cumulée de la semaine du lundi donné. */
export function weeklyLoad(entries: readonly LoadEntry[], weekStart: string, sources: readonly LoadSource[] = ALL_SOURCES): number {
  return sum(entries, weekStart, addDays(weekStart, 6), sources)
}

/** Charge cumulée sur 4 semaines : la semaine du lundi donné et les trois précédentes (Cross et al., 2016). */
export function fourWeekLoad(entries: readonly LoadEntry[], weekStart: string, sources: readonly LoadSource[] = ALL_SOURCES): number {
  return sum(entries, addDays(weekStart, -21), addDays(weekStart, 6), sources)
}

export interface PreviousWeeksMean {
  /** Moyenne des charges hebdomadaires des semaines précédentes couvertes par des données. */
  mean: number
  /** Nombre de semaines précédentes entièrement couvertes (au plus LOAD_PREVIOUS_WEEKS). */
  weeks: number
}

/**
 * Moyenne des semaines précédant `weekStart`. Une semaine ne compte que si elle commence au plus tôt à la première charge
 * enregistrée : sans cela, un historique récent ferait passer une semaine « vide » pour une charge nulle.
 * Renvoie null sans aucune donnée avant la semaine.
 */
export function previousWeeksMean(
  entries: readonly LoadEntry[],
  weekStart: string,
  weeks: number = LOAD_PREVIOUS_WEEKS,
): PreviousWeeksMean | null {
  const before = entries.filter((e) => e.date < weekStart)
  if (before.length === 0) return null
  const first = before.reduce((min, e) => (e.date < min ? e.date : min), before[0]!.date)
  const loads: number[] = []
  for (let k = 1; k <= weeks; k++) {
    const start = addDays(weekStart, -7 * k)
    if (start < first) break
    loads.push(weeklyLoad(entries, start))
  }
  if (loads.length === 0) return null
  return { mean: loads.reduce((a, b) => a + b, 0) / loads.length, weeks: loads.length }
}

/** Historique suffisant pour juger une montée rapide : au moins deux semaines précédentes couvertes et une charge moyenne non nulle. */
export function hasLoadHistory(entries: readonly LoadEntry[], weekStart: string): boolean {
  const prev = previousWeeksMean(entries, weekStart)
  return prev !== null && prev.weeks >= LOAD_SPIKE_MIN_WEEKS_HISTORY && prev.mean > 0
}
