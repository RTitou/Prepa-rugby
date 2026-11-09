import { ATP_RM_RATIO } from '../../reference/atp/strength'
import type { PerformanceRecord } from '../../types/records'
import type { NormProtocol } from '../../types/reference'
import { E1RM_IMPRECISE_ABOVE_REPS, EPLEY_DIVISOR, THREE_RM_TO_ONE_RM_RATIO } from '../config'

/** RC-3.4 : 1RM estimé par Epley, `charge × (1 + reps / 30)`. Une répétition = la charge elle-même. */
export function estimateOneRepMax(load: number, reps: number): number {
  if (!(load > 0) || !Number.isFinite(load)) throw new Error('Charge invalide.')
  if (!Number.isInteger(reps) || reps < 1) throw new Error('Nombre de répétitions invalide.')
  return reps === 1 ? load : load * (1 + reps / EPLEY_DIVISOR)
}

/** Au-delà de 10 répétitions, l'estimation est peu fiable. */
export function isImpreciseEstimate(reps: number): boolean {
  return reps > E1RM_IMPRECISE_ABOVE_REPS
}

/** Convertit un 1RM vers le protocole du repère (1RM, 3RM ≈ 0,91 × 1RM). null : le protocole n'est pas une charge maximale. */
export function convertOneRepMax(oneRm: number, rm: NormProtocol['rm']): number | null {
  if (rm === '1RM') return oneRm
  if (rm === '3RM') return oneRm * THREE_RM_TO_ONE_RM_RATIO
  return null
}

/** 1RM estimé d'un record de charge, null pour un temps ou un poids. */
export function recordOneRepMax(record: Pick<PerformanceRecord, 'unit' | 'value' | 'reps' | 'test'>): number | null {
  if (record.unit !== 'kg' || record.reps === null || record.test === 'poids') return null
  return estimateOneRepMax(record.value, record.reps)
}

/**
 * 1RM théorique selon les repères de la méthode ATP, base des pourcentages du bloc force :
 * 1RM tel quel, 3RM / 0,90, 5RM / 0,84. Les autres nombres de répétitions passent par Epley.
 */
export function atpOneRepMax(load: number, reps: number): number {
  const ratio = ATP_RM_RATIO[reps]
  return ratio !== undefined ? load / ratio : estimateOneRepMax(load, reps)
}
