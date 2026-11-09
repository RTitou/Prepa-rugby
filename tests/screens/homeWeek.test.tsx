import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { addMatch, setClubDays } from '../../src/data/repositories/calendarRepo'
import { resetDb, seedProfile } from '../helpers'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  // Mercredi 7 octobre 2026, 10 h : seule l'horloge Date est simulée (les minuteurs restent réels).
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0, 0))
  await resetDb()
  await seedProfile()
  await setClubDays([
    { weekday: 2, intensity: 'lourd', durationMin: 90 },
    { weekday: 4, intensity: 'normal', durationMin: 90 },
  ])
  await addMatch({ date: '2026-10-10', time: null })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('accueil', () => {
  it('génère la semaine courante et affiche la séance du jour avec son étiquette MD', async () => {
    renderAt('/')
    expect(await screen.findByText(/force bas du corps/)).toBeInTheDocument()
    expect(screen.getByText(/Mercredi 7 octobre · MD-3/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Commencer' }).getAttribute('href')).toBe('/seance/s-2026-10-07-bas-force')
    expect(screen.getByText(/au moins 48 h avant le match/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Remplir/ }).getAttribute('href')).toBe('/ressenti')
    expect(screen.getByRole('heading', { name: 'Progression' })).toBeInTheDocument()
  })
})

describe('semaine', () => {
  it('affiche sept jours typés et un accès au calendrier', async () => {
    renderAt('/semaine')
    const list = await screen.findByRole('list')
    const rows = await within(list).findAllByRole('listitem')
    expect(rows).toHaveLength(7)
    expect(rows[0]).toHaveTextContent('Lun.')
    expect(rows[1]).toHaveTextContent('Club (lourd)')
    expect(rows[5]).toHaveTextContent('MATCH')
    expect(rows[5]).toHaveTextContent('Minutes')
    expect(rows[6]).toHaveTextContent('Récupération')
    expect(screen.getByRole('link', { name: 'Modifier mon calendrier' }).getAttribute('href')).toBe('/profil')
  })

  it('navigue entre les semaines : future générée, passée en lecture seule', async () => {
    const user = userEvent.setup()
    renderAt('/semaine')
    await screen.findAllByRole('listitem')
    await user.click(screen.getByRole('button', { name: 'Semaine suivante' }))
    expect(await screen.findByText('Semaine du 12 oct.')).toBeInTheDocument()
    expect(await screen.findAllByRole('listitem')).toHaveLength(7)
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    expect(await screen.findByText('Semaine du 28 sept.')).toBeInTheDocument()
    expect(await screen.findByText('Aucune donnée pour cette semaine.')).toBeInTheDocument()
  })
})
