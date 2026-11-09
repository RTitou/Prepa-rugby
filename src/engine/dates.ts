import type { Weekday } from '../types/calendar'

/*
 * Arithmétique de dates calendaires AAAA-MM-JJ, sans fuseau horaire (calculs en UTC sur le jour entier).
 * Aucune dépendance à l'horloge : la date du jour est toujours passée par l'appelant.
 */

const MS_PER_DAY = 86_400_000

function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y!, m! - 1, d!)
}

function fromUtc(ms: number): string {
  const d = new Date(ms)
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${month}-${day}`
}

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * MS_PER_DAY)
}

/** Nombre de jours entre deux dates (b − a). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / MS_PER_DAY)
}

/** Jour ISO : 1 = lundi … 7 = dimanche. */
export function weekdayOf(date: string): Weekday {
  const js = new Date(toUtc(date)).getUTCDay()
  return (js === 0 ? 7 : js) as Weekday
}

/** Lundi de la semaine contenant la date. */
export function mondayOf(date: string): string {
  return addDays(date, 1 - weekdayOf(date))
}

/** Les sept dates lundi → dimanche. */
export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/** Nombre de semaines entières entre deux lundis (b − a). */
export function diffWeeks(mondayA: string, mondayB: string): number {
  return Math.round(diffDays(mondayA, mondayB) / 7)
}

/** Numéro de semaine ISO 8601 (sert à faire tourner les variantes d'exercices de façon déterministe). */
export function isoWeekNumber(date: string): number {
  const thursday = addDays(date, 4 - weekdayOf(date))
  const yearStart = `${thursday.slice(0, 4)}-01-01`
  return Math.floor(diffDays(yearStart, thursday) / 7) + 1
}

/** Heure décimale d'une chaîne HH:MM. */
export function hoursOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h! + m! / 60
}
