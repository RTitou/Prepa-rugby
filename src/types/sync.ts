/** Champs communs à tout enregistrement local (prépare la synchronisation future, dernier écrit gagnant). */
export interface SyncFields {
  /** UUID v4 généré à la création. */
  id: string
  /** Horodatage ISO de la dernière modification. */
  updatedAt: string
  /** null tant que l'enregistrement est actif ; horodatage ISO de la suppression logique sinon. */
  deletedAt: string | null
}

/** Données saisies, sans les champs de synchronisation. */
export type WithoutSync<T extends SyncFields> = Omit<T, keyof SyncFields>
