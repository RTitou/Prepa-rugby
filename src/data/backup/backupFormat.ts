import { SCHEMA_VERSION, TABLE_NAMES, type TableName } from '../db'

/*
 * Format du fichier de sauvegarde :
 *   { app: 'prepa-rugby', schemaVersion: <n>, exportedAt: <ISO>, tables: { profile: [...], clubDays: [...], ..., meta: [...] } }
 * `tables` contient les 9 tables de la base, lignes supprimées logiquement comprises, telles quelles.
 */

export const BACKUP_APP = 'prepa-rugby'

export type BackupRows = Record<string, unknown>[]
export type BackupTables = Record<TableName, BackupRows>

export interface BackupFile {
  app: typeof BACKUP_APP
  schemaVersion: number
  exportedAt: string
  tables: BackupTables
}

/** Migration d'un fichier de la version n vers n+1 (aucune à ce jour : le schéma est en version 1). */
export type BackupMigration = (tables: BackupTables) => BackupTables

export const BACKUP_MIGRATIONS: Record<number, BackupMigration> = {}

export interface ParseOptions {
  /** Version courante du schéma (par défaut celle de la base) : paramétrable pour tester les migrations. */
  currentVersion?: number
  migrations?: Record<number, BackupMigration>
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
/** Objectifs du profil : absents, ou un principal et un secondaire (ou null) parmi les objectifs connus. */
const GOALS = ['puissance', 'force-hypertrophie', 'explosivite', 'endurance']
const isGoals = (v: unknown): boolean =>
  v === undefined ||
  (isObject(v) && GOALS.includes(v.primary as string) && (v.secondary === null || (GOALS.includes(v.secondary as string) && v.secondary !== v.primary)))
/** Phase de saison du profil : absente, « saison », ou « intersaison » avec un lundi AAAA-MM-JJ. */
const isTrainingPhase = (v: unknown): boolean =>
  v === undefined ||
  (isObject(v) && (v.kind === 'saison' || (v.kind === 'intersaison' && typeof v.startMonday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.startMonday))))

/** Forme minimale attendue de chaque table (en plus de id / updatedAt / deletedAt). */
const ROW_CHECKS: Record<TableName, (r: Record<string, unknown>) => boolean> = {
  profile: (r) => isNumber(r.age) && isNumber(r.position) && isString(r.sex) && isTrainingPhase(r.trainingPhase) && isGoals(r.goals),
  clubDays: (r) => isNumber(r.weekday) && isString(r.intensity),
  matches: (r) => isString(r.date),
  records: (r) => isString(r.test) && isNumber(r.value) && isString(r.date),
  wellness: (r) => isString(r.date) && isString(r.kind),
  sessionLogs: (r) => isString(r.sessionId) && isString(r.date) && Array.isArray(r.sets),
  plans: (r) => isString(r.weekStart) && isString(r.inputHash) && Array.isArray(r.days),
  injuries: (r) => isString(r.zone) && isString(r.status),
  meta: (r) => isString(r.key),
}

function validateTable(name: TableName, rows: unknown): BackupRows {
  if (!Array.isArray(rows)) throw new BackupError(`Le fichier est incomplet : la table « ${name} » est absente ou illisible.`)
  const ids = new Set<string>()
  const keys = new Set<string>()
  rows.forEach((row, i) => {
    const where = `table « ${name} », ligne ${i + 1}`
    if (!isObject(row)) throw new BackupError(`Fichier invalide (${where}) : enregistrement illisible.`)
    if (!isString(row.id)) throw new BackupError(`Fichier invalide (${where}) : identifiant manquant.`)
    if (ids.has(row.id)) throw new BackupError(`Fichier invalide (${where}) : identifiant en double.`)
    ids.add(row.id)
    if (typeof row.updatedAt !== 'string') throw new BackupError(`Fichier invalide (${where}) : date de modification manquante.`)
    if (row.deletedAt !== null && typeof row.deletedAt !== 'string') throw new BackupError(`Fichier invalide (${where}) : suppression logique illisible.`)
    if (!ROW_CHECKS[name](row)) throw new BackupError(`Fichier invalide (${where}) : champs obligatoires manquants.`)
    if (name === 'meta') {
      const key = row.key as string
      if (keys.has(key)) throw new BackupError(`Fichier invalide (${where}) : réglage en double.`)
      keys.add(key)
    }
  })
  return rows as BackupRows
}

/**
 * Valide un fichier de sauvegarde (texte JSON) entièrement, sans rien écrire, et le migre si sa version est antérieure.
 * Lève une BackupError au message clair : fichier illisible, autre appli, version future, table manquante ou ligne invalide.
 */
export function parseBackup(text: string, options: ParseOptions = {}): BackupFile {
  const current = options.currentVersion ?? SCHEMA_VERSION
  const migrations = options.migrations ?? BACKUP_MIGRATIONS
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('Ce fichier n’est pas une sauvegarde lisible (JSON invalide).')
  }
  if (!isObject(raw) || raw.app !== BACKUP_APP) throw new BackupError('Ce fichier n’est pas une sauvegarde de Prépa Rugby.')
  const version = raw.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new BackupError('Version de sauvegarde illisible.')
  }
  if (version > current) {
    throw new BackupError(`Cette sauvegarde vient d’une version plus récente de l’appli (schéma ${version}). Mets l’appli à jour avant de l’importer.`)
  }
  if (typeof raw.exportedAt !== 'string' || Number.isNaN(Date.parse(raw.exportedAt))) {
    throw new BackupError('Date de sauvegarde illisible.')
  }
  if (!isObject(raw.tables)) throw new BackupError('Le fichier est incomplet : aucune table de données.')
  const tables = {} as BackupTables
  for (const name of TABLE_NAMES) tables[name] = validateTable(name, raw.tables[name])

  let migrated = tables
  for (let v = version; v < current; v++) {
    const step = migrations[v]
    if (!step) throw new BackupError(`Sauvegarde de schéma ${version} non migrable vers ${current}.`)
    migrated = step(migrated)
  }
  return { app: BACKUP_APP, schemaVersion: current, exportedAt: raw.exportedAt, tables: migrated }
}
