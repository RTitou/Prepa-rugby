import { getNorms, levelAbove } from '../../reference/norms'
import { getMassNorm } from '../../reference/norms/mass'
import { getSource } from '../../reference/sources'
import type { Line, PlayLevel, Sex } from '../../types/profile'
import { getRecordTest, recordExerciseId, type PerformanceRecord, type RecordTest } from '../../types/records'
import type { Norm, Source } from '../../types/reference'
import { COMPARE_PERCENT_THRESHOLD, COMPARE_Z_THRESHOLD } from '../config'
import { convertOneRepMax, estimateOneRepMax } from '../progression/oneRepMax'

export type CompareStatus = 'en-dessous' | 'dans-la-norme' | 'au-dessus'
export type CompareMethod = 'z' | 'percent'

/** Pourquoi aucune comparaison n'est faite : seule la progression personnelle est suivie. */
export type NoComparisonReason = 'joueuse' | 'bronco' | 'poids' | 'pas-de-repere' | 'protocole-incompatible'

export interface UnavailableComparison {
  available: false
  test: RecordTest
  reason: NoComparisonReason
  message: string
}

export interface AvailableComparison {
  available: true
  test: RecordTest
  status: CompareStatus
  method: CompareMethod
  /** Écart en écarts-types, signe « mieux = positif » (inversé pour les temps) ; null si l'écart-type est inconnu. */
  z: number | null
  /** Écart en % de la moyenne, signe « mieux = positif ». */
  deltaPct: number
  /** Valeur du joueur exprimée dans l'unité et le protocole du repère. */
  value: number
  norm: Norm
  /** Niveau du repère utilisé (le niveau au-dessus, ou le sien au plus haut niveau). */
  targetLevel: PlayLevel
  /** Repère de fédérale utilisé faute de repère plus bas (loisir). */
  fallbackLevel: boolean
  source: Source | undefined
  /** Repère rattaché par proximité (pas une donnée publiée pour ce niveau). */
  estimate: boolean
  /** Valeur à revérifier sur la publication originale. */
  toVerify: boolean
}

export type Comparison = AvailableComparison | UnavailableComparison

export const NO_COMPARISON_MESSAGES: Record<NoComparisonReason, string> = {
  joueuse: 'Repères à venir pour les joueuses : seule ta progression personnelle est suivie.',
  bronco: 'Pas de repère pour le Bronco : seule ta progression personnelle est suivie.',
  poids: 'Poids de corps : suivi sans comparaison.',
  'pas-de-repere': 'Pas de repère pour ton niveau : seule ta progression personnelle est suivie.',
  'protocole-incompatible': 'Pas de repère pour ce protocole.',
}

function unavailable(test: RecordTest, reason: NoComparisonReason): UnavailableComparison {
  return { available: false, test, reason, message: NO_COMPARISON_MESSAGES[reason] }
}

export interface PlayerContext {
  sex: Sex
  line: Line
  level: PlayLevel
}

/**
 * Niveau du repère : le niveau au-dessus ; au plus haut niveau, le sien (levelAbove). Loisir : le niveau au-dessus (régional)
 * n'a pas de repère, on prend la fédérale (estimation) quand elle en a un.
 */
function targetLevels(level: PlayLevel): { level: PlayLevel; fallback: boolean }[] {
  const above = levelAbove(level)
  return level === 'loisir' ? [{ level: above, fallback: false }, { level: 'federale', fallback: true }] : [{ level: above, fallback: false }]
}

/** Statut d'après le z-score, ou l'écart en % de la moyenne quand l'écart-type est inconnu. */
export function classify(
  value: number,
  mean: number,
  sd: number | undefined,
  lowerIsBetter: boolean,
): { status: CompareStatus; method: CompareMethod; z: number | null; deltaPct: number } {
  const sign = lowerIsBetter ? -1 : 1
  const deltaPct = (sign * (value - mean) * 100) / mean
  if (sd !== undefined && sd > 0) {
    const z = (sign * (value - mean)) / sd
    return { status: z <= -COMPARE_Z_THRESHOLD ? 'en-dessous' : z >= COMPARE_Z_THRESHOLD ? 'au-dessus' : 'dans-la-norme', method: 'z', z, deltaPct }
  }
  return {
    status: deltaPct <= -COMPARE_PERCENT_THRESHOLD ? 'en-dessous' : deltaPct >= COMPARE_PERCENT_THRESHOLD ? 'au-dessus' : 'dans-la-norme',
    method: 'percent',
    z: null,
    deltaPct,
  }
}

/**
 * Compare un record au repère du niveau au-dessus (RC-3.1 à 3.4, 3.6). Force : 1RM estimé (Epley), converti vers le protocole
 * du repère (1RM ou 3RM) et rapporté au poids de corps quand le repère est relatif. Seuls les protocoles de même exercice
 * sont comparés (un front squat n'est pas un back squat). Fonction pure.
 */
export function compareRecord(player: PlayerContext, record: PerformanceRecord, bodyweightKg: number): Comparison {
  const test = record.test
  if (player.sex === 'femme') return unavailable(test, 'joueuse')
  if (test === 'bronco') return unavailable(test, 'bronco')
  if (test === 'poids') return unavailable(test, 'poids')

  let norms: Norm[] = []
  let target: { level: PlayLevel; fallback: boolean } | undefined
  for (const t of targetLevels(player.level)) {
    norms = getNorms({ sex: player.sex, line: player.line, level: t.level, test })
    if (norms.length > 0) {
      target = t
      break
    }
  }
  if (!target) return unavailable(test, 'pas-de-repere')

  const exerciseId = recordExerciseId(record)
  const compatible = norms
    .filter((n) => n.protocol.exerciseId === exerciseId)
    // Force rapportée au poids de corps d'abord (RC-3.3), puis charge absolue.
    .sort((a, b) => Number(b.protocol.relativeToBodyweight) - Number(a.protocol.relativeToBodyweight))
  const norm = compatible[0]
  if (!norm) return unavailable(test, 'protocole-incompatible')

  const def = getRecordTest(test)
  let value: number
  if (def.kind === 'time') {
    value = record.value
  } else {
    if (record.reps === null) return unavailable(test, 'protocole-incompatible')
    const converted = convertOneRepMax(estimateOneRepMax(record.value, record.reps), norm.protocol.rm)
    if (converted === null) return unavailable(test, 'protocole-incompatible')
    if (norm.protocol.relativeToBodyweight && !(bodyweightKg > 0)) return unavailable(test, 'pas-de-repere')
    value = norm.protocol.relativeToBodyweight ? converted / bodyweightKg : converted
  }

  const result = classify(value, norm.mean, norm.sd, def.kind === 'time')
  return {
    available: true,
    test,
    ...result,
    value,
    norm,
    targetLevel: target.level,
    fallbackLevel: target.fallback,
    source: getSource(norm.sourceId),
    estimate: norm.estimate,
    toVerify: norm.toVerify,
  }
}

export interface MassComparison {
  status: CompareStatus
  method: 'z'
  z: number
  deltaPct: number
  meanKg: number
  targetLevel: PlayLevel
  sourceId: string
  estimate: boolean
  toVerify: boolean
}

/** Masse du joueur vs repère de masse de sa ligne au niveau au-dessus (RC-5.5). undefined : pas de repère (joueuses, régional…). */
export function compareMass(player: PlayerContext, weightKg: number): MassComparison | undefined {
  if (player.sex === 'femme') return undefined
  for (const t of targetLevels(player.level)) {
    const norm = getMassNorm({ sex: player.sex, line: player.line, level: t.level })
    if (!norm) continue
    const r = classify(weightKg, norm.mean, norm.sd, false)
    return {
      status: r.status,
      method: 'z',
      z: r.z ?? 0,
      deltaPct: r.deltaPct,
      meanKg: norm.mean,
      targetLevel: t.level,
      sourceId: norm.sourceId,
      estimate: norm.estimate,
      toVerify: norm.toVerify,
    }
  }
  return undefined
}
