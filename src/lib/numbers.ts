/** Nombre saisi au clavier français (virgule ou point), null si invalide ou vide. */
export function parseDecimal(raw: string): number | null {
  const text = raw.trim().replace(',', '.')
  if (text === '' || !/^\d+(\.\d+)?$/.test(text)) return null
  return Number(text)
}

/** Durée en secondes : « 1,85 », « 12.4 » ou « 4:45 » (minutes:secondes). */
export function parseDuration(raw: string): number | null {
  const text = raw.trim()
  const m = /^(\d+):([0-5]?\d(?:[.,]\d+)?)$/.exec(text)
  if (m) return Number(m[1]) * 60 + Number(m[2]!.replace(',', '.'))
  return parseDecimal(text)
}

/** Affichage d'un record. */
export function formatRecordValue(value: number, unit: 'kg' | 's' | 'cm', reps: number | null): string {
  if (unit === 'cm') return `${String(value).replace('.', ',')} cm`
  if (unit === 'kg' && reps === null) return `${String(value).replace('.', ',')} kg`
  if (unit === 'kg') return `${String(value).replace('.', ',')} kg × ${reps ?? 1}`
  if (value >= 60) {
    const min = Math.floor(value / 60)
    const sec = (value - min * 60).toFixed(0).padStart(2, '0')
    return `${min}:${sec}`
  }
  return `${String(value).replace('.', ',')} s`
}
