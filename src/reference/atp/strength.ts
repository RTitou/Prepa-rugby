import type { AtpLift, WaveSet } from '../../types/plan'
import type { LiftingExperience } from '../../types/profile'

/*
 * Progression des trois mouvements de force de la méthode ATP (source `atp-beast-off-season`, tableau 3.8 de l'analyse).
 * Intersaison : même schéma la même semaine pour le squat (J1), le développé couché (J2) et le soulevé de terre (J6).
 * En saison : vague sur le cycle de 5 semaines de l'appli (4 semaines de progression puis la décharge déjà prévue).
 * Les pourcentages sont des fractions du 1RM ; le kg conseillé en découle (engine/progression/suggestedLoad.ts).
 */

export type StrengthScheme =
  /** S1 / S9 : test de 5RM, 3RM ou 1RM. */
  | { kind: 'test' }
  /** Séries fixes à un pourcentage du 1RM (5 × 5 à 80-85 %, décharge 3 × 5 à 70 %). */
  | { kind: 'sets'; sets: number; reps: number; pct: [number, number] }
  /** Vague : une entrée par série. */
  | { kind: 'wave'; waves: WaveSet[] }

export interface StrengthWeek {
  scheme: StrengthScheme
  /** Récupération entre les séries, en secondes. */
  restSec: [number, number]
  /** Consigne de la semaine, reformulée. */
  note: string
  /** RPE plafond du bloc (défaut 9). */
  rpe?: number
}

const pct = (a: number, b: number): [number, number] => [a / 100, b / 100]

const REST_HEAVY: [number, number] = [120, 180]
const REST_TOP: [number, number] = [120, 120]

/** Vague 6-4-2-4-6 (S4 : 78-82 / 80-85 %, S5 : 80-85 / 82-87 %), série de 2 au plus lourd possible. */
function wave642(outer: [number, number], inner: [number, number], full: boolean): WaveSet[] {
  const head: WaveSet[] = [
    { reps: 6, pctOneRm: outer },
    { reps: 4, pctOneRm: inner },
    { reps: 2, pctOneRm: null, toMax: true },
  ]
  return full ? [...head, { reps: 4, pctOneRm: inner }, { reps: 6, pctOneRm: outer }] : head
}

/** Vague 5-3-1-3-5 (S6) : le single est lourd mais ce n'est pas un 1RM. */
function wave531(full: boolean): WaveSet[] {
  const head: WaveSet[] = [
    { reps: 5, pctOneRm: pct(83, 86) },
    { reps: 3, pctOneRm: pct(86, 89) },
    { reps: 1, pctOneRm: null, toMax: true },
  ]
  return full ? [...head, { reps: 3, pctOneRm: pct(86, 89) }, { reps: 5, pctOneRm: pct(83, 86) }] : head
}

/** Top set de 3 au plus lourd du jour, puis séries de 3 à une fraction de ce top set (S7-8, et 4ᵉ semaine en saison). */
function topSet(backOffSets: number, backOff: [number, number]): WaveSet[] {
  return [
    { reps: 3, pctOneRm: null, toMax: true },
    ...Array.from({ length: backOffSets }, (): WaveSet => ({ reps: 3, pctOneRm: null, pctTopSet: backOff })),
  ]
}

/** Back-off du top set selon le niveau : 3 séries (6-24 mois), 4 (plus de 24 mois). */
function backOffSets(experience: LiftingExperience): number {
  return experience === 'plus-24-mois' ? 4 : 3
}

/** Schéma de force de la semaine `week` (1 à 9) de l'intersaison, pour un mouvement. */
export function offseasonStrength(week: number, lift: AtpLift, experience: LiftingExperience): StrengthWeek {
  switch (week) {
    case 1:
    case 9:
      return {
        scheme: { kind: 'test' },
        restSec: [180, 300],
        note:
          week === 1
            ? 'Test : monte progressivement, sans trop de séries proches de la charge visée. Dernière répétition difficile, amplitude complète. Un 1RM seulement avec un pareur.'
            : 'Re-test : même nombre de répétitions qu’en semaine 1, dans les mêmes conditions.',
      }
    case 2:
    case 3:
      return {
        scheme: { kind: 'sets', sets: 5, reps: 5, pct: pct(80, 85) },
        restSec: REST_HEAVY,
        note:
          week === 2
            ? 'Hypertrophie fonctionnelle : 5 × 5 lourd, amplitude complète.'
            : 'Même schéma qu’en semaine 2, avec plus de charge.',
      }
    case 4:
      return {
        scheme: { kind: 'wave', waves: wave642(pct(78, 82), pct(80, 85), true) },
        restSec: REST_HEAVY,
        note: 'Le travail de force commence : vague 6-4-2-4-6. La série de 2 se fait au plus lourd possible, avec un pareur.',
      }
    case 5:
      return {
        scheme: { kind: 'wave', waves: wave642(pct(80, 85), pct(82, 87), true) },
        restSec: REST_HEAVY,
        note: 'Vague 6-4-2-4-6 un cran plus lourde que la semaine 4.',
      }
    case 6:
      return {
        scheme: { kind: 'wave', waves: wave531(true) },
        restSec: REST_HEAVY,
        note: 'Vague lourde 5-3-1-3-5 : le single est lourd mais ce n’est pas un 1RM, ne t’emballe pas.',
      }
    case 7:
    case 8: {
      const backOff = week === 8 && lift === 'developpe-couche' ? pct(89, 92) : pct(87, 92)
      return {
        scheme: { kind: 'wave', waves: topSet(backOffSets(experience), backOff) },
        restSec: REST_TOP,
        note: `Monte jusqu’à ton 3RM du jour, puis séries de 3 à ${Math.round(backOff[0] * 100)}-${Math.round(backOff[1] * 100)} % de cette charge : qualité du geste et intention de vitesse.`,
      }
    }
    default:
      throw new Error(`Semaine du programme invalide : ${week}`)
  }
}

/** Semaine de la vague en saison (1 à 4) ; la 5ᵉ semaine du cycle est la décharge de l'appli. */
export type SeasonWaveWeek = 1 | 2 | 3 | 4 | 'decharge'

/**
 * Schéma de force en saison : 3 à 4 séries au lieu de 5 (cumul avec le club et les matchs).
 * 1 : 4 × 5 à 78-82 % ; 2 : vague 6-4-2 ; 3 : vague 5-3-1 ; 4 : top set de 3 + back-off à 87-92 % ; décharge : 3 × 5 à 70 %.
 */
export function seasonStrength(wave: SeasonWaveWeek, experience: LiftingExperience): StrengthWeek {
  switch (wave) {
    case 1:
      return { scheme: { kind: 'sets', sets: 4, reps: 5, pct: pct(78, 82) }, restSec: REST_HEAVY, rpe: 8, note: 'Semaine 1 de la vague : 4 × 5 propre et lourd.' }
    case 2:
      return {
        scheme: { kind: 'wave', waves: wave642(pct(78, 82), pct(80, 85), false) },
        restSec: REST_HEAVY,
        note: 'Semaine 2 de la vague : 6-4-2, la série de 2 au plus lourd possible.',
      }
    case 3:
      return { scheme: { kind: 'wave', waves: wave531(false) }, restSec: REST_HEAVY, note: 'Semaine 3 de la vague : 5-3-1, single lourd mais pas un 1RM.' }
    case 4:
      return {
        scheme: { kind: 'wave', waves: topSet(experience === 'plus-24-mois' ? 3 : 2, pct(87, 92)) },
        restSec: REST_TOP,
        note: 'Semaine 4 de la vague : top set de 3, puis séries de 3 à 87-92 % de cette charge.',
      }
    case 'decharge':
      return { scheme: { kind: 'sets', sets: 3, reps: 5, pct: pct(70, 70) }, restSec: REST_HEAVY, rpe: 7, note: 'Décharge : 3 × 5 à 70 %, vitesse et technique.' }
  }
}

/** Libellés des trois mouvements de force et exercice de bibliothèque correspondant. */
export const ATP_LIFTS: Record<AtpLift, { exerciseId: string; label: string }> = {
  squat: { exerciseId: 'back-squat', label: 'Back squat' },
  'developpe-couche': { exerciseId: 'bench-press', label: 'Développé couché' },
  'souleve-de-terre': { exerciseId: 'deadlift', label: 'Soulevé de terre' },
}

/** Repères ATP de conversion vers le 1RM : 3RM ≈ 90 % du 1RM, 5RM ≈ 84 % (83-85 %). */
export const ATP_RM_RATIO: Readonly<Record<number, number>> = { 1: 1, 3: 0.9, 5: 0.84 }
