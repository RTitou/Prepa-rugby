import { db } from '../db'
import { newSyncFields, nowIso, todayLocal } from '../ids'
import { mergeContexts, type PlanContext } from '../../engine/context'
import { ENGINE_VERSION } from '../../engine/config'
import { addDays, mondayOf } from '../../engine/dates'
import { inputHash } from '../../engine/hash'
import { cycleAnchor, cycleWeekIndex } from '../../engine/progression/deload'
import { buildWeek, type BuildWeekInput } from '../../engine/week-builder/buildWeek'
import type { DayPlan, PlanProfile, SessionLog, WeekPlan } from '../../types/plan'
import { offseasonEnd, programWeek } from '../../engine/season'
import { listRecords } from './recordsRepo'
import { activeRows } from './base'
import { listClubDays, listMatches } from './calendarRepo'
import { getProfile } from './profileRepo'

/** Fournisseur de contexte d'une phase (ressenti, records, blessures) : renvoie ce qui pèse sur la semaine. */
export type PlanContextProvider = (weekStart: string) => Promise<PlanContext>

const providers: PlanContextProvider[] = []

/**
 * Point d'extension des phases 5 à 7 : enregistre un fournisseur de contexte. Les contextes de tous les
 * fournisseurs sont fusionnés et entrent dans l'empreinte de la semaine. Renvoie une fonction de retrait.
 */
export function registerPlanContextProvider(provider: PlanContextProvider): () => void {
  providers.push(provider)
  return () => {
    const i = providers.indexOf(provider)
    if (i !== -1) providers.splice(i, 1)
  }
}

async function loadContext(weekStart: string): Promise<PlanContext> {
  return mergeContexts(await Promise.all(providers.map((p) => p(weekStart))))
}

/** Semaine stockée (la plus récemment modifiée si plusieurs), ou null. */
export async function getWeekPlan(weekStart: string): Promise<WeekPlan | null> {
  const rows = (await db.plans.where('weekStart').equals(weekStart).toArray()).filter((r) => r.deletedAt === null)
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return rows[0] ?? null
}

export async function listWeekPlans(): Promise<WeekPlan[]> {
  const rows = await activeRows(db.plans)
  return rows.sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

/** Une semaine entièrement passée n'est plus générée ni recalculée (lecture seule). */
export function isPastWeek(weekStart: string, today: string): boolean {
  return addDays(weekStart, 6) < today
}

interface Gathered {
  buildInput: BuildWeekInput
  hash: string
  existing: WeekPlan | null
  logs: SessionLog[]
}

/** Répétitions des tests de force passés en semaine 1 de l'intersaison (dernier record de chaque mouvement dans la semaine). */
async function firstWeekTestReps(startMonday: string): Promise<NonNullable<PlanProfile['testReps']>> {
  const end = addDays(startMonday, 6)
  const out: NonNullable<PlanProfile['testReps']> = {}
  for (const r of await listRecords()) {
    if (r.date < startMonday || r.date > end || r.reps === null) continue
    if (r.test !== 'squat' && r.test !== 'developpe-couche' && r.test !== 'souleve-de-terre') continue
    if (out[r.test] === undefined) out[r.test] = r.reps
  }
  return out
}

async function gather(weekStart: string, today: string): Promise<Gathered | null> {
  const profile = await getProfile()
  if (!profile) return null
  const [clubDays, matches, plans, context, existing] = await Promise.all([
    listClubDays(),
    listMatches(),
    listWeekPlans(),
    loadContext(weekStart),
    getWeekPlan(weekStart),
  ])
  const logs = (await activeRows(db.sessionLogs)).filter((l) => l.weekStart === weekStart)

  const trackingStart = plans.length > 0 ? (plans[0]!.weekStart < weekStart ? plans[0]!.weekStart : weekStart) : weekStart
  const deloads = plans.filter((p) => p.isDeload).map((p) => p.weekStart)
  let anchor = cycleAnchor(weekStart, deloads, trackingStart)
  // Après une intersaison ATP (sans décharge), le cycle de 5 semaines repart du lundi qui suit la semaine 9.
  const phase = profile.trainingPhase
  if (phase?.kind === 'intersaison') {
    const afterOffseason = addDays(offseasonEnd(phase.startMonday), 1)
    if (afterOffseason <= weekStart && afterOffseason > anchor) anchor = afterOffseason
  }
  const cycleIndex = cycleWeekIndex(weekStart, anchor)
  const week = programWeek(phase, weekStart)

  const clubLite = clubDays.map((c) => ({ weekday: c.weekday, intensity: c.intensity, durationMin: c.durationMin }))
  const matchLite = matches.map((m) => ({ date: m.date, time: m.time }))

  const locked = lockedDays(existing, logs, today)
  const buildInput: BuildWeekInput = {
    weekStart,
    today,
    profile: {
      position: profile.position,
      sex: profile.sex,
      liftingExperience: profile.liftingExperience,
      programWeek: week,
      ...(profile.goals ? { goals: profile.goals } : {}),
      ...(week === 9 && phase?.kind === 'intersaison' ? { testReps: await firstWeekTestReps(phase.startMonday) } : {}),
    },
    clubDays: clubLite,
    matches: matchLite,
    cycleIndex,
    context,
    locked,
  }

  // L'empreinte couvre ce qui change le résultat : profil, calendrier voisin, cycle de charge, contexte.
  // Elle exclut la date du jour : rouvrir l'appli un autre jour ne régénère pas une semaine inchangée.
  const near = matchLite.filter((m) => m.date >= addDays(weekStart, -7) && m.date <= addDays(weekStart, 14))
  const hash = inputHash({
    v: ENGINE_VERSION,
    profile: buildInput.profile,
    club: [...clubLite].sort((a, b) => a.weekday - b.weekday),
    matches: near,
    cycleIndex,
    context,
  })
  return { buildInput, hash, existing, logs }
}

/**
 * Jours conservés : passés, ou dont la séance est faite (statut du plan ou journal terminé), ou déjà commencée (journal en cours :
 * la séance en train d'être saisie ne change plus sous les doigts du joueur).
 */
function lockedDays(existing: WeekPlan | null, logs: readonly SessionLog[], today: string): DayPlan[] {
  if (!existing) return []
  const doneIds = new Map(logs.filter((l) => l.status === 'terminee').map((l) => [l.sessionId, l.id]))
  const startedIds = new Set(logs.map((l) => l.sessionId))
  const out: DayPlan[] = []
  for (const day of existing.days) {
    const logId = day.session ? doneIds.get(day.session.id) : undefined
    const done = day.session?.status === 'faite' || logId !== undefined
    const started = day.session !== null && startedIds.has(day.session.id)
    if (day.date < today || done || started) {
      const session = day.session && done ? { ...day.session, status: 'faite' as const, logId: logId ?? day.session.logId } : day.session
      out.push({ ...day, session, locked: true })
    }
  }
  return out
}

export interface PlanStatus {
  plan: WeekPlan | null
  hash: string | null
  /** Vrai si la semaine doit être (re)générée : absente ou entrées modifiées, et pas entièrement passée. */
  needsGeneration: boolean
}

export async function planStatus(weekStart: string, today: string = todayLocal()): Promise<PlanStatus> {
  const g = await gather(weekStart, today)
  if (!g) return { plan: await getWeekPlan(weekStart), hash: null, needsGeneration: false }
  const stale = g.existing === null || g.existing.inputHash !== g.hash
  return { plan: g.existing, hash: g.hash, needsGeneration: stale && !isPastWeek(weekStart, today) }
}

const inFlight = new Map<string, Promise<WeekPlan | null>>()

/**
 * Renvoie la semaine du lundi donné : la génère si elle est absente, la régénère si les entrées ont changé
 * (jours restants seulement : passé et séances faites conservés). Une semaine passée n'est jamais recalculée.
 */
export function ensureWeekPlan(weekStart: string, today: string = todayLocal()): Promise<WeekPlan | null> {
  const key = `${weekStart}|${today}`
  const pending = inFlight.get(key)
  if (pending) return pending
  const run = (async () => {
    const g = await gather(weekStart, today)
    if (!g) return null
    if (isPastWeek(weekStart, today)) return g.existing
    if (g.existing && g.existing.inputHash === g.hash) return g.existing
    const built = buildWeek(g.buildInput)
    const row: WeekPlan = {
      ...(g.existing ?? newSyncFields()),
      weekStart,
      inputHash: g.hash,
      isDeload: built.isDeload,
      hasMatch: built.hasMatch,
      days: built.days,
      flags: built.flags,
      generatedAt: nowIso(),
      updatedAt: nowIso(),
    }
    await db.plans.put(row)
    return row
  })().finally(() => inFlight.delete(key))
  inFlight.set(key, run)
  return run
}

/** Semaine contenant la date (lundi → dimanche). */
export function weekStartOf(date: string): string {
  return mondayOf(date)
}

/** Marque la séance faite dans la semaine stockée et la relie à son journal. */
export async function setSessionDone(weekStart: string, sessionId: string, logId: string): Promise<void> {
  const plan = await getWeekPlan(weekStart)
  if (!plan) return
  const days = plan.days.map((d) =>
    d.session && d.session.id === sessionId ? { ...d, session: { ...d.session, status: 'faite' as const, logId } } : d,
  )
  await db.plans.put({ ...plan, days, updatedAt: nowIso() })
}
