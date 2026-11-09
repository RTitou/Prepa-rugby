import { PLAY_LEVELS } from '../../types/profile'
import { getRecordTest, type RecordTest } from '../../types/records'
import type { Orientation } from '../context'
import { MASS_GAIN_PCT_THRESHOLD, SPRINT_10M_SLOWER_S_THRESHOLD } from '../config'
import type { AvailableComparison, Comparison, MassComparison } from './compare'

const STRENGTH_TESTS: readonly RecordTest[] = ['squat', 'developpe-couche']

export interface OrientInput {
  comparisons: readonly Comparison[]
  /** Masse vs repère de la ligne au niveau au-dessus ; undefined sans repère. */
  mass: MassComparison | undefined
  /** Variation de la masse sur la fenêtre de 6 semaines (%), null sans deux pesées. */
  massGainPct: number | null
  /** Variation du 10 m sur la fenêtre (s, positif = plus lent), null sans deux mesures. */
  sprint10Delta: number | null
}

const fr = (n: number, digits: number): string => n.toFixed(digits).replace('.', ',')
const levelLabel = (c: { targetLevel: string }): string => PLAY_LEVELS.find((l) => l.value === c.targetLevel)?.label ?? c.targetLevel

function gap(c: AvailableComparison): string {
  return c.z !== null ? `${fr(c.z, 1)} écart-type` : `${fr(c.deltaPct, 0)} %`
}

function estimateNote(c: { estimate: boolean }): string {
  return c.estimate ? ' (repère estimé)' : ''
}

/**
 * Orientation des séances d'après les records (RC-5.5, protection RC-3.5). Fonction pure : une seule orientation principale,
 * dans cet ordre de priorité :
 *  1. RC-3.5 : masse +2 % en 6 semaines et 10 m plus lent de plus de 0,03 s -> « vitesse », sans conclure à une faiblesse de force ;
 *  2. force relative faible (un test de force en dessous du repère) -> « force » ;
 *  3. force correcte (au moins un test de force comparé, aucun en dessous) mais 10 m en dessous du repère -> « puissance-vitesse » ;
 *  4. masse faible pour le poste (en dessous du repère de masse de la ligne) -> « hypertrophie ».
 * Sans comparaison possible (joueuses, Bronco, pas de repère), aucune orientation : la progression personnelle seule.
 */
export function orient(input: OrientInput): Orientation | null {
  const { comparisons, mass, massGainPct, sprint10Delta } = input
  const available = comparisons.filter((c): c is AvailableComparison => c.available)

  if (
    massGainPct !== null &&
    sprint10Delta !== null &&
    massGainPct > MASS_GAIN_PCT_THRESHOLD &&
    sprint10Delta > SPRINT_10M_SLOWER_S_THRESHOLD
  ) {
    return {
      focus: 'vitesse',
      weakness: 'vitesse',
      reason: `Ta masse a pris ${fr(massGainPct, 1)} % en 6 semaines et ton 10 m s’est allongé de ${fr(sprint10Delta, 2)} s : plus de vitesse dans tes séances, sans conclure à un manque de force.`,
    }
  }

  const strength = available.filter((c) => STRENGTH_TESTS.includes(c.test))
  const weakStrength = strength.filter((c) => c.status === 'en-dessous').sort((a, b) => a.deltaPct - b.deltaPct)[0]
  if (weakStrength) {
    return {
      focus: 'force',
      weakness: 'force relative',
      reason: `Point faible : force relative (${getRecordTest(weakStrength.test).label} ${gap(weakStrength)} sous le repère ${levelLabel(weakStrength)}${estimateNote(weakStrength)}). Bloc force : une série de plus sur les exercices principaux.`,
    }
  }

  const slowSprint = available.find((c) => c.test === 'sprint-10m' && c.status === 'en-dessous')
  if (slowSprint && strength.length > 0) {
    return {
      focus: 'puissance-vitesse',
      weakness: 'vitesse',
      reason: `Point faible : vitesse (10 m ${gap(slowSprint)} sous le repère ${levelLabel(slowSprint)}${estimateNote(slowSprint)}) alors que ta force est correcte. Bloc puissance et vitesse : plus de sprints et de puissance.`,
    }
  }

  if (mass && mass.status === 'en-dessous') {
    return {
      focus: 'hypertrophie',
      weakness: 'masse',
      reason: `Point faible : masse corporelle (${fr(mass.z, 1)} écart-type sous le repère de ta ligne, niveau ${levelLabel(mass)}${estimateNote(mass)}). Bloc hypertrophie : 3-4 séries de 8 à 12 répétitions, avec un apport énergétique suffisant.`,
    }
  }
  return null
}
