import { db } from '../db'
import { newSyncFields, nowIso, todayLocal } from '../ids'
import { SEVERE_SIGNS } from '../../reference/substitutions/table'
import type { Injury, InjuryInput } from '../../types/injury'
import { BODY_ZONES } from '../../types/reference'
import { activeRows, softDelete } from './base'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const COMMENT_MAX = 500

function assertInput(input: InjuryInput): void {
  if (!BODY_ZONES.some((z) => z.value === input.zone)) throw new Error('Zone de blessure invalide.')
  if (!DATE_RE.test(input.declaredOn)) throw new Error('Date invalide (format AAAA-MM-JJ attendu).')
  for (const sign of input.severeSigns) {
    if (!SEVERE_SIGNS.some((s) => s.id === sign)) throw new Error('Signe grave inconnu.')
  }
  if ((input.comment ?? '').length > COMMENT_MAX) throw new Error(`Commentaire trop long (${COMMENT_MAX} caractères au plus).`)
}

/** Blessures non supprimées, actives d'abord puis les plus récentes. */
export async function listInjuries(): Promise<Injury[]> {
  const rows = await activeRows(db.injuries)
  return rows.sort(
    (a, b) =>
      Number(b.status === 'active') - Number(a.status === 'active') ||
      b.declaredOn.localeCompare(a.declaredOn) ||
      b.updatedAt.localeCompare(a.updatedAt),
  )
}

export async function listActiveInjuries(): Promise<Injury[]> {
  return (await listInjuries()).filter((i) => i.status === 'active')
}

/**
 * Déclare une blessure. Si la zone a déjà une blessure active, elle est mise à jour (signes graves cumulés) au lieu
 * d'ajouter un doublon.
 */
export async function declareInjury(input: InjuryInput): Promise<Injury> {
  assertInput(input)
  const comment = (input.comment ?? '').trim()
  const signs = [...new Set(input.severeSigns)].sort()
  return db.transaction('rw', db.injuries, async () => {
    const existing = (await db.injuries.where('zone').equals(input.zone).toArray()).find(
      (i) => i.deletedAt === null && i.status === 'active',
    )
    if (existing) {
      const merged: Injury = {
        ...existing,
        severeSigns: [...new Set([...existing.severeSigns, ...signs])].sort(),
        comment: comment !== '' ? comment : existing.comment,
        updatedAt: nowIso(),
      }
      await db.injuries.put(merged)
      return merged
    }
    const created: Injury = {
      ...newSyncFields(),
      zone: input.zone,
      status: 'active',
      declaredOn: input.declaredOn,
      healedOn: null,
      severeSigns: signs,
      comment,
    }
    await db.injuries.add(created)
    return created
  })
}

/** Déclare la blessure guérie : seul retour au programme normal (et levée d'une suspension). */
export async function healInjury(id: string, healedOn: string = todayLocal()): Promise<void> {
  if (!DATE_RE.test(healedOn)) throw new Error('Date invalide (format AAAA-MM-JJ attendu).')
  const current = await db.injuries.get(id)
  if (!current || current.deletedAt !== null) throw new Error('Blessure introuvable.')
  await db.injuries.update(id, { status: 'guerie', healedOn, updatedAt: nowIso() })
}

/** Suppression logique (saisie erronée). */
export async function removeInjury(id: string): Promise<void> {
  await softDelete(db.injuries, id)
}
