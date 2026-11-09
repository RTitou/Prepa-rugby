import { db } from '../db'
import { newSyncFields, nowIso } from '../ids'
import type { ClubDay, ClubDayInput, Match, MatchInput } from '../../types/calendar'
import { activeRows, softDelete } from './base'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function assertMatch(input: MatchInput): void {
  if (!DATE_RE.test(input.date)) throw new Error('Date de match invalide (format AAAA-MM-JJ attendu).')
  if (input.time !== null && !TIME_RE.test(input.time)) throw new Error('Heure de match invalide (format HH:MM attendu).')
}

function assertClubDay(input: ClubDayInput): void {
  if (!Number.isInteger(input.weekday) || input.weekday < 1 || input.weekday > 7) throw new Error('Jour de semaine invalide.')
  if (!Number.isFinite(input.durationMin) || input.durationMin <= 0) throw new Error("Durée d'entraînement invalide.")
}

/* --- Jours club récurrents --- */

export async function listClubDays(): Promise<ClubDay[]> {
  const rows = await activeRows(db.clubDays)
  return rows.sort((a, b) => a.weekday - b.weekday)
}

export async function addClubDay(input: ClubDayInput): Promise<ClubDay> {
  assertClubDay(input)
  const created: ClubDay = { ...newSyncFields(), ...input }
  await db.clubDays.add(created)
  return created
}

export async function updateClubDay(id: string, changes: Partial<ClubDayInput>): Promise<void> {
  await db.clubDays.update(id, { ...changes, updatedAt: nowIso() })
}

export async function removeClubDay(id: string): Promise<void> {
  await softDelete(db.clubDays, id)
}

/**
 * Aligne les jours club actifs sur la liste donnée (un seul par jour de semaine) :
 * ajoute les nouveaux, modifie les changés, supprime logiquement les retirés.
 */
export async function setClubDays(days: ClubDayInput[]): Promise<ClubDay[]> {
  days.forEach(assertClubDay)
  return db.transaction('rw', db.clubDays, async () => {
    const existing = await listClubDays()
    const wanted = new Map(days.map((d) => [d.weekday, d]))
    for (const row of existing) {
      const next = wanted.get(row.weekday)
      if (!next) {
        await softDelete(db.clubDays, row.id)
      } else if (next.intensity !== row.intensity || next.durationMin !== row.durationMin) {
        await updateClubDay(row.id, { intensity: next.intensity, durationMin: next.durationMin })
      }
      wanted.delete(row.weekday)
    }
    for (const day of wanted.values()) await addClubDay(day)
    return listClubDays()
  })
}

/* --- Matchs ponctuels --- */

/** Matchs actifs triés par date puis heure. `from` (AAAA-MM-JJ) exclut les matchs antérieurs. */
export async function listMatches(from?: string): Promise<Match[]> {
  const rows = await activeRows(db.matches)
  return rows
    .filter((m) => from === undefined || m.date >= from)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
}

export async function addMatch(input: MatchInput): Promise<Match> {
  assertMatch(input)
  const created: Match = { ...newSyncFields(), ...input }
  await db.matches.add(created)
  return created
}

export async function updateMatch(id: string, changes: Partial<MatchInput>): Promise<void> {
  const current = await db.matches.get(id)
  if (!current || current.deletedAt !== null) throw new Error('Match introuvable.')
  const next = { date: changes.date ?? current.date, time: changes.time === undefined ? current.time : changes.time }
  assertMatch(next)
  await db.matches.update(id, { ...next, updatedAt: nowIso() })
}

export async function removeMatch(id: string): Promise<void> {
  await softDelete(db.matches, id)
}
