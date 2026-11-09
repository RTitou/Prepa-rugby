import {
  SLEEP_MEAN_ALERT_MAX,
  SLEEP_MIN_ENTRIES,
  SLEEP_WINDOW_DAYS,
  WELLNESS_BASELINE_MIN_DAYS,
  WELLNESS_BASELINE_WINDOW_DAYS,
  WELLNESS_FALLBACK_ITEM_MAX,
  WELLNESS_FALLBACK_TOTAL_MAX,
  WELLNESS_SD_FLOOR_ITEM,
  WELLNESS_SD_FLOOR_TOTAL,
  WELLNESS_Z_ITEM_ALERT,
  WELLNESS_Z_ITEM_ALERT_COUNT,
  WELLNESS_Z_TOTAL_ALERT,
} from '../config'
import { addDays } from '../dates'
import { WELLNESS_ITEMS, type WellnessItemKey, type WellnessScores } from '../../types/wellness'

/*
 * Ressenti du matin (RC-6.2). Chaque item va de 1 à 5, 5 = meilleur état : un z-score négatif est toujours une dégradation.
 * Fonctions pures.
 */

export interface MorningLite {
  date: string
  scores: WellnessScores
}

const KEYS: readonly WellnessItemKey[] = WELLNESS_ITEMS.map((i) => i.key)

/** Score total (5 à 25). */
export function totalScore(scores: WellnessScores): number {
  return KEYS.reduce((n, k) => n + scores[k], 0)
}

function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Écart-type d'échantillon (n − 1), avec un plancher pour éviter un z infini. */
function sd(values: readonly number[], floor: number): number {
  if (values.length < 2) return floor
  const m = mean(values)
  const variance = values.reduce((n, v) => n + (v - m) ** 2, 0) / (values.length - 1)
  return Math.max(Math.sqrt(variance), floor)
}

export interface Baseline {
  days: number
  items: Record<WellnessItemKey, { mean: number; sd: number }>
  total: { mean: number; sd: number }
}

/**
 * Base individuelle : ressentis des 28 jours qui précèdent la date (la date elle-même est exclue).
 * Null avant 14 jours distincts de ressenti : les seuils absolus de repli s'appliquent alors.
 */
export function baselineFor(mornings: readonly MorningLite[], date: string): Baseline | null {
  const from = addDays(date, -WELLNESS_BASELINE_WINDOW_DAYS)
  const byDay = new Map<string, WellnessScores>()
  for (const m of mornings) if (m.date >= from && m.date < date) byDay.set(m.date, m.scores)
  if (byDay.size < WELLNESS_BASELINE_MIN_DAYS) return null
  const rows = [...byDay.values()]
  const items = {} as Baseline['items']
  for (const k of KEYS) {
    const values = rows.map((r) => r[k])
    items[k] = { mean: mean(values), sd: sd(values, WELLNESS_SD_FLOOR_ITEM) }
  }
  const totals = rows.map(totalScore)
  return { days: rows.length, items, total: { mean: mean(totals), sd: sd(totals, WELLNESS_SD_FLOOR_TOTAL) } }
}

export interface WellnessAssessment {
  date: string
  /** z : comparaison à la base du joueur ; absolu : seuils de repli (moins de 14 jours de ressenti). */
  mode: 'z' | 'absolu'
  degraded: boolean
  total: number
  zTotal: number | null
  zItems: Record<WellnessItemKey, number> | null
  /** Items qui ont déclenché l'alerte. */
  lowItems: WellnessItemKey[]
}

/** Évalue le ressenti d'une date : z-score individuel si la base le permet, seuils absolus sinon. */
export function assessWellness(entry: MorningLite, mornings: readonly MorningLite[]): WellnessAssessment {
  const total = totalScore(entry.scores)
  const baseline = baselineFor(mornings, entry.date)
  if (!baseline) {
    const lowItems = KEYS.filter((k) => entry.scores[k] <= WELLNESS_FALLBACK_ITEM_MAX)
    return {
      date: entry.date,
      mode: 'absolu',
      degraded: total <= WELLNESS_FALLBACK_TOTAL_MAX || lowItems.length > 0,
      total,
      zTotal: null,
      zItems: null,
      lowItems,
    }
  }
  const zTotal = (total - baseline.total.mean) / baseline.total.sd
  const zItems = {} as Record<WellnessItemKey, number>
  for (const k of KEYS) zItems[k] = (entry.scores[k] - baseline.items[k].mean) / baseline.items[k].sd
  const lowItems = KEYS.filter((k) => zItems[k] <= WELLNESS_Z_ITEM_ALERT)
  return {
    date: entry.date,
    mode: 'z',
    degraded: zTotal <= WELLNESS_Z_TOTAL_ALERT || lowItems.length >= WELLNESS_Z_ITEM_ALERT_COUNT,
    total,
    zTotal,
    zItems,
    lowItems,
  }
}

/** Moyenne de l'item sommeil sur les 7 derniers jours (date incluse) ; null si trop peu de saisies (moins de 4). */
export function sleepMean(mornings: readonly MorningLite[], today: string): number | null {
  const from = addDays(today, -(SLEEP_WINDOW_DAYS - 1))
  const rows = mornings.filter((m) => m.date >= from && m.date <= today)
  if (rows.length < SLEEP_MIN_ENTRIES) return null
  return mean(rows.map((r) => r.scores.sommeil))
}

export function isSleepLow(mornings: readonly MorningLite[], today: string): boolean {
  const m = sleepMean(mornings, today)
  return m !== null && m <= SLEEP_MEAN_ALERT_MAX
}
