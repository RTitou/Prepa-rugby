import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { LAST_BACKUP_KEY } from '../../src/data/backup/backupReminder'
import { buildBackup } from '../../src/data/backup/exportData'
import { db } from '../../src/data/db'
import { addMatch } from '../../src/data/repositories/calendarRepo'
import { getMeta, setMeta } from '../../src/data/repositories/metaRepo'
import { resetDb, seedProfile } from '../helpers'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 16, 10, 0, 0))
  await resetDb()
  await seedProfile()
})
afterEach(() => vi.useRealTimers())

describe('Réglages : sauvegarde', () => {
  it('l’export télécharge le fichier et affiche la date de dernière sauvegarde', async () => {
    const user = userEvent.setup({ advanceTimers: () => {} })
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderAt('/profil')
    const section = (await screen.findByRole('heading', { name: 'Sauvegarde' })).closest('section')!
    expect(await within(section).findByText(/Aucune sauvegarde/)).toBeInTheDocument()
    expect(within(section).getByText(/uniquement sur cet appareil/)).toBeInTheDocument()
    await user.click(within(section).getByRole('button', { name: 'Exporter ma sauvegarde' }))
    expect(await within(section).findByText(/prepa-rugby-sauvegarde-2026-10-16\.json/)).toBeInTheDocument()
    expect(click).toHaveBeenCalledOnce()
    expect(await within(section).findByText(/Dernière sauvegarde : 16 octobre 2026/)).toBeInTheDocument()
    click.mockRestore()
  })

  it('l’import demande confirmation puis remplace les données ; un fichier invalide ne change rien', async () => {
    const user = userEvent.setup({ advanceTimers: () => {} })
    await addMatch({ date: '2026-10-20', time: null })
    const backup = await buildBackup()
    // La sauvegarde ne contient pas le match ajouté ensuite : l'import doit le faire disparaître.
    await db.matches.clear()
    await addMatch({ date: '2026-11-01', time: null })
    const text = JSON.stringify(backup)

    renderAt('/profil')
    const input = (await screen.findByLabelText('Importer une sauvegarde')) as HTMLInputElement

    await user.upload(input, new File(['pas du json'], 'x.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/n’a pas été modifiée|n’ont pas été modifiées/)
    expect((await db.matches.toArray()).map((m) => m.date)).toEqual(['2026-11-01'])

    await user.upload(input, new File([text], 'sauvegarde.json', { type: 'application/json' }))
    expect(await screen.findByText('Remplacer toutes les données actuelles ?')).toBeInTheDocument()
    expect((await db.matches.toArray()).map((m) => m.date)).toEqual(['2026-11-01'])

    await user.click(screen.getByRole('button', { name: 'Remplacer' }))
    expect(await screen.findByText(/données ont été restaurées/)).toBeInTheDocument()
    expect((await db.matches.toArray()).map((m) => m.date)).toEqual(['2026-10-20'])
    expect(await getMeta(LAST_BACKUP_KEY)).toBe(backup.exportedAt)
  })
})

describe('accueil : rappel de sauvegarde', () => {
  it('visible après 15 jours, masquable jusqu’au lendemain', async () => {
    const user = userEvent.setup({ advanceTimers: () => {} })
    await setMeta(LAST_BACKUP_KEY, new Date(2026, 9, 1, 12).toISOString())
    await setMeta('firstLaunchOn', '2026-09-01')
    renderAt('/')
    const banner = await screen.findByRole('note', { name: 'Rappel de sauvegarde' })
    await user.click(within(banner).getByRole('button', { name: 'Plus tard' }))
    await waitFor(() => expect(screen.queryByRole('note', { name: 'Rappel de sauvegarde' })).not.toBeInTheDocument())
  })

  it('absent à 3 jours', async () => {
    await setMeta(LAST_BACKUP_KEY, new Date(2026, 9, 13, 12).toISOString())
    await setMeta('firstLaunchOn', '2026-09-01')
    renderAt('/')
    await screen.findByRole('heading', { name: 'Accueil' })
    expect(screen.queryByRole('note', { name: 'Rappel de sauvegarde' })).not.toBeInTheDocument()
  })
})
