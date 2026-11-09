import { LOAD_SPIKE_RATIO, OUT_OF_APP_WEEKLY_LOAD_ALERT_UA } from '../config'
import { mondayOf } from '../dates'
import { closeMatchFlags, type MatchLite } from '../matchDay'
import type { PlanReason } from '../../types/plan'
import { hasLoadHistory, previousWeeksMean, weeklyLoad, type LoadEntry } from './sessionLoad'
import { assessWellness, isSleepLow, sleepMean, type MorningLite } from './wellnessScore'

/** Alerte de charge ou de ressenti : une phrase claire et la source qui l'affiche. */
export interface LoadAlert extends PlanReason {
  /** Dates concernées (ex. les deux matchs trop rapprochés). */
  dates?: string[]
}

export interface AlertInput {
  /** Lundi de la semaine qu'on génère. */
  weekStart: string
  /** Date du jour, fournie par l'appelant (le moteur ne lit pas l'horloge). */
  today: string
  mornings: readonly MorningLite[]
  loads: readonly LoadEntry[]
  matches: readonly MatchLite[]
}

const round = (n: number) => Math.round(n)

/**
 * Alertes actives pour la semaine. Les alertes d'état du jour (ressenti, montée rapide, charge hors appli, sommeil) ne
 * concernent que la semaine en cours : l'état d'aujourd'hui ne dit rien des semaines suivantes. Les deux matchs à moins de
 * 72 h (RC-7.2) sont connus à l'avance et valent pour n'importe quelle semaine.
 */
export function computeAlerts(input: AlertInput): LoadAlert[] {
  const { weekStart, today, mornings, loads, matches } = input
  const alerts: LoadAlert[] = []

  for (const flag of closeMatchFlags(weekStart, matches)) {
    alerts.push({
      code: 'matchs-rapproches',
      source: 'charge',
      text: `${flag.text.replace(/\.$/, '')} : semaine en mode récupération, signal de surcharge.`,
      dates: flag.dates,
    })
  }

  if (weekStart !== mondayOf(today)) return alerts

  // Ressenti du jour (RC-6.2) : seule la saisie d'aujourd'hui compte.
  const todayEntry = mornings.find((m) => m.date === today)
  if (todayEntry) {
    const assessment = assessWellness(todayEntry, mornings)
    if (assessment.degraded) {
      alerts.push({
        code: 'ressenti-degrade',
        source: 'ressenti',
        text:
          assessment.mode === 'z'
            ? 'Ton ressenti du matin est nettement en dessous de ton niveau habituel : séance allégée.'
            : 'Ton ressenti du matin est bas (moins de 14 jours de suivi, seuils de départ) : séance allégée.',
        dates: [today],
      })
    }
  }

  // Montée rapide de charge (RC-6.3), seulement avec un historique suffisant.
  if (hasLoadHistory(loads, weekStart)) {
    const prev = previousWeeksMean(loads, weekStart)!
    const current = weeklyLoad(loads, weekStart)
    if (current > prev.mean * LOAD_SPIKE_RATIO) {
      alerts.push({
        code: 'montee-rapide',
        source: 'charge',
        text: `Ta charge de la semaine (${round(current)} UA) dépasse de plus de 30 % ta moyenne des semaines précédentes (${round(prev.mean)} UA) : volume réduit.`,
      })
    }
  }

  // Charge hors appli élevée (RC-10.1) : maintien minimal.
  const outOfApp = weeklyLoad(loads, weekStart, ['club', 'match'])
  if (outOfApp > OUT_OF_APP_WEEKLY_LOAD_ALERT_UA) {
    alerts.push({
      code: 'charge-hors-appli',
      source: 'charge',
      text: `Ta charge hors appli (club, matchs) atteint ${round(outOfApp)} UA cette semaine : l'appli ne propose qu'un maintien minimal.`,
    })
  }

  // Sommeil moyen faible (RC-10.2).
  if (isSleepLow(mornings, today)) {
    const m = sleepMean(mornings, today)!
    alerts.push({
      code: 'sommeil-faible',
      source: 'ressenti',
      text: `Ton sommeil est faible depuis plusieurs jours (${m.toFixed(1).replace('.', ',')} sur 5 en moyenne) : volume réduit, essaie de dormir davantage.`,
    })
  }

  return alerts
}
