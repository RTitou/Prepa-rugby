import Dexie, { type EntityTable } from 'dexie'
import type { ClubDay, Match } from '../types/calendar'
import type { Injury } from '../types/injury'
import type { Profile } from '../types/profile'
import type { SessionLog, WeekPlan } from '../types/plan'
import type { PerformanceRecord } from '../types/records'
import type { SyncFields } from '../types/sync'
import type { WellnessEntry } from '../types/wellness'

export const DB_NAME = 'prepa-rugby'

/** Version du schéma Dexie (= this.version(n) ci-dessous). Écrite dans les sauvegardes : à incrémenter avec chaque this.version(n+1). */
export const SCHEMA_VERSION = 1

/** Toutes les tables de la base, dans l'ordre de la sauvegarde. */
export const TABLE_NAMES = ['profile', 'clubDays', 'matches', 'records', 'wellness', 'sessionLogs', 'plans', 'injuries', 'meta'] as const
export type TableName = (typeof TABLE_NAMES)[number]

/*
 * Lignes des tables des phases suivantes. Elles sont déclarées dès la version 1 pour éviter une
 * migration ; chaque phase précisera le type de sa table (dans src/types/) et ajoutera son dépôt.
 */
/** Phase 5 : ressentis du matin, notes club/match, minutes jouées (voir types/wellness.ts). */
export type WellnessRow = WellnessEntry
/** Phase 7 : blessures (voir types/injury.ts). Index : zone, status. */
export type InjuryRow = Injury
/** Réglages techniques (ex. date de dernière sauvegarde en phase 8). */
export interface MetaRow extends SyncFields {
  key: string
  value: unknown
}

/** Colonnes communes indexées : id (clé), updatedAt (synchro), deletedAt (suppression logique). */
const SYNC = 'id, updatedAt, deletedAt'

export class AppDb extends Dexie {
  profile!: EntityTable<Profile, 'id'>
  clubDays!: EntityTable<ClubDay, 'id'>
  matches!: EntityTable<Match, 'id'>
  records!: EntityTable<PerformanceRecord, 'id'>
  wellness!: EntityTable<WellnessRow, 'id'>
  sessionLogs!: EntityTable<SessionLog, 'id'>
  plans!: EntityTable<WeekPlan, 'id'>
  injuries!: EntityTable<InjuryRow, 'id'>
  meta!: EntityTable<MetaRow, 'id'>

  constructor(name: string = DB_NAME) {
    super(name)
    // Version de schéma explicite. Toute évolution : ajouter this.version(2).stores(...) avec upgrade.
    this.version(1).stores({
      profile: SYNC,
      clubDays: `${SYNC}, weekday`,
      matches: `${SYNC}, date`,
      records: `${SYNC}, test, date, [test+date]`,
      wellness: `${SYNC}, date, kind`,
      sessionLogs: `${SYNC}, date`,
      plans: `${SYNC}, weekStart`,
      injuries: `${SYNC}, zone, status`,
      meta: `${SYNC}, &key`,
    })
  }
}

/** Instance unique utilisée par les dépôts. */
export const db = new AppDb()

/**
 * Pour les écritures lancées au montage sans être attendues : une base fermée entre-temps (fermeture de
 * l'appli, remise à zéro des tests) n'a plus rien à écrire. Toute autre erreur reste remontée.
 */
export function ignoreClosedDb(promise: Promise<unknown>): void {
  promise.catch((error: unknown) => {
    if (!(error instanceof Dexie.DatabaseClosedError)) throw error
  })
}
