import type { Line, PlayLevel } from '../../types/profile'
import type { RecordTest } from '../../types/records'
import type { EvidenceLevel, Norm, NormAgeGroup, NormProtocol, NormUnit } from '../../types/reference'

/*
 * Repères hommes, issus du tableau 3.5 et des §3.1, §3.2, §3.4 de la veille.
 *
 * MAPPING DES NIVEAUX DE L'APPLICATION VERS LES COHORTES PUBLIÉES
 * - espoirs / centre de formation : cohorte U20-U21 d'académie (Darrall-Jones 2015/2016, Owen 2020).
 *   Les valeurs U18 d'académie ne sont pas exposées au niveau « espoirs » : elles servent de repère
 *   bas pour la Fédérale (voir plus bas).
 * - professionnel : seniors pros du Super Rugby (Posthumus 2020).
 * - niveaux amateurs : AUCUNE donnée publiée dans la veille. Choix retenu, tous marqués `estimate: true` :
 *     nationale -> cohorte U20-U21 (le plus proche du haut de l'amateur ; même valeurs que « espoirs »),
 *     federale  -> cohorte U18 (repère bas),
 *     regional et loisir -> AUCUN repère (écart trop incertain) : la progression personnelle seule s'applique.
 *   Ce rattachement est une approximation de conception, jamais une donnée de la veille.
 * - Femmes : aucun repère (women.ts). Bronco : aucun repère exposé (aucune norme jeune ; plan phase 3).
 *
 * Les valeurs de Darrall-Jones 2015/2016 et Read 2018 sont marquées `toVerify` : tableaux reconstitués
 * à partir de PDF mal mis en page (veille §12.9). Ce ne sont pas des percentiles (veille §3.5).
 * Les rapports « relatifs au poids de corps » des seniors pros et du back squat U20-U21 sont ceux de la
 * veille (calculés à partir des moyennes de groupe), donc sans écart-type.
 */

export const NORM_PROTOCOLS = {
  'front-squat-3rm-rel': {
    id: 'front-squat-3rm-rel',
    exerciseId: 'front-squat',
    rm: '3RM',
    relativeToBodyweight: true,
    description: 'Front squat 3RM, rapporté au poids de corps (kg/kg). Un front squat n’est pas un back squat.',
  },
  'back-squat-1rm-rel': {
    id: 'back-squat-1rm-rel',
    exerciseId: 'back-squat',
    rm: '1RM',
    relativeToBodyweight: true,
    description: 'Back squat 1RM, rapporté au poids de corps (kg/kg), rapport calculé à partir des moyennes de groupe.',
  },
  'back-squat-1rm-abs': {
    id: 'back-squat-1rm-abs',
    exerciseId: 'back-squat',
    rm: '1RM',
    relativeToBodyweight: false,
    description: 'Back squat 1RM, charge absolue (kg).',
  },
  'bench-3rm-rel': {
    id: 'bench-3rm-rel',
    exerciseId: 'bench-press',
    rm: '3RM',
    relativeToBodyweight: true,
    description: 'Développé couché 3RM, rapporté au poids de corps (kg/kg), ensemble des joueurs de la cohorte.',
  },
  'bench-1rm-rel': {
    id: 'bench-1rm-rel',
    exerciseId: 'bench-press',
    rm: '1RM',
    relativeToBodyweight: true,
    description: 'Développé couché 1RM, rapporté au poids de corps (kg/kg), rapport calculé à partir des moyennes de groupe.',
  },
  'bench-1rm-abs': {
    id: 'bench-1rm-abs',
    exerciseId: 'bench-press',
    rm: '1RM',
    relativeToBodyweight: false,
    description: 'Développé couché 1RM, charge absolue (kg).',
  },
  'sprint-photocells': {
    id: 'sprint-photocells',
    exerciseId: null,
    rm: null,
    relativeToBodyweight: false,
    description: 'Sprint, départ arrêté, cellules photoélectriques (temps en secondes, plus bas = mieux).',
  },
  'sprint-pro': {
    id: 'sprint-pro',
    exerciseId: null,
    rm: null,
    relativeToBodyweight: false,
    description: 'Sprint, départ arrêté (temps en secondes). Détail du matériel de mesure non précisé dans la veille.',
  },
} as const satisfies Record<string, NormProtocol>

type ProtocolId = keyof typeof NORM_PROTOCOLS

/** Valeur brute d'une cohorte, avant rattachement à un niveau de l'application. */
interface CohortValue {
  ageGroup: NormAgeGroup
  line: Line | 'both'
  test: RecordTest
  protocol: ProtocolId
  unit: NormUnit
  mean: number
  sd?: number
  sourceId: string
  evidence: EvidenceLevel
  toVerify: boolean
  note?: string
}

const DJ15 = 'darrall-jones-2015'
const DJ16 = 'darrall-jones-2016'

/** L'ordre compte : pour un même test, le premier repère est celui que `getNorm` renvoie par défaut. */
const COHORT_VALUES: readonly CohortValue[] = [
  // --- U18 d'académie ---
  { ageGroup: 'u18', line: 'both', test: 'squat', protocol: 'front-squat-3rm-rel', unit: 'kg/kg', mean: 1.04, sd: 0.17, sourceId: DJ15, evidence: 'B', toVerify: true, note: 'Ensemble des joueurs U18 (avants et arrières confondus).' },
  { ageGroup: 'u18', line: 'both', test: 'developpe-couche', protocol: 'bench-3rm-rel', unit: 'kg/kg', mean: 0.95, sd: 0.11, sourceId: DJ15, evidence: 'B', toVerify: true, note: 'Ensemble des joueurs U18 (avants et arrières confondus).' },
  { ageGroup: 'u18', line: 'avants', test: 'sprint-10m', protocol: 'sprint-photocells', unit: 's', mean: 1.84, sd: 0.06, sourceId: DJ16, evidence: 'B', toVerify: true },
  { ageGroup: 'u18', line: 'arrieres', test: 'sprint-10m', protocol: 'sprint-photocells', unit: 's', mean: 1.79, sd: 0.06, sourceId: DJ16, evidence: 'B', toVerify: true },
  { ageGroup: 'u18', line: 'avants', test: 'sprint-40m', protocol: 'sprint-photocells', unit: 's', mean: 5.63, sd: 0.21, sourceId: DJ16, evidence: 'B', toVerify: true },
  { ageGroup: 'u18', line: 'arrieres', test: 'sprint-40m', protocol: 'sprint-photocells', unit: 's', mean: 5.34, sd: 0.17, sourceId: DJ16, evidence: 'B', toVerify: true },

  // --- U20-U21 d'académie ---
  { ageGroup: 'u20-21', line: 'avants', test: 'squat', protocol: 'back-squat-1rm-rel', unit: 'kg/kg', mean: 1.4, sourceId: 'owen-2020', evidence: 'B', toVerify: false, note: 'Rapport approximatif donné par la veille (tableau 3.5), sans écart-type.' },
  { ageGroup: 'u20-21', line: 'arrieres', test: 'squat', protocol: 'back-squat-1rm-rel', unit: 'kg/kg', mean: 1.5, sourceId: 'owen-2020', evidence: 'B', toVerify: false, note: 'Rapport approximatif donné par la veille (tableau 3.5), sans écart-type.' },
  { ageGroup: 'u20-21', line: 'avants', test: 'squat', protocol: 'back-squat-1rm-abs', unit: 'kg', mean: 147.6, sd: 21.6, sourceId: 'owen-2020', evidence: 'B', toVerify: false, note: 'U20, revue systématique.' },
  { ageGroup: 'u20-21', line: 'arrieres', test: 'squat', protocol: 'back-squat-1rm-abs', unit: 'kg', mean: 130.0, sd: 35.2, sourceId: 'owen-2020', evidence: 'B', toVerify: false, note: 'U20, revue systématique ; écart-type large.' },
  { ageGroup: 'u20-21', line: 'both', test: 'squat', protocol: 'front-squat-3rm-rel', unit: 'kg/kg', mean: 1.24, sd: 0.06, sourceId: DJ15, evidence: 'B', toVerify: true, note: 'Ensemble des joueurs U21 (avants et arrières confondus).' },
  { ageGroup: 'u20-21', line: 'both', test: 'developpe-couche', protocol: 'bench-3rm-rel', unit: 'kg/kg', mean: 1.11, sd: 0.15, sourceId: DJ15, evidence: 'B', toVerify: true, note: 'Ensemble des joueurs U21 (avants et arrières confondus).' },
  { ageGroup: 'u20-21', line: 'avants', test: 'sprint-10m', protocol: 'sprint-photocells', unit: 's', mean: 1.82, sd: 0.1, sourceId: DJ16, evidence: 'B', toVerify: true },
  { ageGroup: 'u20-21', line: 'arrieres', test: 'sprint-10m', protocol: 'sprint-photocells', unit: 's', mean: 1.76, sd: 0.12, sourceId: DJ16, evidence: 'B', toVerify: true },
  { ageGroup: 'u20-21', line: 'avants', test: 'sprint-40m', protocol: 'sprint-photocells', unit: 's', mean: 5.52, sd: 0.17, sourceId: DJ16, evidence: 'B', toVerify: true },
  { ageGroup: 'u20-21', line: 'arrieres', test: 'sprint-40m', protocol: 'sprint-photocells', unit: 's', mean: 5.32, sd: 0.22, sourceId: DJ16, evidence: 'B', toVerify: true },

  // --- Seniors professionnels (Super Rugby, Posthumus 2020) ---
  { ageGroup: 'senior-pro', line: 'avants', test: 'squat', protocol: 'back-squat-1rm-rel', unit: 'kg/kg', mean: 1.7, sourceId: 'posthumus-2020', evidence: 'B', toVerify: true, note: 'Rapport recalculé par la veille (197/116) ; la méthode source mentionne un 6RM, le 1RM est probablement estimé.' },
  { ageGroup: 'senior-pro', line: 'arrieres', test: 'squat', protocol: 'back-squat-1rm-rel', unit: 'kg/kg', mean: 1.85, sourceId: 'posthumus-2020', evidence: 'B', toVerify: true, note: 'Rapport recalculé par la veille (178/96) ; la méthode source mentionne un 6RM, le 1RM est probablement estimé.' },
  { ageGroup: 'senior-pro', line: 'avants', test: 'squat', protocol: 'back-squat-1rm-abs', unit: 'kg', mean: 197.2, sd: 26.5, sourceId: 'posthumus-2020', evidence: 'B', toVerify: true, note: 'Méthode source : 6RM ; 1RM probablement estimé, à confirmer.' },
  { ageGroup: 'senior-pro', line: 'arrieres', test: 'squat', protocol: 'back-squat-1rm-abs', unit: 'kg', mean: 178.1, sd: 18.3, sourceId: 'posthumus-2020', evidence: 'B', toVerify: true, note: 'Méthode source : 6RM ; 1RM probablement estimé, à confirmer.' },
  { ageGroup: 'senior-pro', line: 'avants', test: 'developpe-couche', protocol: 'bench-1rm-rel', unit: 'kg/kg', mean: 1.25, sourceId: 'posthumus-2020', evidence: 'B', toVerify: false, note: 'Rapport recalculé par la veille (146/116), sans écart-type.' },
  { ageGroup: 'senior-pro', line: 'arrieres', test: 'developpe-couche', protocol: 'bench-1rm-rel', unit: 'kg/kg', mean: 1.4, sourceId: 'posthumus-2020', evidence: 'B', toVerify: false, note: 'Rapport recalculé par la veille (135/96), sans écart-type.' },
  { ageGroup: 'senior-pro', line: 'avants', test: 'developpe-couche', protocol: 'bench-1rm-abs', unit: 'kg', mean: 146.1, sd: 14.2, sourceId: 'posthumus-2020', evidence: 'B', toVerify: false },
  { ageGroup: 'senior-pro', line: 'arrieres', test: 'developpe-couche', protocol: 'bench-1rm-abs', unit: 'kg', mean: 135.0, sd: 12.8, sourceId: 'posthumus-2020', evidence: 'B', toVerify: false },
  { ageGroup: 'senior-pro', line: 'avants', test: 'sprint-10m', protocol: 'sprint-pro', unit: 's', mean: 1.78, sd: 0.08, sourceId: 'posthumus-2020', evidence: 'B', toVerify: false },
  { ageGroup: 'senior-pro', line: 'arrieres', test: 'sprint-10m', protocol: 'sprint-pro', unit: 's', mean: 1.66, sd: 0.04, sourceId: 'posthumus-2020', evidence: 'B', toVerify: false },
  // Pas de 40 m pro dans la veille (tableau 3.5 : « – »). Pas de Bronco : voir en-tête.
]

interface LevelMapping {
  ageGroup: NormAgeGroup
  estimate: boolean
  justification?: string
}

/** Niveau de l'application -> cohorte publiée. Les niveaux absents n'ont aucun repère. */
export const LEVEL_MAPPING: Partial<Record<PlayLevel, LevelMapping>> = {
  federale: {
    ageGroup: 'u18',
    estimate: true,
    justification: 'Aucune donnée senior amateur dans la veille ; la cohorte U18 d’académie sert de repère bas.',
  },
  nationale: {
    ageGroup: 'u20-21',
    estimate: true,
    justification: 'Aucune donnée senior amateur dans la veille ; la cohorte U20-U21 d’académie est la plus proche du haut de l’amateur.',
  },
  espoirs: { ageGroup: 'u20-21', estimate: false },
  pro: { ageGroup: 'senior-pro', estimate: false },
}

function buildMenNorms(): Norm[] {
  const norms: Norm[] = []
  for (const [level, mapping] of Object.entries(LEVEL_MAPPING) as [PlayLevel, LevelMapping][]) {
    for (const value of COHORT_VALUES) {
      if (value.ageGroup !== mapping.ageGroup) continue
      const lines: Line[] = value.line === 'both' ? ['avants', 'arrieres'] : [value.line]
      for (const line of lines) {
        const notes = [value.note, mapping.estimate ? `Estimation : ${mapping.justification}` : undefined].filter(Boolean)
        norms.push({
          id: `homme-${line}-${level}-${value.test}-${value.protocol}`,
          sex: 'homme',
          line,
          level,
          ageGroup: value.ageGroup,
          test: value.test,
          mean: value.mean,
          ...(value.sd !== undefined ? { sd: value.sd } : {}),
          unit: value.unit,
          protocol: NORM_PROTOCOLS[value.protocol],
          sourceId: value.sourceId,
          evidence: value.evidence,
          toVerify: value.toVerify,
          estimate: mapping.estimate,
          ...(notes.length ? { note: notes.join(' ') } : {}),
        })
      }
    }
  }
  return norms
}

export const MEN_NORMS: readonly Norm[] = buildMenNorms()
