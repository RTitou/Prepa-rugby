import type { AtpLift, BlockKind, BlockLetter, PrescriptionUnit } from '../../types/plan'
import type { Line, Sex } from '../../types/profile'
import type { RecordTest } from '../../types/records'

/** Les 7 jours de la semaine type ATP (lundi → dimanche). */
export type AtpDay = 'lower' | 'upper' | 'conditioning' | 'accessoire' | 'terrain' | 'full' | 'recup'

/** Un exercice d'un bloc ATP. Les répétitions sont par côté quand `perSide` est vrai. */
export interface AtpItem {
  id: string
  sets: number
  reps: number
  repsMax?: number
  /** Défaut : répétitions. */
  unit?: PrescriptionUnit
  perSide?: boolean
  /** RPE cible ; défaut selon le bloc (null pour l'échauffement). */
  rpe?: number | null
  note?: string
  /** Réservé aux avants ou aux arrières. */
  line?: Line
  /** Réservé à certaines semaines (1 à 9) à l'intérieur du bloc de 3 semaines. */
  weeks?: readonly number[]
  /** Postes 1 à 5 (piliers, talonneur, 2es lignes) : séries réduites. */
  setsTight5?: number
  /** Note propre à l'homme ou à la femme (charges des finishers). */
  noteBySex?: Partial<Record<Sex, string>>
}

export interface AtpBlockDef {
  letter: BlockLetter
  kind: BlockKind
  title: string
  restSec?: [number, number]
  /** Bloc facultatif (finisher, « si tu as le temps »). */
  optional?: boolean
  items: AtpItem[]
  /** Bloc C : mouvement de force dont le schéma vient de strength.ts. */
  strengthLift?: AtpLift
  /** Tests passés dans le bloc (S1, S9). */
  tests?: RecordTest[]
}
