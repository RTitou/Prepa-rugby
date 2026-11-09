import { BACKUP_REMINDER_DAYS } from '../../engine/config'
import { addDays, diffDays } from '../../engine/dates'
import { todayLocal } from '../ids'
import { getMeta, setMeta } from '../repositories/metaRepo'

export const LAST_BACKUP_KEY = 'lastBackupAt'
export const FIRST_LAUNCH_KEY = 'firstLaunchOn'
export const REMINDER_DISMISSED_KEY = 'backupReminderHiddenUntil'

/** Date locale (AAAA-MM-JJ) d'un horodatage ISO. */
export function localDateOf(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export interface ReminderInput {
  today: string
  /** ISO de la dernière sauvegarde, ou undefined si jamais. */
  lastBackupAt: string | undefined
  /** Date du premier lancement, ou undefined si inconnue. */
  firstLaunchOn: string | undefined
  /** Le bandeau est masqué jusqu'à cette date (exclue : il revient ce jour-là). */
  hiddenUntil: string | undefined
}

/**
 * Le bandeau est-il à afficher ? Règles :
 * - masqué par l'utilisateur jusqu'au lendemain (`hiddenUntil` = lendemain du clic, il revient à cette date) ;
 * - jamais sauvegardé : masqué le jour même du premier lancement (inutile d'agresser un nouvel utilisateur), affiché dès le lendemain ;
 * - sinon affiché quand la dernière sauvegarde date de PLUS de BACKUP_REMINDER_DAYS jours (15 j oui, 14 j non).
 */
export function isBackupReminderDue(input: ReminderInput): boolean {
  const { today, lastBackupAt, firstLaunchOn, hiddenUntil } = input
  if (hiddenUntil !== undefined && today < hiddenUntil) return false
  if (lastBackupAt === undefined) return firstLaunchOn !== undefined && today > firstLaunchOn
  return diffDays(localDateOf(lastBackupAt), today) > BACKUP_REMINDER_DAYS
}

/** Mémorise le premier lancement (une seule fois, à l'ouverture de l'accueil avec un profil). */
export async function ensureFirstLaunch(today: string = todayLocal()): Promise<void> {
  if ((await getMeta<string>(FIRST_LAUNCH_KEY)) === undefined) await setMeta(FIRST_LAUNCH_KEY, today)
}

/** Masque le bandeau jusqu'au lendemain. */
export async function dismissBackupReminder(today: string = todayLocal()): Promise<void> {
  await setMeta(REMINDER_DISMISSED_KEY, addDays(today, 1))
}

export async function loadReminderInput(today: string = todayLocal()): Promise<ReminderInput> {
  const [lastBackupAt, firstLaunchOn, hiddenUntil] = await Promise.all([
    getMeta<string>(LAST_BACKUP_KEY),
    getMeta<string>(FIRST_LAUNCH_KEY),
    getMeta<string>(REMINDER_DISMISSED_KEY),
  ])
  return { today, lastBackupAt, firstLaunchOn, hiddenUntil }
}
