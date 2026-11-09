import { db } from '../db'
import { newSyncFields, nowIso } from '../ids'
import { BODY_ZONES, type BodyZone } from '../../types/reference'
import {
  CONTACT_MAX,
  CONTACT_MIN,
  RATING_RPE_MAX,
  RATING_RPE_MIN,
  WELLNESS_ITEMS,
  type MorningWellness,
  type RatingKind,
  type SessionRating,
  type WellnessScores,
} from '../../types/wellness'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function assertDate(date: string): void {
  if (!DATE_RE.test(date)) throw new Error('Date invalide (format AAAA-MM-JJ attendu).')
}

/* --- Ressenti du matin : une seule saisie par date, la dernière remplace la précédente --- */

export interface MorningInput {
  date: string
  scores: WellnessScores
  painZone: BodyZone | null
}

function assertMorning(input: MorningInput): void {
  assertDate(input.date)
  for (const item of WELLNESS_ITEMS) {
    const v = input.scores[item.key]
    if (!Number.isInteger(v) || v < 1 || v > 5) throw new Error(`Note invalide pour « ${item.label} » (1 à 5).`)
  }
  if (input.painZone !== null && !BODY_ZONES.some((z) => z.value === input.painZone)) throw new Error('Zone de douleur invalide.')
}

async function rowsOf(date: string): Promise<(MorningWellness | SessionRating)[]> {
  const rows = await db.wellness.where('date').equals(date).toArray()
  return rows.filter((r) => r.deletedAt === null)
}

export async function getMorningWellness(date: string): Promise<MorningWellness | undefined> {
  return (await rowsOf(date)).find((r): r is MorningWellness => r.kind === 'matin')
}

/** Ressentis du matin actifs dont la date est dans l'intervalle (bornes incluses), triés par date. */
export async function listMorningWellness(from: string, to: string): Promise<MorningWellness[]> {
  const rows = await db.wellness.where('date').between(from, to, true, true).toArray()
  return rows.filter((r): r is MorningWellness => r.deletedAt === null && r.kind === 'matin').sort((a, b) => a.date.localeCompare(b.date))
}

export async function listAllMorningWellness(): Promise<MorningWellness[]> {
  const rows = await db.wellness.where('kind').equals('matin').toArray()
  return rows.filter((r): r is MorningWellness => r.deletedAt === null).sort((a, b) => a.date.localeCompare(b.date))
}

/** Enregistre le ressenti du matin ; une saisie existante pour la même date est remplacée (pas de doublon). */
export async function saveMorningWellness(input: MorningInput): Promise<MorningWellness> {
  assertMorning(input)
  return db.transaction('rw', db.wellness, async () => {
    const existing = await getMorningWellness(input.date)
    const row: MorningWellness = {
      ...(existing ?? newSyncFields()),
      kind: 'matin',
      date: input.date,
      scores: { ...input.scores },
      painZone: input.painZone,
      updatedAt: nowIso(),
    }
    await db.wellness.put(row)
    return row
  })
}

/* --- Notes de séance club et de match --- */

export interface RatingInput {
  kind: RatingKind
  date: string
  /** Dureté CR-10, 1 à 10. */
  rpe?: number
  durationMin?: number
  /** Minutes jouées (match). */
  minutesPlayed?: number
  /** Intensité des contacts 1 à 5, ou null pour l'effacer. */
  contactIntensity?: number | null
}

function assertRating(input: RatingInput): void {
  assertDate(input.date)
  if (input.kind !== 'club' && input.kind !== 'match') throw new Error('Type de séance invalide.')
  if (input.rpe !== undefined && (!Number.isInteger(input.rpe) || input.rpe < RATING_RPE_MIN || input.rpe > RATING_RPE_MAX)) {
    throw new Error(`Dureté invalide (${RATING_RPE_MIN} à ${RATING_RPE_MAX}).`)
  }
  if (input.durationMin !== undefined && (!Number.isFinite(input.durationMin) || input.durationMin <= 0)) throw new Error('Durée invalide.')
  if (input.minutesPlayed !== undefined) {
    if (input.kind !== 'match') throw new Error('Les minutes jouées ne concernent que les matchs.')
    if (!Number.isFinite(input.minutesPlayed) || input.minutesPlayed < 0 || input.minutesPlayed > 150) throw new Error('Minutes jouées invalides.')
  }
  const c = input.contactIntensity
  if (c !== undefined && c !== null && (!Number.isInteger(c) || c < CONTACT_MIN || c > CONTACT_MAX)) {
    throw new Error(`Intensité des contacts invalide (${CONTACT_MIN} à ${CONTACT_MAX}).`)
  }
}

export async function getSessionRating(date: string, kind: RatingKind): Promise<SessionRating | undefined> {
  return (await rowsOf(date)).find((r): r is SessionRating => r.kind === kind)
}

export async function listSessionRatings(from: string, to: string): Promise<SessionRating[]> {
  const rows = await db.wellness.where('date').between(from, to, true, true).toArray()
  return rows.filter((r): r is SessionRating => r.deletedAt === null && r.kind !== 'matin').sort((a, b) => a.date.localeCompare(b.date))
}

export async function listAllSessionRatings(): Promise<SessionRating[]> {
  const rows = await db.wellness.toArray()
  return rows.filter((r): r is SessionRating => r.deletedAt === null && r.kind !== 'matin')
}

/**
 * Enregistre la note d'une séance club ou d'un match. Il n'y a qu'une saisie par date et par type : les champs fournis
 * remplacent ceux de la saisie précédente, les autres sont conservés (la dureté et les minutes se saisissent en deux gestes).
 */
export async function saveSessionRating(input: RatingInput): Promise<SessionRating> {
  assertRating(input)
  return db.transaction('rw', db.wellness, async () => {
    const existing = await getSessionRating(input.date, input.kind)
    const row: SessionRating = {
      ...(existing ?? newSyncFields()),
      kind: input.kind,
      date: input.date,
      rpe: input.rpe ?? existing?.rpe ?? null,
      durationMin: input.durationMin ?? existing?.durationMin ?? null,
      minutesPlayed: input.minutesPlayed ?? existing?.minutesPlayed ?? null,
      contactIntensity: input.contactIntensity === undefined ? (existing?.contactIntensity ?? null) : input.contactIntensity,
      updatedAt: nowIso(),
    }
    await db.wellness.put(row)
    return row
  })
}
