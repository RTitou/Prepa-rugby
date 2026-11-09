import type { Line, PlayLevel, Sex } from '../../types/profile'
import type { RecordTest } from '../../types/records'
import type { Norm } from '../../types/reference'
import { MEN_NORMS } from './men'
import { WOMEN_NORMS } from './women'

export { levelAbove, LEVEL_ORDER } from './levels'
export { LEVEL_MAPPING, NORM_PROTOCOLS } from './men'

export const ALL_NORMS: readonly Norm[] = [...MEN_NORMS, ...WOMEN_NORMS]

export interface NormQuery {
  sex: Sex
  line: Line
  level: PlayLevel
  test: RecordTest
  /** Identifiant de protocole (ex. « back-squat-1rm-abs ») pour choisir parmi plusieurs repères. */
  protocolId?: string
}

/** Tous les repères disponibles pour la requête (plusieurs protocoles possibles pour un même test). */
export function getNorms(query: NormQuery): Norm[] {
  return ALL_NORMS.filter(
    (n) =>
      n.sex === query.sex &&
      n.line === query.line &&
      n.level === query.level &&
      n.test === query.test &&
      (query.protocolId === undefined || n.protocol.id === query.protocolId),
  )
}

/**
 * Repère le plus documenté pour le test, ou undefined s'il n'y en a pas
 * (joueuses, Bronco, niveaux amateurs sans rattachement).
 */
export function getNorm(query: NormQuery): Norm | undefined {
  return getNorms(query)[0]
}
