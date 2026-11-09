import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import type { WeekPlan } from '../types/plan'
import { ignoreClosedDb } from './db'
import { listClubDays, listMatches } from './repositories/calendarRepo'
import { addDays, mondayOf } from '../engine/dates'
import { LOAD_LOG_WINDOW_WEEKS } from '../engine/config'
import { buildPlayerMaxes } from '../engine/progression/suggestedLoad'
import { analyzeRecords } from '../engine/weaknesses/analyze'
import { todayLocal } from './ids'
import { parseSessionId } from '../engine/week-builder/composeSession'
import { ensureWeekPlan, getWeekPlan, planStatus } from './repositories/planRepo'
import { getProfile } from './repositories/profileRepo'
import { latestRecords, listRecords } from './repositories/recordsRepo'
import { getSessionLog, listSessionLogs } from './repositories/sessionLogRepo'
import { listInjuries } from './repositories/injuryRepo'
import { getMorningWellness, getSessionRating, listSessionRatings } from './repositories/wellnessRepo'
import type { RatingKind } from '../types/wellness'

/** undefined = chargement en cours ; null = aucun profil (premier lancement). */
export function useProfile() {
  return useLiveQuery(() => getProfile(), [])
}

export function useClubDays() {
  return useLiveQuery(() => listClubDays(), [])
}

export function useMatches(from?: string) {
  return useLiveQuery(() => listMatches(from), [from])
}

export function useRecords() {
  return useLiveQuery(() => listRecords(), [])
}

/**
 * Analyse des records du joueur (courbes, écarts au niveau au-dessus, orientation). undefined = chargement ;
 * null = pas de profil. Se met à jour dès qu'un record ou le profil change, hors connexion comprise.
 */
export function useRecordsAnalysis() {
  const profile = useProfile()
  const records = useRecords()
  const today = todayLocal()
  return useMemo(() => {
    if (profile === undefined || records === undefined) return undefined
    return profile ? analyzeRecords(profile, records, today) : null
  }, [profile, records, today])
}

export function useLatestRecords() {
  return useLiveQuery(() => latestRecords(), [])
}

/**
 * Semaine du lundi donné. Génère la semaine si elle est absente et la régénère si le profil ou le calendrier
 * ont changé (hash d'entrée) ; une semaine passée reste en lecture seule.
 * `loading` : lecture en cours ; plan null après chargement : rien de stocké pour cette semaine.
 */
export function useWeekPlan(weekStart: string): { loading: boolean; plan: WeekPlan | null } {
  const status = useLiveQuery(() => planStatus(weekStart), [weekStart])
  const needs = status?.needsGeneration === true
  const hash = status?.hash ?? null
  useEffect(() => {
    if (needs) ignoreClosedDb(ensureWeekPlan(weekStart))
  }, [needs, hash, weekStart])
  if (status === undefined) return { loading: true, plan: null }
  return { loading: needs && status.plan === null, plan: status.plan }
}

/**
 * Séance d'un plan stocké, retrouvée par son identifiant, avec son journal (null s'il n'y en a pas encore).
 * undefined = chargement ; null = séance introuvable. Séance et journal sont lus ensemble pour initialiser l'écran d'un coup.
 */
export function useSessionById(id: string | undefined) {
  return useLiveQuery(async () => {
    const parsed = id ? parseSessionId(id) : null
    if (!id || !parsed) return null
    const weekStart = mondayOf(parsed.date)
    const plan = await getWeekPlan(weekStart)
    const session = plan?.days.find((d) => d.session?.id === id)?.session ?? null
    if (!session) return null
    return { session, weekStart, log: (await getSessionLog(id, session.date)) ?? null }
  }, [id])
}

/**
 * Max du joueur pour les charges conseillées : records et séances journalisées récentes.
 * La séance `excludeSessionId` (celle en cours de saisie) n'est pas comptée. undefined = chargement.
 */
export function usePlayerMaxes(excludeSessionId?: string) {
  const today = todayLocal()
  return useLiveQuery(async () => {
    const [records, logs] = await Promise.all([listRecords(), listSessionLogs(addDays(today, -7 * LOAD_LOG_WINDOW_WEEKS), today)])
    return buildPlayerMaxes(records, logs, today, excludeSessionId)
  }, [today, excludeSessionId])
}

/** Blessures actives et guéries (les plus récentes d'abord). undefined = chargement. */
export function useInjuries() {
  return useLiveQuery(() => listInjuries(), [])
}

/** Ressenti du matin d'une date. undefined = chargement ; null = pas encore saisi. */
export function useMorningWellness(date: string) {
  return useLiveQuery(async () => (await getMorningWellness(date)) ?? null, [date])
}

/** Note d'une séance club ou d'un match à une date. undefined = chargement ; null = pas encore saisie. */
export function useSessionRating(date: string, kind: RatingKind) {
  return useLiveQuery(async () => (await getSessionRating(date, kind)) ?? null, [date, kind])
}

/** Notes club et match d'un intervalle de dates (bornes incluses). */
export function useSessionRatings(from: string, to: string) {
  return useLiveQuery(() => listSessionRatings(from, to), [from, to])
}
