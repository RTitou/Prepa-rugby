import { db } from '../db'
import { newSyncFields, nowIso } from '../ids'
import type { LoggedSet, SessionLog } from '../../types/plan'
import { activeRows } from './base'
import { setSessionDone } from './planRepo'

/** Contenu d'un journal de séance saisi par le joueur. */
export interface SessionLogDraft {
  sessionId: string
  /** Date de la séance (AAAA-MM-JJ). */
  date: string
  weekStart: string
  title: string
  warmupDone: boolean
  sets: LoggedSet[]
}

export interface SessionFinish {
  /** RPE global de séance, CR-10 (0 à 10). */
  sessionRpe: number
  /** Durée réelle en minutes. */
  durationMin: number
}

function assertFinish(finish: SessionFinish): void {
  if (!Number.isFinite(finish.sessionRpe) || finish.sessionRpe < 0 || finish.sessionRpe > 10) {
    throw new Error('RPE de séance invalide (0 à 10).')
  }
  if (!Number.isFinite(finish.durationMin) || finish.durationMin <= 0) throw new Error('Durée de séance invalide.')
}

/** Journal d'une séance, ou undefined. La date accélère la recherche (colonne indexée). */
export async function getSessionLog(sessionId: string, date: string): Promise<SessionLog | undefined> {
  const rows = await db.sessionLogs.where('date').equals(date).toArray()
  return rows.find((r) => r.deletedAt === null && r.sessionId === sessionId)
}

/** Journaux actifs dont la date est dans l'intervalle (bornes incluses). */
export async function listSessionLogs(from: string, to: string): Promise<SessionLog[]> {
  const rows = await db.sessionLogs.where('date').between(from, to, true, true).toArray()
  return rows.filter((r) => r.deletedAt === null).sort((a, b) => a.date.localeCompare(b.date))
}

export async function listAllSessionLogs(): Promise<SessionLog[]> {
  return activeRows(db.sessionLogs)
}

/** Enregistre (ou met à jour) le brouillon d'une séance. Une séance terminée garde son statut. */
export async function saveSessionLog(draft: SessionLogDraft): Promise<SessionLog> {
  return db.transaction('rw', db.sessionLogs, async () => {
    const existing = await getSessionLog(draft.sessionId, draft.date)
    if (existing) {
      const updated: SessionLog = { ...existing, ...draft, updatedAt: nowIso() }
      await db.sessionLogs.put(updated)
      return updated
    }
    const created: SessionLog = {
      ...newSyncFields(),
      ...draft,
      status: 'en-cours',
      sessionRpe: null,
      durationMin: null,
      finishedAt: null,
    }
    await db.sessionLogs.add(created)
    return created
  })
}

/** Termine la séance : journal « terminee » avec RPE et durée, et séance marquée faite dans la semaine. */
export async function finishSessionLog(draft: SessionLogDraft, finish: SessionFinish): Promise<SessionLog> {
  assertFinish(finish)
  return db.transaction('rw', db.sessionLogs, db.plans, async () => {
    const saved = await saveSessionLog(draft)
    const done: SessionLog = {
      ...saved,
      status: 'terminee',
      sessionRpe: finish.sessionRpe,
      durationMin: finish.durationMin,
      finishedAt: nowIso(),
      updatedAt: nowIso(),
    }
    await db.sessionLogs.put(done)
    await setSessionDone(draft.weekStart, draft.sessionId, done.id)
    return done
  })
}
