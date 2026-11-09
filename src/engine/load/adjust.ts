import { BODY_ZONES, type BodyZone } from '../../types/reference'
import type { PlanReason } from '../../types/plan'
import {
  ALERT_MAX_TARGET_RPE,
  ALERT_VOLUME_FACTOR,
  ALERT_VOLUME_FACTOR_MULTI,
  CONTACT_HIGH_THRESHOLD,
  HEAVY_LEGS_BLOCK_DAYS,
  MAINTENANCE_MAX_MUSCU_SESSIONS,
  RECOVERY_MODE_MAX_TARGET_RPE,
  RECOVERY_MODE_VOLUME_FACTOR,
} from '../config'
import { mergeContexts, type PlanContext } from '../context'
import { addDays, mondayOf, weekDates } from '../dates'
import { classifyMinutes } from '../week-builder/compensation'
import { computeAlerts, type AlertInput, type LoadAlert } from './alerts'
import { assessWellness, type MorningLite } from './wellnessScore'

/*
 * Adaptation du plan (RC-6.4, RC-7.x, RC-8.5, RC-10.x). Transforme les saisies du joueur en PlanContext : le moteur de
 * semaine ne lit jamais la base. Aucune règle ne rajoute de charge pour rattraper une séance manquée : une séance non faite
 * n'entre dans aucun calcul.
 */

export interface MorningInput extends MorningLite {
  painZone: BodyZone | null
}

export interface MatchRatingInput {
  date: string
  minutesPlayed: number | null
  contactIntensity: number | null
}

export interface AdaptationInput extends Omit<AlertInput, 'mornings'> {
  mornings: readonly MorningInput[]
  /** Notes de match (les minutes jouées et les contacts). */
  matchRatings: readonly MatchRatingInput[]
}

export interface Adaptation {
  alerts: LoadAlert[]
  context: PlanContext
}

/** Alertes qui allègent les séances de l'appli (RC-6.4). */
const LIGHTENING_CODES = ['ressenti-degrade', 'montee-rapide', 'sommeil-faible', 'charge-hors-appli']

function reason(code: string, text: string, source: PlanReason['source']): PlanReason {
  return { code, text, source }
}

function zoneLabel(zone: BodyZone): string {
  return (BODY_ZONES.find((z) => z.value === zone)?.label ?? zone).toLowerCase()
}

/** Zones signalées deux jours de suite (RC-8.5) : aujourd'hui et hier, à défaut hier et avant-hier. */
export function repeatedPainZones(mornings: readonly MorningInput[], today: string): BodyZone[] {
  const at = (d: string) => mornings.find((m) => m.date === d)?.painZone ?? null
  const end = mornings.some((m) => m.date === today) ? today : addDays(today, -1)
  const a = at(end)
  const b = at(addDays(end, -1))
  return a !== null && a === b ? [a] : []
}

function allegementContext(alerts: readonly LoadAlert[]): PlanContext {
  const active = alerts.filter((a) => LIGHTENING_CODES.includes(a.code))
  if (active.length === 0) return {}
  const factor = active.length >= 2 ? ALERT_VOLUME_FACTOR_MULTI : ALERT_VOLUME_FACTOR
  const pct = Math.round((1 - factor) * 100)
  const source: PlanReason['source'] = active.some((a) => a.source === 'ressenti') ? 'ressenti' : 'charge'
  const ctx: PlanContext = {
    volumeFactor: factor,
    maxTargetRpe: ALERT_MAX_TARGET_RPE,
    lightConditioning: true,
    reasons: [
      ...active.map((a) => reason(a.code, a.text, a.source)),
      reason(
        'allegement',
        `Volume réduit de ${pct} %, aucune série à RPE ${ALERT_MAX_TARGET_RPE + 1} ou plus et conditionnement intense remplacé par de l’aérobie léger.`,
        source,
      ),
    ],
  }
  if (active.some((a) => a.code === 'charge-hors-appli')) ctx.maxMuscuSessions = MAINTENANCE_MAX_MUSCU_SESSIONS
  return ctx
}

function recoveryModeContext(alerts: readonly LoadAlert[]): PlanContext {
  const close = alerts.filter((a) => a.code === 'matchs-rapproches')
  if (close.length === 0) return {}
  return {
    recoveryMode: true,
    volumeFactor: RECOVERY_MODE_VOLUME_FACTOR,
    maxTargetRpe: RECOVERY_MODE_MAX_TARGET_RPE,
    lightConditioning: true,
    reasons: [
      ...close.map((a) => reason(a.code, a.text, a.source)),
      reason('mode-recuperation', 'Mode récupération : pas de musculation cette semaine, uniquement de la récupération active et de l’activation.', 'charge'),
    ],
  }
}

/** Ressenti revenu à la normale : le premier ressenti non dégradé entre D+1 et D+3. */
function firstNormalDay(mornings: readonly MorningInput[], matchDate: string): string | null {
  const days = [1, 2, 3].map((n) => addDays(matchDate, n))
  for (const day of days) {
    const entry = mornings.find((m) => m.date === day)
    if (entry && !assessWellness(entry, mornings).degraded) return day
  }
  return null
}

function hasPainAround(mornings: readonly MorningInput[], matchDate: string): boolean {
  return mornings.some((m) => (m.date === matchDate || m.date === addDays(matchDate, 1)) && (m.painZone !== null || m.scores.douleurs <= 2))
}

/** Effets d'un match dont les minutes sont connues sur la semaine générée (RC 7.3, RC-7.1). */
function minutesContext(input: AdaptationInput, suppressLoadAdds: boolean): PlanContext {
  const { weekStart, today, mornings } = input
  const inWeek = new Set(weekDates(weekStart))
  const parts: PlanContext[] = []

  for (const rating of input.matchRatings) {
    if (rating.minutesPlayed === null || rating.date > today) continue
    const d = rating.date
    const minutes = rating.minutesPlayed
    const category = classifyMinutes(minutes)
    const md1 = addDays(d, 1)
    const label = `${Math.round(minutes)} min`
    const highContact = (rating.contactIntensity ?? 0) >= CONTACT_HIGH_THRESHOLD
    const ctx: PlanContext = {}
    const dayReasons: Record<string, PlanReason[]> = {}
    const push = (date: string, r: PlanReason) => {
      if (inWeek.has(date) && date >= today) dayReasons[date] = [...(dayReasons[date] ?? []), r]
    }

    if (category === 'complet') {
      const normal = highContact ? null : firstNormalDay(mornings, d)
      const blockUntil = normal !== null ? addDays(normal, -1) : addDays(d, HEAVY_LEGS_BLOCK_DAYS)
      if (blockUntil >= weekStart && blockUntil >= today) ctx.blockHeavyLegsUntil = blockUntil
      push(
        md1,
        reason(
          'minutes-complet',
          highContact
            ? `Match de ${label} avec des contacts intenses : récupération active, pas de jambes lourdes pendant ${HEAVY_LEGS_BLOCK_DAYS} jours.`
            : `Match de ${label} : récupération active, pas de jambes lourdes avant le retour de ton ressenti à la normale.`,
          'charge',
        ),
      )
      for (let n = 2; n <= HEAVY_LEGS_BLOCK_DAYS; n++) {
        const date = addDays(d, n)
        if (date <= blockUntil) {
          push(date, reason('jambes-lourdes-bloquees', 'Pas de force lourde du bas du corps : ton ressenti n’est pas encore revenu à la normale après le match.', 'charge'))
        }
      }
    } else if (category === 'partiel') {
      const allowShort = !suppressLoadAdds && !highContact && !hasPainAround(mornings, d)
      if (allowShort) {
        if (inWeek.has(md1) && md1 >= today) ctx.compensation = { [md1]: 'courte' }
        push(md1, reason('minutes-partiel', `Match de ${label} : récupération légère, avec une compensation courte de 10 à 15 min (sprints à 90-95 %) si tu n’as aucune douleur.`, 'charge'))
      } else {
        push(md1, reason('minutes-partiel', `Match de ${label} : récupération légère, sans compensation.`, 'charge'))
      }
    } else {
      if (!suppressLoadAdds && !hasPainAround(mornings, d)) {
        if (inWeek.has(md1) && md1 >= today) ctx.compensation = { [md1]: 'complete' }
        push(md1, reason('minutes-peu', `Tu as joué ${label} : compensation de 15 à 20 min (sprints, blocs intermittents) à la place de la récupération.`, 'charge'))
      } else {
        push(md1, reason('minutes-peu', `Tu as joué ${label} : aucune compensation ajoutée, ton état demande de ne pas ajouter de charge.`, 'charge'))
      }
      // La semaine du match et la suivante sont traitées « sans match » côté musculation (§7.3).
      const matchWeek = mondayOf(d)
      if (!suppressLoadAdds && (weekStart === matchWeek || weekStart === addDays(matchWeek, 7))) {
        ctx.extraMuscuSession = true
        ctx.reasons = [
          reason('semaine-sans-match', `Tu as joué ${label} : cette semaine est traitée comme une semaine sans match côté musculation (3e séance possible).`, 'charge'),
        ]
      }
    }
    if (Object.keys(dayReasons).length > 0) ctx.dayReasons = dayReasons
    parts.push(ctx)
  }
  return mergeContexts(parts)
}

/**
 * Construit les alertes et le contexte de plan de la semaine à partir des saisies. Fonction pure et déterministe.
 * Les effets de l'état du jour (ressenti, charge, douleur) valent pour la semaine en cours ; les matchs rapprochés et les
 * minutes jouées valent pour toute semaine qu'ils touchent.
 */
export function adaptPlan(input: AdaptationInput): Adaptation {
  const alerts = computeAlerts(input)
  const lightening = allegementContext(alerts)
  const recovery = recoveryModeContext(alerts)
  const suppress = lightening.volumeFactor !== undefined || recovery.recoveryMode === true
  const minutes = minutesContext(input, suppress)

  const parts: PlanContext[] = [lightening, recovery, minutes]
  if (input.weekStart === mondayOf(input.today)) {
    const zones = repeatedPainZones(input.mornings, input.today)
    if (zones.length > 0) {
      parts.push({
        painZones: zones,
        reasons: [
          reason(
            'douleur-repetee',
            `Douleur signalée deux jours de suite (${zones.map(zoneLabel).join(', ')}) : les exercices à fort impact sur cette zone sont retirés.`,
            'ressenti',
          ),
        ],
      })
    }
  }
  return { alerts, context: mergeContexts(parts) }
}
