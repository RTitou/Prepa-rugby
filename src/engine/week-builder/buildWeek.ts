import type { ClubIntensity, Weekday } from '../../types/calendar'
import type { DayKind, DayPlan, PlanProfile, PlanReason, Session, SessionSlot, WeekFlag } from '../../types/plan'
import type { PlanContext } from '../context'
import {
  ACTIVATION_AT_MD_MINUS_1,
  CLUB_DOES_MAX_SPEED,
  CONDITIONING_SESSIONS_NO_MATCH,
  LOWER_HEAVY_MD_PREFERENCE,
  MIN_DAYS_LOWER_HEAVY_FROM_MATCH,
  MUSCU_SESSIONS_NO_MATCH,
  MUSCU_SESSIONS_WITH_MATCH,
  RECOVERY_AT_MD_PLUS_1,
  RECOVERY_MODE_RECOVERY_DAYS,
  SPEED_MD_PREFERENCE,
  UPPER_MD_PREFERENCE,
} from '../config'
import { diffDays, isoWeekNumber, weekDates, weekdayOf } from '../dates'
import { closeMatchFlags, matchDistance, mdLabel, mdOffset, weekHasMatch, type MatchLite } from '../matchDay'
import { applyInjuries } from '../injuries/applyInjuries'
import { applyInjuriesToWarmup } from '../injuries/adaptWarmup'
import { isScheduledDeload } from '../progression/deload'
import { startingLevel } from '../progression/level'
import { composeSession } from './composeSession'
import { composeAtp } from './composeAtp'
import { ATP_WEEK } from '../../reference/atp/sessions'
import { OFFSEASON_WEEKS } from '../config'

export interface ClubLite {
  weekday: Weekday
  intensity: ClubIntensity
  durationMin: number
}

export interface BuildWeekInput {
  /** Lundi de la semaine (AAAA-MM-JJ). */
  weekStart: string
  /** Date du jour : aucune séance n'est placée avant. */
  today: string
  profile: PlanProfile
  clubDays: readonly ClubLite[]
  /** Tous les matchs connus (la semaine et ses voisines : MD+1 peut tomber la semaine d'après). */
  matches: readonly MatchLite[]
  /** Rang de la semaine dans le cycle de charge, pour la semaine allégée (voir progression/deload.ts). */
  cycleIndex: number
  /** Point d'extension des phases 5 à 7. */
  context?: PlanContext
  /** Jours conservés tels quels (passés ou séance faite) ; leurs séances comptent dans la semaine. */
  locked?: readonly DayPlan[]
}

export interface BuiltWeek {
  weekStart: string
  isDeload: boolean
  hasMatch: boolean
  days: DayPlan[]
  flags: WeekFlag[]
}

interface Cell {
  date: string
  weekday: Weekday
  md: number | null
  sincePrev: number | null
  toNext: number | null
  isMatch: boolean
  club: ClubLite | null
  locked: DayPlan | null
  past: boolean
  session: Session | null
}

function prefRank(list: readonly number[], md: number | null): number {
  if (md === null) return list.length
  const i = list.indexOf(md)
  return i === -1 ? list.length : i
}

/** Écart minimal (jours) entre une date et les séances déjà placées ; grand si aucune. */
function minDistance(date: string, placed: readonly string[]): number {
  if (placed.length === 0) return 99
  return Math.min(...placed.map((p) => Math.abs(diffDays(p, date))))
}

function compare(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i]! !== b[i]!) return a[i]! - b[i]!
  }
  return 0
}

function baseKind(cell: Cell): DayKind {
  if (cell.isMatch) return 'match'
  if (cell.club) return cell.club.intensity === 'lourd' ? 'club-lourd' : 'club-normal'
  return 'repos'
}

function reason(code: string, text: string): PlanReason {
  return { code, text, source: 'moteur' }
}

function slotPlan(level: ReturnType<typeof startingLevel>, target: number): SessionSlot[] {
  const all: SessionSlot[] = level.fullBody
    ? ['corps-entier', 'corps-entier', 'corps-entier']
    : level.differentiated
      ? ['bas-force', 'haut', 'puissance']
      : ['bas-force', 'haut', 'corps-entier']
  return all.slice(0, target)
}

/** Les séances de force bas du corps et de puissance doivent respecter l'écart de 48 h autour d'un match. */
function needsMatchGap(slot: SessionSlot): boolean {
  return slot === 'bas-force' || slot === 'puissance'
}

/**
 * Construit la semaine lundi → dimanche : étiquettes MD±n, placement des séances (RC-4.1 à 4.4, RC-5.4),
 * contenu de chaque séance. Fonction pure et déterministe : mêmes entrées, même semaine.
 */
export function buildWeek(input: BuildWeekInput): BuiltWeek {
  const week = input.profile.programWeek ?? null
  if (week === null || week < 1 || week > OFFSEASON_WEEKS) return buildSeasonWeek(input)
  // Intersaison : une semaine qui contient un match repasse en logique saison, avec sa raison.
  if (weekHasMatch(input.weekStart, input.matches)) return withOffseasonMatchReason(buildSeasonWeek(input), week)
  return buildOffseasonWeek(input, week)
}

function withOffseasonMatchReason(built: BuiltWeek, week: number): BuiltWeek {
  const r = reason('intersaison-match', `Match pendant l’intersaison (semaine ${week} sur 9) : cette semaine suit la logique saison.`)
  return {
    ...built,
    days: built.days.map((d) =>
      d.locked ? d : { ...d, reasons: [...d.reasons, r], session: d.session ? { ...d.session, reasons: [...d.session.reasons, r] } : null },
    ),
  }
}

/**
 * Semaine type ATP de l'intersaison, du lundi au dimanche : lower, upper, conditioning, accessoire (facultatif), terrain,
 * full body, récupération (facultative). Pas de décharge ; les jours de club sont ignorés (raison affichée) ; ressenti,
 * blessures et suspension s'appliquent comme en saison. Les jours passés ou faits restent tels quels.
 */
function buildOffseasonWeek(input: BuildWeekInput, week: number): BuiltWeek {
  const { weekStart, today, profile, context } = input
  const lockedByDate = new Map((input.locked ?? []).map((d) => [d.date, d]))
  const clubByWeekday = new Map(input.clubDays.map((c) => [c.weekday, c]))
  const suspended = context?.suspended === true
  const injuryZones = context?.injuryZones ?? []
  const painZones = context?.painZones ?? []

  const days: DayPlan[] = weekDates(weekStart).map((date, i) => {
    const locked = lockedByDate.get(date)
    if (locked) return { ...locked, locked: true }
    const weekday = weekdayOf(date)
    const club = clubByWeekday.get(weekday) ?? null
    const past = date < today
    const day = ATP_WEEK[i]!
    const reasons: PlanReason[] = []
    let session: Session | null = null
    if (!past) {
      reasons.push(...(context?.dayReasons?.[date] ?? []))
      if (suspended) reasons.push(reason('plan-suspendu', 'Plan suspendu : aucune séance prévue.'))
      if (club) reasons.push(reason('intersaison-club', 'Intersaison : ton entraînement club n’est pas compté dans la semaine type ATP.'))
      if (!suspended) {
        const raw =
          day === 'conditioning' && context?.lightConditioning
            ? { ...composeSession({ date, slot: 'conditionnement', index: 0, profile, rotation: 0, deload: false, includeSpeed: false, context }), programWeek: week }
            : composeAtp({ date, day, week, profile, ...(context ? { context } : {}) })
        session = applyInjuriesToWarmup(applyInjuries(raw, injuryZones, profile.liftingExperience), injuryZones, painZones)
      }
    }
    const kind: DayKind = session ? (session.kind === 'recuperation' ? 'recuperation' : 'seance') : 'repos'
    return {
      date,
      weekday,
      md: null,
      mdLabel: null,
      kind,
      club: club ? { intensity: club.intensity, durationMin: club.durationMin } : null,
      match: null,
      session,
      reasons,
      locked: past,
    }
  })
  return { weekStart, isDeload: false, hasMatch: false, days, flags: [] }
}

function buildSeasonWeek(input: BuildWeekInput): BuiltWeek {
  const { weekStart, today, profile, context } = input
  const dates = weekDates(weekStart)
  const hasMatch = weekHasMatch(weekStart, input.matches)
  const isDeload = context?.forceDeload === true || isScheduledDeload(input.cycleIndex)
  const level = startingLevel(profile.liftingExperience)
  const lockedByDate = new Map((input.locked ?? []).map((d) => [d.date, d]))
  const clubByWeekday = new Map(input.clubDays.map((c) => [c.weekday, c]))

  const cells: Cell[] = dates.map((date) => {
    const weekday = weekdayOf(date)
    const dist = matchDistance(date, input.matches)
    const past = date < today
    const lockedDay = lockedByDate.get(date) ?? null
    return {
      date,
      weekday,
      md: mdOffset(date, input.matches),
      sincePrev: dist.sincePrev,
      toNext: dist.toNext,
      isMatch: dist.isMatchDay,
      club: clubByWeekday.get(weekday) ?? null,
      locked: lockedDay,
      past,
      session: null,
    }
  })

  const free = (c: Cell) => !c.locked && !c.past
  const suspended = context?.suspended === true
  const recoveryMode = context?.recoveryMode === true
  const legsBlockedUntil = context?.blockHeavyLegsUntil

  // Séances déjà posées (jours conservés) : elles occupent des créneaux de la semaine.
  const lockedSessions = cells.flatMap((c) => (c.locked?.session ? [c.locked.session] : []))
  const lockedMuscu = lockedSessions.filter((s) => s.kind === 'muscu')
  const placedDates = new Set(lockedSessions.map((s) => s.date))

  // --- Nombre et nature des séances de musculation (RC-4.2, RC-5.1) ---
  let target = hasMatch ? MUSCU_SESSIONS_WITH_MATCH : MUSCU_SESSIONS_NO_MATCH
  if (hasMatch && context?.extraMuscuSession) target += 1
  target = Math.min(target, level.maxMuscuSessions, context?.maxMuscuSessions ?? Infinity)
  // RC-7.2 : deux matchs à moins de 72 h, aucune musculation, uniquement de la récupération.
  if (recoveryMode) target = 0
  const slots = slotPlan(level, target)
  for (const s of lockedMuscu) {
    const i = slots.indexOf(s.slot)
    if (i !== -1) slots.splice(i, 1)
    else if (slots.length > 0) slots.pop()
  }

  const placement = new Map<string, { slot: SessionSlot; reasons: PlanReason[] }>()

  if (!suspended) {
    // Les séances qui exigent 48 h autour du match passent en premier : elles ont le moins de choix.
    const ordered = [...slots].sort((a, b) => Number(needsMatchGap(b)) - Number(needsMatchGap(a)))
    const candidateBase = (c: Cell) =>
      free(c) &&
      !placement.has(c.date) &&
      !placedDates.has(c.date) &&
      !c.isMatch &&
      c.club?.intensity !== 'lourd' &&
      c.toNext !== 1 && // RC-4.1 : rien d'intense à MD-1
      !(RECOVERY_AT_MD_PLUS_1 && c.sincePrev === 1 && c.md === 1) // MD+1 : récupération

    for (const slot of ordered) {
      let effectiveSlot = slot
      const reasons: PlanReason[] = []
      // RC 7.3 : après un match joué 60 min ou plus, pas de jambes lourdes avant le retour du ressenti à la normale.
      const legsFree = (c: Cell) => legsBlockedUntil === undefined || c.date > legsBlockedUntil
      const gapOk = (c: Cell) =>
        (c.sincePrev === null || c.sincePrev >= MIN_DAYS_LOWER_HEAVY_FROM_MATCH) &&
        (c.toNext === null || c.toNext >= MIN_DAYS_LOWER_HEAVY_FROM_MATCH) &&
        legsFree(c)
      let candidates = cells.filter((c) => candidateBase(c) && (!needsMatchGap(slot) || gapOk(c)))
      if (candidates.length === 0 && needsMatchGap(slot)) {
        // Aucun créneau à 48 h du match : on remplace par du haut du corps, jamais de jambes lourdes trop près.
        effectiveSlot = 'haut'
        candidates = cells.filter(candidateBase)
        if (candidates.length > 0) {
          reasons.push(
            legsBlockedUntil !== undefined && cells.some((c) => candidateBase(c) && !legsFree(c))
              ? reason('jambes-lourdes-bloquees', 'Pas de créneau sans jambes lourdes pendant ta récupération du match : séance remplacée par du haut du corps.')
              : reason('bas-48h', 'Pas de créneau à plus de 48 h du match : séance remplacée par du haut du corps.'),
          )
        }
      }
      if (candidates.length === 0) continue

      const placedNow = [...placedDates, ...placement.keys()]
      const pref = needsMatchGap(effectiveSlot) ? LOWER_HEAVY_MD_PREFERENCE : UPPER_MD_PREFERENCE
      const keyOf = (c: Cell): number[] =>
        needsMatchGap(effectiveSlot)
          ? [c.club ? 1 : 0, prefRank(pref, c.md), -minDistance(c.date, placedNow)]
          : [c.club ? 1 : 0, -minDistance(c.date, placedNow), prefRank(pref, c.md)]
      const best = [...candidates].sort((a, b) => compare(keyOf(a), keyOf(b)) || a.date.localeCompare(b.date))[0]!

      if (effectiveSlot === 'bas-force') {
        if (best.toNext !== null && best.md !== null && best.md < 0) {
          reasons.push(reason('bas-48h', `Force du bas du corps à MD${best.md} : au moins 48 h avant le match.`))
        } else if (best.sincePrev !== null) {
          reasons.push(reason('bas-48h', 'Force du bas du corps à plus de 48 h du dernier match.'))
        }
      }
      if (best.club) {
        reasons.push(reason('jour-club', 'Même jour qu’un entraînement club normal : aucun autre créneau libre.'))
      }
      placement.set(best.date, { slot: effectiveSlot, reasons })
    }
  }

  // --- Rappel de vitesse maximale (RC-4.4) ---
  const speedDates = new Set<string>()
  const alreadyHasSpeed = lockedMuscu.some((s) => s.exercises.some((e) => e.block === 'vitesse'))
  if (!CLUB_DOES_MAX_SPEED && !alreadyHasSpeed && placement.size > 0) {
    const hosts = cells.filter((c) => placement.has(c.date))
    const host = [...hosts].sort(
      (a, b) => prefRank(SPEED_MD_PREFERENCE, a.md) - prefRank(SPEED_MD_PREFERENCE, b.md) || a.date.localeCompare(b.date),
    )[0]!
    speedDates.add(host.date)
  }

  // --- Conditionnement en semaine sans match, un jour séparé de la puissance (RC-5.4) ---
  const conditioning = new Set<string>()
  const repeatedSprintDates = new Set<string>()
  if (!suspended && !hasMatch && !recoveryMode) {
    const powerDays = (): string[] => [
      ...[...placement.entries()].filter(([, p]) => p.slot === 'puissance' || p.slot === 'bas-force').map(([d]) => d),
      ...lockedMuscu.filter((s) => s.slot === 'puissance' || s.slot === 'bas-force').map((s) => s.date),
    ]
    // Objectif principal endurance : un conditionnement de plus.
    const conditioningCount = CONDITIONING_SESSIONS_NO_MATCH + (profile.goals?.primary === 'endurance' ? 1 : 0)
    for (let n = 0; n < conditioningCount; n++) {
      const taken = new Set([...placement.keys(), ...conditioning, ...placedDates])
      const options = cells.filter(
        (c) => free(c) && !taken.has(c.date) && !c.isMatch && c.club?.intensity !== 'lourd' && c.sincePrev !== 1,
      )
      if (options.length === 0) break
      const best = [...options].sort(
        (a, b) =>
          compare(
            [a.club ? 1 : 0, -minDistance(a.date, powerDays())],
            [b.club ? 1 : 0, -minDistance(b.date, powerDays())],
          ) || a.date.localeCompare(b.date),
      )[0]!
      conditioning.add(best.date)
      // Conditionnement ajouté pour l'objectif endurance : sprints répétés (méta-analyse Sports Med 2023 : Yo-Yo IR1, VO2max,
      // changements de direction et saut améliorés chez des athlètes entraînés).
      if (n >= CONDITIONING_SESSIONS_NO_MATCH) repeatedSprintDates.add(best.date)
    }
  }

  // --- Composition des séances ---
  const rotation = isoWeekNumber(weekStart)
  const muscuDates = [...placement.keys(), ...lockedMuscu.map((s) => s.date)].sort()
  const injuryZones = context?.injuryZones ?? []
  // Blessures actives (RC-8.4) : exclusion et substitution appliquées à chaque séance composée.
  const painZones = context?.painZones ?? []
  const compose = (cell: Cell, slot: SessionSlot, reasons: PlanReason[], repeatedSprints = false): Session =>
    applyInjuriesToWarmup(
      applyInjuries(
        composeSession({
          date: cell.date,
          slot,
          index: muscuDates.indexOf(cell.date),
          profile,
          rotation,
          deload: isDeload,
          cycleIndex: input.cycleIndex,
          toNextMatch: cell.toNext,
          includeSpeed: speedDates.has(cell.date),
          ...(context ? { context } : {}),
          ...(repeatedSprints ? { repeatedSprints: true } : {}),
          reasons,
        }),
        injuryZones,
        profile.liftingExperience,
      ),
      injuryZones,
      painZones,
    )

  for (const cell of cells) {
    if (placement.has(cell.date)) {
      const p = placement.get(cell.date)!
      cell.session = compose(cell, p.slot, p.reasons)
    } else if (conditioning.has(cell.date)) {
      cell.session = compose(cell, 'conditionnement', [], repeatedSprintDates.has(cell.date))
    } else if (free(cell) && !suspended && !cell.isMatch && !cell.club && !placedDates.has(cell.date)) {
      if (context?.compensation?.[cell.date] === 'complete' && !recoveryMode) cell.session = compose(cell, 'compensation', [])
      else if (RECOVERY_AT_MD_PLUS_1 && cell.md === 1 && cell.sincePrev === 1) cell.session = compose(cell, 'recuperation', [])
      else if (recoveryMode && cell.sincePrev !== null && cell.sincePrev <= RECOVERY_MODE_RECOVERY_DAYS && cell.toNext !== 1) {
        cell.session = compose(cell, 'recuperation', [])
      } else if (ACTIVATION_AT_MD_MINUS_1 && cell.toNext === 1) cell.session = compose(cell, 'activation', [])
    }
  }

  const days: DayPlan[] = cells.map((cell) => {
    if (cell.locked) return { ...cell.locked, locked: true }
    const kind: DayKind = cell.session
      ? cell.club
        ? baseKind(cell)
        : cell.session.kind === 'recuperation'
          ? 'recuperation'
          : cell.session.kind === 'activation'
            ? 'activation'
            : 'seance'
      : baseKind(cell)
    const matchRow = cell.isMatch ? input.matches.find((m) => m.date === cell.date) : undefined
    const reasons: PlanReason[] = []
    if (suspended && !cell.past) reasons.push(reason('plan-suspendu', 'Plan suspendu : aucune séance prévue.'))
    if (!cell.past) reasons.push(...(context?.dayReasons?.[cell.date] ?? []))
    return {
      date: cell.date,
      weekday: cell.weekday,
      md: cell.md,
      mdLabel: mdLabel(cell.md),
      kind,
      club: cell.club ? { intensity: cell.club.intensity, durationMin: cell.club.durationMin } : null,
      match: cell.isMatch ? { time: matchRow?.time ?? null } : null,
      session: cell.session,
      reasons,
      locked: cell.past,
    }
  })

  const flags: WeekFlag[] = closeMatchFlags(weekStart, input.matches)
  if (recoveryMode && flags.length > 0) {
    flags.push({
      code: 'surcharge',
      source: 'charge',
      text: 'Signal de surcharge : semaine en mode récupération, pas de musculation.',
      dates: flags.flatMap((f) => f.dates),
    })
  }
  return { weekStart, isDeload, hasMatch, days, flags }
}
