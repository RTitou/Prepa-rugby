import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { listMatches } from '../../src/data/repositories/calendarRepo'
import { resetDb, seedProfile } from '../helpers'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const dates = async () => (await listMatches()).map((m) => m.date)

/** Attend que le bouton soit actif (matchs chargés, enregistrement terminé) : un clic sur un bouton désactivé est ignoré. */
async function enabledButton(group: HTMLElement, name: RegExp) {
  return waitFor(() => {
    const b = within(group).getByRole('button', { name })
    expect(b).toBeEnabled()
    return b
  })
}

beforeEach(async () => {
  // Mercredi 7 octobre 2026 : week-end du samedi 10 et du dimanche 11.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0, 0))
  await resetDb()
  await seedProfile()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('match du week-end', () => {
  it('accueil : « Match samedi » ajoute le match du samedi de la semaine, « Match dimanche » le déplace, un second clic le retire', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const group = await screen.findByRole('group', { name: 'Match du week-end' })
    await user.click(await enabledButton(group, /Match samedi/))
    await waitFor(async () => expect(await dates()).toEqual(['2026-10-10']))
    await waitFor(() => expect(within(group).getByRole('button', { name: /Match samedi/ })).toHaveAttribute('aria-pressed', 'true'))
    // La semaine est recalculée autour du match : le mercredi devient MD-3.
    expect((await screen.findAllByText(/MD-3/)).length).toBeGreaterThan(0)

    await user.click(await enabledButton(group, /Match dimanche/))
    await waitFor(async () => expect(await dates()).toEqual(['2026-10-11']))

    await waitFor(() => expect(within(group).getByRole('button', { name: /Match dimanche/ })).toHaveAttribute('aria-pressed', 'true'))
    await user.click(await enabledButton(group, /Match dimanche/))
    await waitFor(async () => expect(await dates()).toEqual([]))
  })

  it('semaine : les boutons suivent la semaine affichée', async () => {
    const user = userEvent.setup()
    renderAt('/semaine')
    await user.click(await screen.findByRole('button', { name: 'Semaine suivante' }))
    const group = await screen.findByRole('group', { name: 'Match du week-end' })
    await user.click(await enabledButton(group, /Match dimanche/))
    await waitFor(async () => expect(await dates()).toEqual(['2026-10-18']))
  })

  it('un jour de week-end passé ne se modifie plus', async () => {
    vi.setSystemTime(new Date(2026, 9, 11, 10, 0, 0))
    renderAt('/')
    const group = await screen.findByRole('group', { name: 'Match du week-end' })
    await waitFor(() => expect(within(group).getByRole('button', { name: /Match samedi/ })).toBeDisabled())
    await waitFor(() => expect(within(group).getByRole('button', { name: /Match dimanche/ })).toBeEnabled())
  })
})
