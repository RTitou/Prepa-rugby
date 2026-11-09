import { db } from '../db'
import { newSyncFields, nowIso } from '../ids'
import { MIN_AGE, TRAINING_GOALS, type Profile, type ProfileInput, type TrainingGoals, type TrainingPhase } from '../../types/profile'
import { mondayOf } from '../../engine/dates'
import { activeRows, softDelete } from './base'

/** Profil actif, ou null tant que le premier lancement n'est pas terminé. */
export async function getProfile(): Promise<Profile | null> {
  const rows = await activeRows(db.profile)
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return rows[0] ?? null
}

/**
 * Change la phase de saison du profil actif (en saison, ou intersaison ATP à partir d'un lundi). La phase entre dans
 * l'empreinte des semaines : les jours à venir sont régénérés, le passé et les séances faites restent intacts.
 */
export async function setTrainingPhase(phase: TrainingPhase): Promise<void> {
  if (phase.kind === 'intersaison' && (!/^\d{4}-\d{2}-\d{2}$/.test(phase.startMonday) || mondayOf(phase.startMonday) !== phase.startMonday)) {
    throw new Error('Le départ de l’intersaison doit être un lundi.')
  }
  await db.transaction('rw', db.profile, async () => {
    const existing = await getProfile()
    if (!existing) throw new Error('Aucun profil.')
    await db.profile.put({ ...existing, trainingPhase: phase, updatedAt: nowIso() })
  })
}

/** Vérifie les objectifs : principal obligatoire, secondaire facultatif et différent du principal. */
export function assertGoals(goals: TrainingGoals): void {
  const valid = new Set(TRAINING_GOALS.map((g) => g.value))
  if (!valid.has(goals.primary)) throw new Error('Choisis ton objectif principal.')
  if (goals.secondary !== null && (!valid.has(goals.secondary) || goals.secondary === goals.primary)) {
    throw new Error('L’objectif secondaire doit être différent du principal.')
  }
}

/** Change les objectifs du profil actif ; les semaines à venir sont recalculées. */
export async function setGoals(goals: TrainingGoals): Promise<void> {
  assertGoals(goals)
  await db.transaction('rw', db.profile, async () => {
    const existing = await getProfile()
    if (!existing) throw new Error('Aucun profil.')
    await db.profile.put({ ...existing, goals, updatedAt: nowIso() })
  })
}

/** Crée le profil, ou met à jour le profil actif. Refuse un âge inférieur à 18 ans. */
export async function saveProfile(input: ProfileInput): Promise<Profile> {
  if (!Number.isInteger(input.age) || input.age < MIN_AGE) {
    throw new Error(`Âge invalide : l'application est réservée aux ${MIN_AGE} ans et plus.`)
  }
  if (input.goals) assertGoals(input.goals)
  return db.transaction('rw', db.profile, async () => {
    const existing = await getProfile()
    if (existing) {
      const updated: Profile = { ...existing, ...input, updatedAt: nowIso() }
      await db.profile.put(updated)
      return updated
    }
    const created: Profile = { ...newSyncFields(), ...input }
    await db.profile.add(created)
    return created
  })
}

export async function deleteProfile(id: string): Promise<void> {
  await softDelete(db.profile, id)
}
