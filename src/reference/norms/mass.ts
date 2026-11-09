import type { Line, PlayLevel, Sex } from '../../types/profile'
import type { NormAgeGroup } from '../../types/reference'
import { LEVEL_MAPPING } from './men'

/*
 * Repères de masse corporelle par ligne (tableau 3.5 de la veille, hommes). Ils servent à repérer une masse
 * insuffisante pour le poste (RC-5.5). Même rattachement des niveaux que les autres repères (voir men.ts) ;
 * les niveaux amateurs sont donc des estimations. Aucun repère pour les joueuses.
 * Fichier ajouté à part : les valeurs des autres référentiels ne sont pas modifiées.
 */
export interface MassNorm {
  sex: Sex
  line: Line
  level: PlayLevel
  ageGroup: NormAgeGroup
  mean: number
  sd: number
  sourceId: string
  toVerify: boolean
  estimate: boolean
}

const MASS_BY_COHORT: Record<NormAgeGroup, Record<Line, { mean: number; sd: number }> & { sourceId: string; toVerify: boolean }> = {
  u18: { avants: { mean: 94, sd: 7 }, arrieres: { mean: 79, sd: 7 }, sourceId: 'darrall-jones-2016', toVerify: true },
  'u20-21': { avants: { mean: 105, sd: 9 }, arrieres: { mean: 88, sd: 11 }, sourceId: 'darrall-jones-2016', toVerify: true },
  'senior-pro': { avants: { mean: 116, sd: 10 }, arrieres: { mean: 96, sd: 9 }, sourceId: 'posthumus-2020', toVerify: false },
}

export function getMassNorm(query: { sex: Sex; line: Line; level: PlayLevel }): MassNorm | undefined {
  if (query.sex !== 'homme') return undefined
  const mapping = LEVEL_MAPPING[query.level]
  if (!mapping) return undefined
  const cohort = MASS_BY_COHORT[mapping.ageGroup]
  return {
    sex: query.sex,
    line: query.line,
    level: query.level,
    ageGroup: mapping.ageGroup,
    mean: cohort[query.line].mean,
    sd: cohort[query.line].sd,
    sourceId: cohort.sourceId,
    toVerify: cohort.toVerify,
    estimate: mapping.estimate,
  }
}
